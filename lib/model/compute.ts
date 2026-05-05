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
  principalCash: number[];
  capitalized: number[]; // PIK accrual (non-cash)
};

function emptyFlows(H: number): FinanceFlows {
  return {
    inflow: new Array(H).fill(0),
    interestCash: new Array(H).fill(0),
    principalCash: new Array(H).fill(0),
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

function monthlySubsCount(p: ModelParams, horizonMonths: number): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  const { rampStartCount: a, rampEndCount: b, growthRates } = p.subs;
  const seasonality = p.subs.seasonality && p.subs.seasonality.length === 12 ? p.subs.seasonality : null;
  const churn = p.subs.monthlyChurnPct ?? 0;

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

  // Apply seasonality + churn cumulative
  for (let m = 0; m < horizonMonths; m++) {
    const moy = m % FY_LEN;
    const seasonFactor = seasonality ? seasonality[moy] : 1;
    const churnFactor = Math.pow(1 - churn, m);
    out[m] = out[m] * seasonFactor * churnFactor;
  }
  return out;
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

function monthlyLegacy(p: ModelParams, horizonMonths: number) {
  const count = new Array<number>(horizonMonths).fill(0);
  const revenue = new Array<number>(horizonMonths).fill(0);
  const monthlyChurn = p.legacy.yearlyChurnAbs / FY_LEN;
  for (let m = 0; m < horizonMonths; m++) {
    const c = Math.max(0, p.legacy.startCount - monthlyChurn * m);
    count[m] = c;
    revenue[m] = c * p.legacy.avgMonthlyPrice;
  }
  return { count, revenue };
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
  for (let m = 0; m < horizonMonths; m++) {
    const fy = Math.floor(m / FY_LEN);
    const moy = m % FY_LEN;
    const base = p.rent.monthlyByFy[fy] ?? p.rent.monthlyByFy[p.rent.monthlyByFy.length - 1];
    let total = base + p.rent.monthlyCoopro;
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

  const subsCount = monthlySubsCount(p, H);
  const subsRevenue = monthlySubsRevenue(p, subsCount);
  const legacy = monthlyLegacy(p, H);
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
    const loanRepay = finFlows.principalCash[m];
    const bondPrincipal = 0; // déjà inclus dans loanRepay (principalCash agrège loans + bonds)
    const cff = fundraise - loanRepay - finFlows.interestCash[m];

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
