import {
  HORIZON_MONTHS,
  MONTH_LABELS_FR,
  type ModelParams,
  type ModelResult,
  type MonthlyComputed,
  type YearlyComputed,
} from "./types";

const FY_LEN = 12;
const NUM_FY = 5;

function fyOfMonth(m: number): number {
  return Math.floor(m / FY_LEN);
}

function monthOfFy(m: number): number {
  return m % FY_LEN;
}

// Average price per new sub from tier mix
function avgSubPrice(tiers: { monthlyPrice: number; mixPct: number }[]): number {
  return tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
}

// Build monthly count of new subs per FY
// FY25: linear ramp rampStartCount → rampEndCount over 12 months
// FY26+: previous Aug count grows by fyXXGrowthPct each FY, distributed monthly
function monthlySubsCount(p: ModelParams): number[] {
  const out = new Array<number>(HORIZON_MONTHS).fill(0);
  const { rampStartCount: a, rampEndCount: b, fy26GrowthPct, fy27GrowthPct, fy28GrowthPct, fy29GrowthPct } = p.subs;

  // FY25 linear ramp
  for (let m = 0; m < FY_LEN; m++) {
    out[m] = a + ((b - a) * m) / (FY_LEN - 1);
  }

  // FY26-FY29: linear ramp from prev August to (prev August * (1 + growth))
  const growths = [fy26GrowthPct, fy27GrowthPct, fy28GrowthPct, fy29GrowthPct];
  let prevEnd = b;
  for (let fy = 1; fy < NUM_FY; fy++) {
    const start = prevEnd;
    const end = prevEnd * (1 + growths[fy - 1]);
    for (let i = 0; i < FY_LEN; i++) {
      out[fy * FY_LEN + i] = start + ((end - start) * i) / (FY_LEN - 1);
    }
    prevEnd = end;
  }
  return out;
}

// Cumulative active subs = base + sum of new subs over rolling life-time (assume full retention)
// Simpler: use the count itself as monthly NEW subscriptions; but xlsx uses count as monthly billed members.
// We treat the array as "monthly billed new members" (cohort already included).
function monthlySubsRevenue(p: ModelParams, counts: number[]): number[] {
  // tiers.monthlyPrice is TTC; revenue model uses HT = TTC / (1+vatRate)
  const basePriceTTC = avgSubPrice(p.subs.tiers);
  const vatDivisor = 1 + (p.subs.vatRate ?? 0);
  const basePriceHT = basePriceTTC / vatDivisor;
  return counts.map((c, m) => {
    const fy = fyOfMonth(m);
    const priceFactor = Math.pow(1 + p.subs.priceIndexPa, fy);
    return c * basePriceHT * priceFactor;
  });
}

function monthlyLegacy(p: ModelParams): { count: number[]; revenue: number[] } {
  const count = new Array<number>(HORIZON_MONTHS).fill(0);
  const revenue = new Array<number>(HORIZON_MONTHS).fill(0);
  const monthlyChurn = p.legacy.yearlyChurnAbs / FY_LEN;
  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const c = Math.max(0, p.legacy.startCount - monthlyChurn * m);
    count[m] = c;
    revenue[m] = c * p.legacy.avgMonthlyPrice;
  }
  return { count, revenue };
}

function monthlyPrestations(p: ModelParams): number[] {
  const out = new Array<number>(HORIZON_MONTHS).fill(0);
  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const fy = fyOfMonth(m);
    const teen = p.prestations.teen.startCount * Math.pow(1 + p.prestations.teen.growthPa, fy) * p.prestations.teen.price;
    const senior = p.prestations.senior.startCount * Math.pow(1 + p.prestations.senior.growthPa, fy) * p.prestations.senior.price;
    const horsAbo = p.prestations.horsAbo.monthlyAvg * Math.pow(1 + p.prestations.horsAbo.growthPa, fy);
    out[m] = teen + senior + horsAbo;
  }
  return out;
}

function monthlyMerch(p: ModelParams): number[] {
  const out = new Array<number>(HORIZON_MONTHS).fill(0);
  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const fy = fyOfMonth(m);
    out[m] = p.merch.monthlyMargin * Math.pow(1 + p.merch.growthPa, fy);
  }
  return out;
}

function monthlySalaries(p: ModelParams): number[] {
  const out = new Array<number>(HORIZON_MONTHS).fill(0);
  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const fy = fyOfMonth(m);
    let total = 0;
    for (const item of p.salaries.items) {
      if (m < item.startMonth) continue;
      // FY25 = base, FY26 use fy26Bump if present, then index
      let base = item.monthlyGross;
      if (fy >= 1 && item.fy26Bump !== undefined) base = item.fy26Bump;
      const indexFactor = fy >= 2 ? Math.pow(1 + p.salaries.annualIndexPa, fy - 1) : (fy === 1 && item.fy26Bump !== undefined ? 1 : 1 + (p.salaries.annualIndexPa * Math.max(0, fy)));
      // Cleaner: apply annualIndexPa starting FY26 cumulative on the base/bump
      const idx = Math.pow(1 + p.salaries.annualIndexPa, Math.max(0, fy - 1));
      total += base * idx * item.fte * (1 + p.salaries.chargesPatroPct);
    }
    out[m] = total;
  }
  return out;
}

function monthlyRent(p: ModelParams): number[] {
  const out = new Array<number>(HORIZON_MONTHS).fill(0);
  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const fy = fyOfMonth(m);
    const moy = monthOfFy(m);
    const base = p.rent.monthlyByFy[fy] ?? p.rent.monthlyByFy[p.rent.monthlyByFy.length - 1];
    let total = base + p.rent.monthlyCoopro;
    // Yearly tax in Aug (month 11 of FY)
    if (moy === 11) total += p.rent.yearlyTaxes;
    out[m] = total;
  }
  return out;
}

function monthlyRecurring(p: ModelParams, category: "entretien" | "frais_op"): number[] {
  const out = new Array<number>(HORIZON_MONTHS).fill(0);
  const items = p.recurring.filter(r => r.category === category);
  for (let m = 0; m < HORIZON_MONTHS; m++) {
    out[m] = items.reduce((s, it) => s + it.monthly, 0);
  }
  return out;
}

function monthlyOneOff(p: ModelParams): number[] {
  const out = new Array<number>(HORIZON_MONTHS).fill(0);
  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const moy = monthOfFy(m);
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
  const out = new Array<number>(HORIZON_MONTHS).fill(0);
  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const fy = fyOfMonth(m);
    const idx = Math.pow(1 + p.marketing.indexPa, fy);
    out[m] = p.marketing.monthlyBudget * idx + revenue[m] * p.marketing.pctOfRevenue;
  }
  return out;
}

function monthlyProvisions(p: ModelParams): number[] {
  const out = new Array<number>(HORIZON_MONTHS).fill(0);
  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const fy = fyOfMonth(m);
    const idx = Math.pow(1 + p.provisions.indexPa, fy);
    out[m] = (p.provisions.monthlyEquipement + p.provisions.monthlyTravaux) * idx;
  }
  return out;
}

export function computeModel(p: ModelParams): ModelResult {
  const subsCount = monthlySubsCount(p);
  const subsRevenue = monthlySubsRevenue(p, subsCount);
  const legacy = monthlyLegacy(p);
  const prest = monthlyPrestations(p);
  const merch = monthlyMerch(p);

  const totalRevenue = subsRevenue.map((v, i) => v + legacy.revenue[i] + prest[i] + merch[i]);

  const sal = monthlySalaries(p);
  const rent = monthlyRent(p);
  const recEntretien = monthlyRecurring(p, "entretien");
  const recFraisOp = monthlyRecurring(p, "frais_op");
  const oneOff = monthlyOneOff(p);
  const mkt = monthlyMarketing(p, totalRevenue);
  const prov = monthlyProvisions(p);

  const totalOpex = totalRevenue.map((_, i) =>
    sal[i] + rent[i] + recEntretien[i] + recFraisOp[i] + mkt[i] + prov[i] + oneOff[i]
  );

  // CAPEX & D&A
  const totalCapex = p.capex.equipment + p.capex.travaux + p.capex.juridique + p.capex.depots;
  const monthlyDA = p.tax.enableDA ? totalCapex / (p.tax.daYears * 12) : 0;

  // Financing flows
  const monthly: MonthlyComputed[] = [];
  let cash = p.openingCash;
  let prevRevenue = 0;
  let prevBfr = 0;
  let cashTroughMonth: number | null = null;
  let cashTroughValue = Number.POSITIVE_INFINITY;
  let breakEvenMonth: number | null = null;
  let cumulativeEbitda = 0;

  for (let m = 0; m < HORIZON_MONTHS; m++) {
    const ebitda = totalRevenue[m] - totalOpex[m];
    cumulativeEbitda += ebitda;

    const da = monthlyDA;
    const ebit = ebitda - da;

    const interestExpense = (m < p.financing.bondDurationMonths ? p.financing.bondMonthly : 0);
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
      label: MONTH_LABELS_FR[m],
      fy: fyOfMonth(m),
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
    prevRevenue = totalRevenue[m];
  }

  // Yearly aggregates
  const yearly: YearlyComputed[] = [];
  for (let fy = 0; fy < NUM_FY; fy++) {
    const slice = monthly.slice(fy * FY_LEN, (fy + 1) * FY_LEN);
    const sum = (k: keyof MonthlyComputed) => slice.reduce((s, x) => s + (x[k] as number), 0);
    const tr = sum("totalRevenue");
    const prevTr = fy === 0 ? 0 : yearly[fy - 1].totalRevenue;
    yearly.push({
      fy,
      label: `FY${25 + fy}`,
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
  // Simple IRR placeholder: NPV at 10% discount of equity flows
  const irr5y = computeIRR(monthly, p.financing.fundraise);

  return {
    monthly,
    yearly,
    breakEvenMonth,
    cashTroughMonth,
    cashTroughValue: cashTroughValue === Number.POSITIVE_INFINITY ? 0 : cashTroughValue,
    irr5y,
    fcfTotal,
  };
}

function computeIRR(monthly: MonthlyComputed[], equityIn: number): number | null {
  // Equity cash flows: investor receives bondMonthly + bondCapitalRepay + residual exit at FY29
  // Simplified: net cash flow from operations + financing cost as equity return proxy
  // Return placeholder
  if (equityIn <= 0) return null;
  const totalReturn = monthly.reduce((s, m) => s + m.bondPrincipalRepay + m.interestExpense, 0);
  const years = monthly.length / 12;
  const ratio = totalReturn / equityIn;
  if (ratio <= 0) return null;
  return Math.pow(1 + ratio, 1 / years) - 1;
}
