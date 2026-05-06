import {
  buildTimeline,
  effectiveMonthlyHours,
  expandCapex,
  monthlyEmployerCost,
  type BondIssue,
  type LoanLine,
  type ModelParams,
  type ModelResult,
  type MonthlyComputed,
  type YearlyComputed,
} from "./types";

type FinanceFlows = {
  inflow: number[];
  interestCash: number[];
  principalCash: number[];        // total (loans + bonds) — pour cashflow
  loanPrincipalCash: number[];    // séparé pour bilan
  bondPrincipalCash: number[];    // séparé pour bilan
  capitalized: number[];          // PIK accrual (non-cash)
};

function emptyFlows(H: number): FinanceFlows {
  return {
    inflow: new Array(H).fill(0),
    interestCash: new Array(H).fill(0),
    principalCash: new Array(H).fill(0),
    loanPrincipalCash: new Array(H).fill(0),
    bondPrincipalCash: new Array(H).fill(0),
    capitalized: new Array(H).fill(0),
  };
}

function loanFlows(loan: LoanLine, flows: FinanceFlows, H: number): void {
  if (loan.startMonth < H) flows.inflow[loan.startMonth] += loan.principal;
  const r = loan.annualRatePct / 100 / 12;
  const n = loan.termMonths;
  const mensualite =
    r > 0 ? (loan.principal * r) / (1 - Math.pow(1 + r, -n)) : loan.principal / n;
  let bal = loan.principal;
  for (let i = 0; i < n; i++) {
    const m = loan.startMonth + i + 1;
    if (m >= H) break;
    const interest = bal * r;
    const principal = mensualite - interest;
    bal -= principal;
    flows.interestCash[m] += Math.max(0, interest);
    flows.principalCash[m] += Math.max(0, principal);
    flows.loanPrincipalCash[m] += Math.max(0, principal);
  }
}

function bondFlows(bond: BondIssue, flows: FinanceFlows, H: number): void {
  if (bond.startMonth < H) flows.inflow[bond.startMonth] += bond.principal;

  const totalPeriods = Math.round(bond.termYears * bond.frequency);
  const deferralPeriods = Math.min(
    Math.round(bond.deferralYears * bond.frequency),
    totalPeriods
  );
  const monthsPerPeriod = 12 / bond.frequency;
  const periodRate = bond.annualRatePct / 100 / bond.frequency;
  let balance = bond.principal;

  for (let i = 1; i <= deferralPeriods; i++) {
    const interest = balance * periodRate;
    const m = bond.startMonth + Math.round(i * monthsPerPeriod);
    if (m < H) {
      if (bond.capitalizeInterest) {
        flows.capitalized[m] += interest;
        balance += interest;
      } else {
        flows.interestCash[m] += interest;
      }
    } else if (bond.capitalizeInterest) {
      balance += interest;
    }
  }

  const remainingPeriods = totalPeriods - deferralPeriods;
  const linearPrincipal =
    bond.amortization === "linear" && remainingPeriods > 0 ? balance / remainingPeriods : 0;

  for (let j = 1; j <= remainingPeriods; j++) {
    const interest = balance * periodRate;
    let principalRepaid = 0;
    if (bond.amortization === "bullet") {
      principalRepaid = j === remainingPeriods ? balance : 0;
    } else {
      principalRepaid = j === remainingPeriods ? balance : linearPrincipal;
    }
    balance -= principalRepaid;
    if (Math.abs(balance) < 0.005) balance = 0;
    const m = bond.startMonth + Math.round((deferralPeriods + j) * monthsPerPeriod);
    if (m < H) {
      flows.interestCash[m] += interest;
      flows.principalCash[m] += principalRepaid;
      flows.bondPrincipalCash[m] += principalRepaid;
    }
  }
}

export function computeFinanceFlows(p: ModelParams, H: number): FinanceFlows {
  const flows = emptyFlows(H);
  const fin = p.financing;
  for (const eq of fin.equity ?? []) {
    if (eq.startMonth < H) flows.inflow[eq.startMonth] += eq.amount;
  }
  for (const loan of fin.loans ?? []) {
    loanFlows(loan, flows, H);
  }
  for (const bond of fin.bonds ?? []) {
    bondFlows(bond, flows, H);
  }
  return flows;
}

const FY_LEN = 12;

function avgSubPrice(tiers: { monthlyPrice: number; mixPct: number }[]): number {
  return tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
}

/**
 * NET target trajectory (mode legacy / cohortModel.enabled = false).
 * Interpolation linéaire FY26 + croissance par FY + saisonnalité.
 * Le churn N'EST PLUS appliqué ici (correction du bug de double-comptage).
 * Le paramètre `monthlyChurnPct` reste utilisé par les métriques LTV/CAC.
 */
function monthlySubsCountNetTarget(p: ModelParams, horizonMonths: number): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  const { rampStartCount: a, rampEndCount: b, growthRates } = p.subs;
  const seasonality = p.subs.seasonality && p.subs.seasonality.length === 12 ? p.subs.seasonality : null;

  // FY0 ramp linéaire
  for (let m = 0; m < FY_LEN; m++) {
    out[m] = a + ((b - a) * m) / (FY_LEN - 1);
  }
  let prevEnd = b;
  const horizonYears = Math.floor(horizonMonths / FY_LEN);
  for (let fy = 1; fy < horizonYears; fy++) {
    const growth = growthRates[fy - 1] ?? 0;
    const start = prevEnd;
    const end = prevEnd * (1 + growth);
    for (let i = 0; i < FY_LEN; i++) {
      out[fy * FY_LEN + i] = start + ((end - start) * i) / (FY_LEN - 1);
    }
    prevEnd = end;
  }

  // Apply seasonality only — churn déjà inclus implicitement dans rampEnd / growthRates.
  for (let m = 0; m < horizonMonths; m++) {
    const moy = m % FY_LEN;
    const seasonFactor = seasonality ? seasonality[moy] : 1;
    out[m] = out[m] * seasonFactor;
  }
  return out;
}

/**
 * Niveau 3 — évalue retention(t) pour t = nb mois depuis acquisition.
 * Si `retentionCurve` défini, lookup direct + extrapolation linéaire au-delà.
 * Sinon, formule exponentielle (1 - churn)^t.
 */
export function evalRetention(
  t: number,
  monthlyChurnPct: number,
  curve?: number[]
): number {
  if (!curve || curve.length === 0) return Math.pow(1 - monthlyChurnPct, t);
  if (t < curve.length) return Math.max(0, curve[t]);
  // Extrapolation : pente moyenne des 6 derniers points (ou disponible).
  const last = curve[curve.length - 1];
  const lookback = Math.min(6, curve.length - 1);
  if (lookback <= 0) return Math.max(0, last);
  const slope = (curve[curve.length - 1] - curve[curve.length - 1 - lookback]) / lookback;
  return Math.max(0, last + slope * (t - (curve.length - 1)));
}

/**
 * Cohort model — Niveau 1 basique.
 * count[m] = Σ_{k=0..m} acquisitions[k] × retention(m-k)
 *
 * `acquisitions[m]` dérivé d'une trajectoire d'acquisitions brutes mensuelles :
 * - FY26 ramp linéaire entre acquisitionStart et acquisitionEnd
 * - FY27+ croissance via acquisitionGrowthByFy[]
 * - Saisonnalité appliquée aux acquisitions (pas au stock)
 */
function monthlySubsCountCohort(p: ModelParams, horizonMonths: number): number[] {
  const cm = p.subs.cohortModel;
  if (!cm || !cm.enabled) {
    // Fallback safety — ne devrait pas arriver si appelé via dispatcher
    return monthlySubsCountNetTarget(p, horizonMonths);
  }
  const churn = p.subs.monthlyChurnPct ?? 0;
  const acquisitionSeasonality =
    cm.acquisitionSeasonality && cm.acquisitionSeasonality.length === 12
      ? cm.acquisitionSeasonality
      : (p.subs.seasonality && p.subs.seasonality.length === 12 ? p.subs.seasonality : null);

  // 1. Build acquisitions[m]
  const acq = new Array<number>(horizonMonths).fill(0);
  const a0 = cm.acquisitionStart;
  const a1 = cm.acquisitionEnd;

  // FY26 ramp linéaire des acquisitions mensuelles
  for (let m = 0; m < FY_LEN && m < horizonMonths; m++) {
    acq[m] = a0 + ((a1 - a0) * m) / (FY_LEN - 1);
  }
  let prevEndAcq = a1;
  const horizonYears = Math.floor(horizonMonths / FY_LEN);
  for (let fy = 1; fy < horizonYears; fy++) {
    const growth = cm.acquisitionGrowthByFy[fy - 1] ?? 0;
    const start = prevEndAcq;
    const end = prevEndAcq * (1 + growth);
    for (let i = 0; i < FY_LEN; i++) {
      acq[fy * FY_LEN + i] = start + ((end - start) * i) / (FY_LEN - 1);
    }
    prevEndAcq = end;
  }

  // Saisonnalité acquisitions (pas appliquée au stock)
  for (let m = 0; m < horizonMonths; m++) {
    const moy = m % FY_LEN;
    const seasonFactor = acquisitionSeasonality ? acquisitionSeasonality[moy] : 1;
    acq[m] = acq[m] * seasonFactor;
  }

  // 2. Build count[m] via cohort sum (utilise retention curve si défini, sinon exponentielle)
  const curve = cm.retentionCurve;
  const out = new Array<number>(horizonMonths).fill(0);
  for (let m = 0; m < horizonMonths; m++) {
    let total = 0;
    for (let k = 0; k <= m; k++) {
      total += acq[k] * evalRetention(m - k, churn, curve);
    }
    out[m] = total;
  }
  return out;
}

function monthlySubsCount(p: ModelParams, horizonMonths: number): number[] {
  const useCohort = p.subs.cohortModel?.enabled === true;
  return useCohort
    ? monthlySubsCountCohort(p, horizonMonths)
    : monthlySubsCountNetTarget(p, horizonMonths);
}

/**
 * Acquisitions mensuelles brutes (utiles pour CAC, marketing, /revenue breakdown).
 * - Mode cohort : retourne directement acquisitions[m] calculées.
 * - Mode legacy NET : approx = max(0, count[m] - count[m-1]) + count[m-1] × churn (acquisitions
 *   nécessaires pour maintenir le NET malgré le churn).
 */
export function monthlyAcquisitions(p: ModelParams, horizonMonths: number): number[] {
  const churn = p.subs.monthlyChurnPct ?? 0;
  const useCohort = p.subs.cohortModel?.enabled === true;
  if (useCohort && p.subs.cohortModel) {
    const cm = p.subs.cohortModel;
    const acquisitionSeasonality =
      cm.acquisitionSeasonality && cm.acquisitionSeasonality.length === 12
        ? cm.acquisitionSeasonality
        : (p.subs.seasonality && p.subs.seasonality.length === 12 ? p.subs.seasonality : null);
    const acq = new Array<number>(horizonMonths).fill(0);
    const a0 = cm.acquisitionStart;
    const a1 = cm.acquisitionEnd;
    for (let m = 0; m < FY_LEN && m < horizonMonths; m++) {
      acq[m] = a0 + ((a1 - a0) * m) / (FY_LEN - 1);
    }
    let prevEndAcq = a1;
    const horizonYears = Math.floor(horizonMonths / FY_LEN);
    for (let fy = 1; fy < horizonYears; fy++) {
      const growth = cm.acquisitionGrowthByFy[fy - 1] ?? 0;
      const start = prevEndAcq;
      const end = prevEndAcq * (1 + growth);
      for (let i = 0; i < FY_LEN; i++) {
        acq[fy * FY_LEN + i] = start + ((end - start) * i) / (FY_LEN - 1);
      }
      prevEndAcq = end;
    }
    for (let m = 0; m < horizonMonths; m++) {
      const moy = m % FY_LEN;
      const seasonFactor = acquisitionSeasonality ? acquisitionSeasonality[moy] : 1;
      acq[m] = acq[m] * seasonFactor;
    }
    return acq;
  }

  // Mode NET : déduire acquisitions implicites pour reconstituer le funnel
  const counts = monthlySubsCountNetTarget(p, horizonMonths);
  const acq = new Array<number>(horizonMonths).fill(0);
  for (let m = 0; m < horizonMonths; m++) {
    const prev = m === 0 ? 0 : counts[m - 1];
    const churned = prev * churn;
    acq[m] = Math.max(0, counts[m] - prev + churned);
  }
  return acq;
}

/**
 * Solver inverse (UX helper) : étant donné une cible NET et un churn, calcule l'acquisition
 * mensuelle de steady-state nécessaire (Little's law : NET × churn).
 */
export function solveAcquisitionsFromNetTarget(netTarget: number, monthlyChurnPct: number): number {
  if (monthlyChurnPct <= 0) return 0; // pas de churn = pas besoin de remplacer
  return netTarget * monthlyChurnPct;
}

/**
 * Niveau 2 — Décomposition du count[m] global par tier.
 * Si aucun tier ne définit son propre churn, les counts par tier sont simplement
 * count[m] × tier.mixPct (mix statique).
 *
 * Si au moins un tier a un churn override, chaque tier suit son propre cohort :
 *   tierCount[i][m] = Σ_{k=0..m} acquisitions[k] × acqMix[i] × (1 - tierChurn[i])^(m-k)
 *
 * Retourne { perTier: number[][] } où perTier[i] = série mensuelle pour tier i.
 */
export function monthlySubsCountByTier(
  p: ModelParams,
  horizonMonths: number
): { perTier: number[][]; total: number[] } {
  const tiers = p.subs.tiers;
  const total = monthlySubsCount(p, horizonMonths);
  const hasTierChurn = tiers.some((t) => t.monthlyChurnPct !== undefined);
  const useCohort = p.subs.cohortModel?.enabled === true;

  // Cas simple : pas de churn par tier → mix statique.
  if (!hasTierChurn) {
    const perTier = tiers.map((t) => total.map((c) => c * t.mixPct));
    return { perTier, total };
  }

  // Cas tier-level — recalcul par tier.
  const acq = monthlyAcquisitions(p, horizonMonths);
  const fallbackChurn = p.subs.monthlyChurnPct ?? 0;

  const perTier = tiers.map((tier) => {
    const tierChurn = tier.monthlyChurnPct ?? fallbackChurn;
    const acqMix = tier.acquisitionMixPct ?? tier.mixPct;
    const counts = new Array<number>(horizonMonths).fill(0);
    if (useCohort) {
      for (let m = 0; m < horizonMonths; m++) {
        let sum = 0;
        for (let k = 0; k <= m; k++) {
          sum += acq[k] * acqMix * Math.pow(1 - tierChurn, m - k);
        }
        counts[m] = sum;
      }
    } else {
      // Mode NET : on garde mix proportionnel mais on annote le fait que le tier
      // suit sa propre dynamique (utile pour LTV — on ne ré-écrit pas le NET total).
      for (let m = 0; m < horizonMonths; m++) {
        counts[m] = total[m] * tier.mixPct;
      }
    }
    return counts;
  });

  // Si cohort actif et tiers ont des churns différents, le total recalculé peut diverger
  // du `total` de top-level (qui utilise un churn unique). On préfère retourner les
  // tiers exacts et un total = somme tiers.
  if (useCohort && hasTierChurn) {
    const newTotal = new Array<number>(horizonMonths).fill(0);
    for (let m = 0; m < horizonMonths; m++) {
      for (let i = 0; i < perTier.length; i++) newTotal[m] += perTier[i][m];
    }
    return { perTier, total: newTotal };
  }

  return { perTier, total };
}

/** Helper export pour modules consommateurs (UI, métriques). */
export function effectiveTierChurn(tier: { monthlyChurnPct?: number }, fallback: number): number {
  return tier.monthlyChurnPct ?? fallback;
}

function monthlySubsRevenue(p: ModelParams, counts: number[]): number[] {
  const basePriceTTC = avgSubPrice(p.subs.tiers);
  const vatDivisor = 1 + (p.subs.vatRate ?? 0);
  const basePriceHT = basePriceTTC / vatDivisor;
  return counts.map((c, m) => {
    const fy = Math.floor(m / FY_LEN);
    const priceFactor = Math.pow(1 + p.subs.priceIndexPa, fy);
    return c * basePriceHT * priceFactor;
  });
}

/**
 * Niveau 2 — revenu mensuel calculé par tier (utilisé quand cohort + tier churn actifs).
 * Préserve l'indexation tarifaire annuelle.
 */
function monthlySubsRevenueByTier(p: ModelParams, perTier: number[][]): number[] {
  const vatDivisor = 1 + (p.subs.vatRate ?? 0);
  const horizonMonths = perTier[0]?.length ?? 0;
  const out = new Array<number>(horizonMonths).fill(0);
  for (let m = 0; m < horizonMonths; m++) {
    const fy = Math.floor(m / FY_LEN);
    const priceFactor = Math.pow(1 + p.subs.priceIndexPa, fy);
    for (let i = 0; i < p.subs.tiers.length; i++) {
      const priceHT = p.subs.tiers[i].monthlyPrice / vatDivisor;
      out[m] += perTier[i][m] * priceHT * priceFactor;
    }
  }
  return out;
}

/**
 * Niveau 4 — calcul legacy multi-cohortes.
 * Si `p.legacy.cohorts` défini et non vide, chaque cohorte décroît
 * exponentiellement à son propre `monthlyChurnPct`. Migration legacy → CFRG
 * appliquée comme sortie supplémentaire (non comptée comme churn) si
 * `monthlyMigrationPct > 0`.
 *
 * Migrants par mois sont retournés via `migrants[]` pour pouvoir les injecter
 * comme acquisitions new dans le funnel CFRG.
 *
 * Si pas de cohorts définies, fallback comportement legacy (linéaire absolu).
 */
function monthlyLegacy(p: ModelParams, horizonMonths: number) {
  const count = new Array<number>(horizonMonths).fill(0);
  const revenue = new Array<number>(horizonMonths).fill(0);
  const migrants = new Array<number>(horizonMonths).fill(0);

  const cohorts = p.legacy.cohorts;
  const migrationPct = p.legacy.monthlyMigrationPct ?? 0;
  const useCohorts = Array.isArray(cohorts) && cohorts.length > 0;

  if (useCohorts) {
    // Stock par cohorte : on décrémente churn + migration mois par mois.
    const stocks = cohorts.map((c) => c.startCount);
    for (let m = 0; m < horizonMonths; m++) {
      let totalCount = 0;
      let totalRevenue = 0;
      let totalMigrants = 0;
      for (let i = 0; i < cohorts.length; i++) {
        totalCount += stocks[i];
        totalRevenue += stocks[i] * cohorts[i].avgMonthlyPrice;
        // Décrément pour mois suivant : churn + migration
        const churned = stocks[i] * cohorts[i].monthlyChurnPct;
        const migrated = stocks[i] * migrationPct;
        totalMigrants += migrated;
        stocks[i] = Math.max(0, stocks[i] - churned - migrated);
      }
      count[m] = totalCount;
      revenue[m] = totalRevenue;
      migrants[m] = totalMigrants;
    }
  } else {
    // Mode legacy original : décroissance linéaire absolue.
    const monthlyChurn = p.legacy.yearlyChurnAbs / FY_LEN;
    for (let m = 0; m < horizonMonths; m++) {
      const c = Math.max(0, p.legacy.startCount - monthlyChurn * m);
      count[m] = c;
      revenue[m] = c * p.legacy.avgMonthlyPrice;
      // Migration applicable même en mode flat
      if (migrationPct > 0) migrants[m] = c * migrationPct;
    }
  }
  return { count, revenue, migrants };
}

function monthlyPrestations(p: ModelParams, horizonMonths: number): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  for (let m = 0; m < horizonMonths; m++) {
    const fy = Math.floor(m / FY_LEN);
    const teen = p.prestations.teen.startCount * Math.pow(1 + p.prestations.teen.growthPa, fy) * p.prestations.teen.price;
    const senior = p.prestations.senior.startCount * Math.pow(1 + p.prestations.senior.growthPa, fy) * p.prestations.senior.price;
    const horsAbo = p.prestations.horsAbo.monthlyAvg * Math.pow(1 + p.prestations.horsAbo.growthPa, fy);
    out[m] = teen + senior + horsAbo;
  }
  return out;
}

function monthlyMerch(p: ModelParams, horizonMonths: number): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  for (let m = 0; m < horizonMonths; m++) {
    const fy = Math.floor(m / FY_LEN);
    out[m] = p.merch.monthlyMargin * Math.pow(1 + p.merch.growthPa, fy);
  }
  return out;
}

function monthlySalaries(p: ModelParams, horizonMonths: number): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  const pools = p.salaries.freelancePools ?? [];
  const profiles = p.salaries.chargesProfiles;
  for (let m = 0; m < horizonMonths; m++) {
    const fy = Math.floor(m / FY_LEN);
    const idx = Math.pow(1 + p.salaries.annualIndexPa, Math.max(0, fy - 1));
    let total = 0;
    for (const item of p.salaries.items) {
      if (m < item.startMonth) continue;
      if (item.endMonth !== undefined && m > item.endMonth) continue;
      total += monthlyEmployerCost(item, profiles, p.salaries.chargesPatroPct, idx, fy);
    }
    for (const pool of pools) {
      if (pool.startMonth !== undefined && m < pool.startMonth) continue;
      total += pool.hourlyRate * effectiveMonthlyHours(pool) * idx;
    }
    out[m] = total;
  }
  return out;
}

function monthlyRent(p: ModelParams, horizonMonths: number): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  const franchise = Math.max(0, Math.floor(p.rent.franchiseMonths ?? 0));
  for (let m = 0; m < horizonMonths; m++) {
    const fy = Math.floor(m / FY_LEN);
    const moy = m % FY_LEN;
    const base = p.rent.monthlyByFy[fy] ?? p.rent.monthlyByFy[p.rent.monthlyByFy.length - 1];
    // Franchise: loyer offert sur les N premiers mois (charges copro + taxes maintenues)
    const rentBase = m < franchise ? 0 : base;
    let total = rentBase + p.rent.monthlyCoopro;
    if (moy === 11) total += p.rent.yearlyTaxes;
    out[m] = total;
  }
  return out;
}

function monthlyRecurring(p: ModelParams, horizonMonths: number, category: "entretien" | "frais_op"): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  const items = p.recurring.filter((r) => r.category === category);
  for (let m = 0; m < horizonMonths; m++) {
    out[m] = items.reduce((s, it) => s + it.monthly, 0);
  }
  return out;
}

function monthlyOneOff(p: ModelParams, horizonMonths: number): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  for (let m = 0; m < horizonMonths; m++) {
    const moy = m % FY_LEN;
    let total = 0;
    for (const it of p.oneOffs) {
      if (it.yearly && it.month === moy) total += it.amount;
      else if (!it.yearly && m === it.month) total += it.amount;
    }
    out[m] = total;
  }
  return out;
}

function monthlyMarketing(p: ModelParams, revenue: number[]): number[] {
  const out = new Array<number>(revenue.length).fill(0);
  for (let m = 0; m < revenue.length; m++) {
    const fy = Math.floor(m / FY_LEN);
    const idx = Math.pow(1 + p.marketing.indexPa, fy);
    out[m] = p.marketing.monthlyBudget * idx + revenue[m] * p.marketing.pctOfRevenue;
  }
  return out;
}

function monthlyProvisions(p: ModelParams, horizonMonths: number): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  for (let m = 0; m < horizonMonths; m++) {
    const fy = Math.floor(m / FY_LEN);
    const idx = Math.pow(1 + p.provisions.indexPa, fy);
    out[m] = (p.provisions.monthlyEquipement + p.provisions.monthlyTravaux) * idx;
  }
  return out;
}

export function computeModel(p: ModelParams): ModelResult {
  const tl = buildTimeline(
    p.timeline?.startYear ?? 2026,
    p.timeline?.horizonYears ?? 7
  );
  const H = tl.horizonMonths;

  // Niveau 4 — legacy calculée en premier pour récupérer migrants → acquisitions new
  const legacy = monthlyLegacy(p, H);
  const hasMigrants = legacy.migrants.some((v) => v > 0);

  // Niveau 2 — si tier-level churn actif ET cohort actif, on calcule en per-tier
  // (compte total + revenu pondéré par prix de chaque tier).
  const useCohort = p.subs.cohortModel?.enabled === true;
  const hasTierChurn = p.subs.tiers.some((t) => t.monthlyChurnPct !== undefined);
  let subsCount: number[];
  let subsRevenue: number[];
  if (useCohort && hasMigrants) {
    // Inject migrants comme acquisitions supplémentaires dans le cohort sum
    const baseAcq = monthlyAcquisitions(p, H);
    const totalAcq = baseAcq.map((v, i) => v + legacy.migrants[i]);
    const churn = p.subs.monthlyChurnPct ?? 0;
    const curve = p.subs.cohortModel?.retentionCurve;
    subsCount = new Array<number>(H).fill(0);
    for (let m = 0; m < H; m++) {
      let total = 0;
      for (let k = 0; k <= m; k++) {
        total += totalAcq[k] * evalRetention(m - k, churn, curve);
      }
      subsCount[m] = total;
    }
    subsRevenue = monthlySubsRevenue(p, subsCount);
  } else if (useCohort && hasTierChurn) {
    const byTier = monthlySubsCountByTier(p, H);
    subsCount = byTier.total;
    subsRevenue = monthlySubsRevenueByTier(p, byTier.perTier);
  } else {
    subsCount = monthlySubsCount(p, H);
    subsRevenue = monthlySubsRevenue(p, subsCount);
  }
  const prest = monthlyPrestations(p, H);
  const merch = monthlyMerch(p, H);

  const totalRevenue = subsRevenue.map((v, i) => v + legacy.revenue[i] + prest[i] + merch[i]);

  const sal = monthlySalaries(p, H);
  const rent = monthlyRent(p, H);
  const recEntretien = monthlyRecurring(p, H, "entretien");
  const recFraisOp = monthlyRecurring(p, H, "frais_op");
  const oneOff = monthlyOneOff(p, H);
  const mkt = monthlyMarketing(p, totalRevenue);
  const prov = monthlyProvisions(p, H);

  const totalOpex = totalRevenue.map((_, i) =>
    sal[i] + rent[i] + recEntretien[i] + recFraisOp[i] + mkt[i] + prov[i] + oneOff[i]
  );

  const capexItems = expandCapex(p);
  const totalCapex = capexItems.reduce((s, it) => s + it.amount, 0);
  const monthlyDA = p.tax.enableDA
    ? capexItems.reduce(
        (s, it) => s + (it.amortYears > 0 ? it.amount / Math.max(1, it.amortYears * 12) : 0),
        0
      )
    : 0;

  const finFlows = computeFinanceFlows(p, H);

  // ----- Pre-compute mensuels jusqu'à PBT (sans tax) pour ensuite calculer la tax annuelle avec carry-forward
  const monthlyEbitda = new Array<number>(H).fill(0);
  const monthlyEbit = new Array<number>(H).fill(0);
  const monthlyInterest = new Array<number>(H).fill(0);
  const monthlyPbt = new Array<number>(H).fill(0);
  for (let m = 0; m < H; m++) {
    monthlyEbitda[m] = totalRevenue[m] - totalOpex[m];
    monthlyEbit[m] = monthlyEbitda[m] - monthlyDA;
    monthlyInterest[m] = finFlows.interestCash[m] + finFlows.capitalized[m];
    monthlyPbt[m] = monthlyEbit[m] - monthlyInterest[m];
  }

  // ----- Yearly tax + loss carry-forward (#4)
  const lossCarryEnabled = p.tax.enableLossCarryForward !== false;
  const yearlyTax = new Array<number>(tl.horizonYears).fill(0);
  const yearlyLossUsed = new Array<number>(tl.horizonYears).fill(0);
  const yearlyLossBalanceEnd = new Array<number>(tl.horizonYears).fill(0);
  const yearlyTaxableAfterCarry = new Array<number>(tl.horizonYears).fill(0);
  let lossBalance = 0;
  for (let fy = 0; fy < tl.horizonYears; fy++) {
    let yearPbt = 0;
    for (let m = fy * FY_LEN; m < (fy + 1) * FY_LEN && m < H; m++) yearPbt += monthlyPbt[m];
    if (yearPbt >= 0) {
      const used = lossCarryEnabled ? Math.min(lossBalance, yearPbt) : 0;
      const taxable = yearPbt - used;
      yearlyTaxableAfterCarry[fy] = taxable;
      yearlyTax[fy] = p.tax.enableIs ? taxable * p.tax.isRate : 0;
      yearlyLossUsed[fy] = used;
      lossBalance -= used;
    } else {
      yearlyTaxableAfterCarry[fy] = 0;
      yearlyTax[fy] = 0;
      yearlyLossUsed[fy] = 0;
      if (lossCarryEnabled) lossBalance += -yearPbt;
    }
    yearlyLossBalanceEnd[fy] = lossBalance;
  }

  // ----- Distribution mensuelle de la tax (#6 IS trimestriel)
  // Comptable (P&L): tax_monthly = yearlyTax / 12 (lissé)
  // Cash: monthly = yearlyTax/12, ou trimestriel = yearlyTax/4 aux mois (FY) 2,5,8,11
  const QUARTERLY_PAY_MONTHS = new Set([2, 5, 8, 11]);
  const isQuarterly = p.tax.isPaymentSchedule === "quarterly";
  const monthlyTaxPnL = new Array<number>(H).fill(0);
  const monthlyTaxCash = new Array<number>(H).fill(0);
  for (let fy = 0; fy < tl.horizonYears; fy++) {
    const yt = yearlyTax[fy];
    for (let m = fy * FY_LEN; m < (fy + 1) * FY_LEN && m < H; m++) {
      monthlyTaxPnL[m] = yt / 12;
      const moy = m % FY_LEN;
      if (isQuarterly) {
        monthlyTaxCash[m] = QUARTERLY_PAY_MONTHS.has(moy) ? yt / 4 : 0;
      } else {
        monthlyTaxCash[m] = yt / 12;
      }
    }
  }

  // ----- TVA mensuelle (#5)
  const vatEnabled = p.tax.enableVat === true;
  const vatRate = p.tax.vatRate ?? p.subs.vatRate ?? 0.2;
  const vatDeductPct = p.tax.vatDeductibleOpexPct ?? 0.5;
  const monthlyVatCollected = new Array<number>(H).fill(0);
  const monthlyVatDeductible = new Array<number>(H).fill(0);
  const monthlyVatNetPayable = new Array<number>(H).fill(0); // accumulation flux (collected-deductible)
  const monthlyVatCashOut = new Array<number>(H).fill(0);
  if (vatEnabled) {
    for (let m = 0; m < H; m++) {
      // Revenue est traité comme TTC: TVA collectée = revenue * rate / (1+rate)
      monthlyVatCollected[m] = (totalRevenue[m] * vatRate) / (1 + vatRate);
      // OPEX et CAPEX traités HT: TVA déductible = base * rate * pourcentage assujetti
      const opexBase = (totalOpex[m] - sal[m]) * vatDeductPct + (m === 0 ? totalCapex : 0);
      monthlyVatDeductible[m] = opexBase * vatRate;
      monthlyVatNetPayable[m] = monthlyVatCollected[m] - monthlyVatDeductible[m];
    }
    // Paiement trimestriel: cumul du trimestre payé en mois 2,5,8,11 (FY)
    let qAcc = 0;
    for (let m = 0; m < H; m++) {
      qAcc += monthlyVatNetPayable[m];
      const moy = m % FY_LEN;
      if (QUARTERLY_PAY_MONTHS.has(moy)) {
        monthlyVatCashOut[m] = qAcc;
        qAcc = 0;
      }
    }
    // Solde non payé en fin d'horizon: payé au dernier mois pour rester équilibré
    if (qAcc !== 0 && H > 0) monthlyVatCashOut[H - 1] += qAcc;
  }

  // ----- BFR détaillé (#8)
  const bfrCustomDays =
    p.bfr.daysReceivables !== undefined ||
    p.bfr.daysSupplierPayables !== undefined ||
    p.bfr.daysStock !== undefined;
  const bfrDaysNet = bfrCustomDays
    ? Math.max(
        0,
        (p.bfr.daysReceivables ?? 0) - (p.bfr.daysSupplierPayables ?? 0) + (p.bfr.daysStock ?? 0)
      )
    : p.bfr.daysOfRevenue;

  const monthly: MonthlyComputed[] = [];
  let cash = p.openingCash;
  let prevBfr = 0;
  let cashTroughMonth: number | null = null;
  let cashTroughValue = Number.POSITIVE_INFINITY;
  let breakEvenMonth: number | null = null;
  let cumulativeEbitda = 0;
  let lossBalanceCum = 0; // pour exposition mensuelle

  for (let m = 0; m < H; m++) {
    const ebitda = monthlyEbitda[m];
    cumulativeEbitda += ebitda;
    const da = monthlyDA;
    const ebit = monthlyEbit[m];
    const interestExpense = monthlyInterest[m];
    const pbt = monthlyPbt[m];

    const fy = Math.floor(m / FY_LEN);
    const tax = monthlyTaxPnL[m];
    const taxCash = monthlyTaxCash[m];
    const netIncome = pbt - tax;

    // Suivi mensuel du solde déficits (proxy: utilise PBT mensuel)
    let lossUsedThisMonth = 0;
    if (lossCarryEnabled) {
      if (pbt < 0) {
        lossBalanceCum += -pbt;
      } else if (pbt > 0 && lossBalanceCum > 0) {
        lossUsedThisMonth = Math.min(lossBalanceCum, pbt);
        lossBalanceCum -= lossUsedThisMonth;
      }
    }

    const capexThis = m === 0 ? totalCapex : 0;
    const bfrTarget = totalRevenue[m] * (bfrDaysNet / 30);
    const bfrChange = bfrTarget - prevBfr;
    prevBfr = bfrTarget;

    const cfo = ebitda - taxCash - bfrChange - monthlyVatCashOut[m];
    const cfi = -capexThis;
    const fundraise = finFlows.inflow[m];
    const loanRepay = finFlows.loanPrincipalCash[m];
    const bondPrincipal = finFlows.bondPrincipalCash[m];
    const totalPrincipalCash = loanRepay + bondPrincipal;
    const cff = fundraise - totalPrincipalCash - finFlows.interestCash[m];

    const netCashFlow = cfo + cfi + cff;
    cash += netCashFlow;

    if (cash < cashTroughValue) {
      cashTroughValue = cash;
      cashTroughMonth = m;
    }
    if (breakEvenMonth === null && cumulativeEbitda > 0) breakEvenMonth = m;

    monthly.push({
      month: m,
      label: tl.monthLabels[m],
      fy,
      subsCount: subsCount[m],
      subsRevenue: subsRevenue[m],
      legacyCount: legacy.count[m],
      legacyRevenue: legacy.revenue[m],
      prestationsRevenue: prest[m],
      merchRevenue: merch[m],
      totalRevenue: totalRevenue[m],
      salaries: sal[m],
      rent: rent[m],
      recurringEntretien: recEntretien[m],
      recurringFraisOp: recFraisOp[m],
      marketing: mkt[m],
      provisions: prov[m],
      oneOff: oneOff[m],
      totalOpex: totalOpex[m],
      ebitda,
      da,
      ebit,
      interestExpense,
      pbt,
      tax,
      taxCash,
      lossCarryForwardBalance: lossBalanceCum,
      lossUsedThisMonth,
      vatCollected: monthlyVatCollected[m],
      vatDeductible: monthlyVatDeductible[m],
      vatNetPayable: monthlyVatNetPayable[m],
      vatCashOut: monthlyVatCashOut[m],
      netIncome,
      capex: capexThis,
      bfrChange,
      loanPrincipalRepay: loanRepay,
      bondPrincipalRepay: bondPrincipal,
      capitalizedInterest: finFlows.capitalized[m],
      fundraise,
      cfo,
      cfi,
      cff,
      netCashFlow,
      cashBalance: cash,
    });
  }

  const yearly: YearlyComputed[] = [];
  for (let fy = 0; fy < tl.horizonYears; fy++) {
    const slice = monthly.slice(fy * FY_LEN, (fy + 1) * FY_LEN);
    const sum = (k: keyof MonthlyComputed) => slice.reduce((s, x) => s + (x[k] as number), 0);
    const tr = sum("totalRevenue");
    const prevTr = fy === 0 ? 0 : yearly[fy - 1].totalRevenue;
    yearly.push({
      fy,
      label: tl.fyLabels[fy],
      totalRevenue: tr,
      subsRevenue: sum("subsRevenue"),
      legacyRevenue: sum("legacyRevenue"),
      prestationsRevenue: sum("prestationsRevenue"),
      merchRevenue: sum("merchRevenue"),
      totalOpex: sum("totalOpex"),
      salaries: sum("salaries"),
      rent: sum("rent"),
      recurring: sum("recurringEntretien") + sum("recurringFraisOp"),
      marketing: sum("marketing"),
      provisions: sum("provisions"),
      oneOff: sum("oneOff"),
      ebitda: sum("ebitda"),
      ebitdaMargin: tr > 0 ? sum("ebitda") / tr : 0,
      da: sum("da"),
      ebit: sum("ebit"),
      interestExpense: sum("interestExpense"),
      pbt: sum("pbt"),
      tax: yearlyTax[fy],
      taxCash: sum("taxCash"),
      lossCarryForwardBalanceEnd: yearlyLossBalanceEnd[fy],
      lossUsedThisYear: yearlyLossUsed[fy],
      taxableIncomeAfterCarryForward: yearlyTaxableAfterCarry[fy],
      vatCollected: sum("vatCollected"),
      vatDeductible: sum("vatDeductible"),
      vatNetPayable: sum("vatNetPayable"),
      netIncome: sum("netIncome"),
      capex: sum("capex"),
      cfo: sum("cfo"),
      cfi: sum("cfi"),
      cff: sum("cff"),
      netCashFlow: sum("netCashFlow"),
      cashEnd: slice[slice.length - 1].cashBalance,
      growthPct: prevTr > 0 ? (tr - prevTr) / prevTr : 0,
    });
  }

  const fcfTotal = monthly.reduce((s, m) => s + m.cfo + m.cfi, 0);

  return {
    monthly,
    yearly,
    breakEvenMonth,
    cashTroughMonth,
    cashTroughValue: cashTroughValue === Number.POSITIVE_INFINITY ? 0 : cashTroughValue,
    irr5y: null,
    fcfTotal,
    startYear: tl.startYear,
    horizonYears: tl.horizonYears,
    horizonMonths: tl.horizonMonths,
    fyLabels: tl.fyLabels,
    monthLabels: tl.monthLabels,
  };
}
