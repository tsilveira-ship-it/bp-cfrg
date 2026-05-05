import {
  buildTimeline,
  effectiveMonthlyHours,
  type ModelParams,
  type ModelResult,
  type MonthlyComputed,
  type YearlyComputed,
} from "./types";

const FY_LEN = 12;

function avgSubPrice(tiers: { monthlyPrice: number; mixPct: number }[]): number {
  return tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
}

function monthlySubsCount(p: ModelParams, horizonMonths: number): number[] {
  const out = new Array<number>(horizonMonths).fill(0);
  const { rampStartCount: a, rampEndCount: b, growthRates } = p.subs;

  // FY0 (premier exercice) = ramp linéaire
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
  for (let m = 0; m < horizonMonths; m++) {
    const fy = Math.floor(m / FY_LEN);
    const idx = Math.pow(1 + p.salaries.annualIndexPa, Math.max(0, fy - 1));
    let total = 0;
    for (const item of p.salaries.items) {
      if (m < item.startMonth) continue;
      let base = item.monthlyGross;
      if (fy >= 1 && item.fy26Bump !== undefined) base = item.fy26Bump;
      total += base * idx * item.fte * (1 + p.salaries.chargesPatroPct);
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

  const totalCapex = p.capex.equipment + p.capex.travaux + p.capex.juridique + p.capex.depots;
  const monthlyDA = p.tax.enableDA ? totalCapex / (p.tax.daYears * 12) : 0;

  const monthly: MonthlyComputed[] = [];
  let cash = p.openingCash;
  let prevBfr = 0;
  let cashTroughMonth: number | null = null;
  let cashTroughValue = Number.POSITIVE_INFINITY;
  let breakEvenMonth: number | null = null;
  let cumulativeEbitda = 0;

  for (let m = 0; m < H; m++) {
    const ebitda = totalRevenue[m] - totalOpex[m];
    cumulativeEbitda += ebitda;

    const da = monthlyDA;
    const ebit = ebitda - da;
    const interestExpense = m < p.financing.bondDurationMonths ? p.financing.bondMonthly : 0;
    const pbt = ebit - interestExpense;
    const tax = p.tax.enableIs && pbt > 0 ? pbt * p.tax.isRate : 0;
    const netIncome = pbt - tax;

    const capexThis = m === 0 ? totalCapex : 0;
    const bfrTarget = totalRevenue[m] * (p.bfr.daysOfRevenue / 30);
    const bfrChange = bfrTarget - prevBfr;
    prevBfr = bfrTarget;

    const cfo = ebitda - tax - bfrChange;
    const cfi = -capexThis;
    const fundraise = m === 0 ? p.financing.fundraise : 0;
    const loanRepay = m < p.financing.loanDurationMonths ? p.financing.loanMonthly : 0;
    const bondPrincipal = m < p.financing.bondDurationMonths ? p.financing.bondCapitalRepayMonthly : 0;
    const cff = fundraise - loanRepay - bondPrincipal - interestExpense;

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
      fy: Math.floor(m / FY_LEN),
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
      tax: sum("tax"),
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
