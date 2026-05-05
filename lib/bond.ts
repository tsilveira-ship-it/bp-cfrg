export type Frequency = 1 | 2 | 4;
export type Amortization = "bullet" | "linear";

export interface BondInput {
  principal: number;
  annualRatePct: number;
  termYears: number;
  frequency: Frequency;
  amortization: Amortization;
  deferralYears: number;
  capitalizeInterest: boolean;
  convertible: boolean;
  startDate: string;
}

export interface ScheduleRow {
  period: number;
  date: string;
  year: number;
  openingBalance: number;
  interest: number;
  capitalizedInterest: number;
  couponPaid: number;
  principalRepaid: number;
  totalCashFlow: number;
  closingBalance: number;
  phase: "deferral" | "service";
}

export interface AnnualSummary {
  year: number;
  interestAccrued: number;
  capitalizedInterest: number;
  couponPaid: number;
  principalRepaid: number;
  totalCashFlow: number;
  endingBalance: number;
}

export interface SimulationResult {
  schedule: ScheduleRow[];
  annual: AnnualSummary[];
  totals: {
    totalInterestAccrued: number;
    totalCapitalized: number;
    totalCouponPaid: number;
    totalPrincipalRepaid: number;
    totalCashFlow: number;
    finalBalance: number;
    grownPrincipalAfterDeferral: number;
  };
}

const PERIOD_LABEL: Record<Frequency, string> = {
  1: "annuel",
  2: "semestriel",
  4: "trimestriel",
};

export const periodLabel = (f: Frequency) => PERIOD_LABEL[f];

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function simulate(input: BondInput): SimulationResult {
  const {
    principal,
    annualRatePct,
    termYears,
    frequency,
    amortization,
    deferralYears,
    capitalizeInterest,
    startDate,
  } = input;

  const totalPeriods = Math.round(termYears * frequency);
  const deferralPeriods = Math.min(
    Math.round(deferralYears * frequency),
    totalPeriods,
  );
  const monthsPerPeriod = 12 / frequency;
  const periodRate = annualRatePct / 100 / frequency;

  const schedule: ScheduleRow[] = [];
  let balance = principal;
  let totalInterestAccrued = 0;
  let totalCapitalized = 0;
  let totalCouponPaid = 0;
  let totalPrincipalRepaid = 0;
  let totalCashFlow = 0;

  for (let i = 1; i <= deferralPeriods; i++) {
    const opening = balance;
    const interest = opening * periodRate;
    let capitalized = 0;
    let coupon = 0;
    if (capitalizeInterest) {
      capitalized = interest;
      balance += interest;
    } else {
      coupon = interest;
    }
    const date = addMonths(startDate, i * monthsPerPeriod);
    const cashflow = coupon;
    schedule.push({
      period: i,
      date,
      year: new Date(date).getUTCFullYear(),
      openingBalance: round2(opening),
      interest: round2(interest),
      capitalizedInterest: round2(capitalized),
      couponPaid: round2(coupon),
      principalRepaid: 0,
      totalCashFlow: round2(cashflow),
      closingBalance: round2(balance),
      phase: "deferral",
    });
    totalInterestAccrued += interest;
    totalCapitalized += capitalized;
    totalCouponPaid += coupon;
    totalCashFlow += cashflow;
  }

  const grownPrincipalAfterDeferral = balance;
  const remainingPeriods = totalPeriods - deferralPeriods;

  const linearPrincipal =
    amortization === "linear" && remainingPeriods > 0
      ? balance / remainingPeriods
      : 0;

  for (let j = 1; j <= remainingPeriods; j++) {
    const i = deferralPeriods + j;
    const opening = balance;
    const interest = opening * periodRate;
    const coupon = interest;
    let principalRepaid = 0;
    if (amortization === "bullet") {
      principalRepaid = j === remainingPeriods ? balance : 0;
    } else {
      principalRepaid = j === remainingPeriods ? balance : linearPrincipal;
    }
    balance -= principalRepaid;
    if (Math.abs(balance) < 0.005) balance = 0;
    const date = addMonths(startDate, i * monthsPerPeriod);
    const cashflow = coupon + principalRepaid;
    schedule.push({
      period: i,
      date,
      year: new Date(date).getUTCFullYear(),
      openingBalance: round2(opening),
      interest: round2(interest),
      capitalizedInterest: 0,
      couponPaid: round2(coupon),
      principalRepaid: round2(principalRepaid),
      totalCashFlow: round2(cashflow),
      closingBalance: round2(balance),
      phase: "service",
    });
    totalInterestAccrued += interest;
    totalCouponPaid += coupon;
    totalPrincipalRepaid += principalRepaid;
    totalCashFlow += cashflow;
  }

  const annualMap = new Map<number, AnnualSummary>();
  for (const r of schedule) {
    const y = r.year;
    const cur =
      annualMap.get(y) ??
      ({
        year: y,
        interestAccrued: 0,
        capitalizedInterest: 0,
        couponPaid: 0,
        principalRepaid: 0,
        totalCashFlow: 0,
        endingBalance: 0,
      } satisfies AnnualSummary);
    cur.interestAccrued += r.interest;
    cur.capitalizedInterest += r.capitalizedInterest;
    cur.couponPaid += r.couponPaid;
    cur.principalRepaid += r.principalRepaid;
    cur.totalCashFlow += r.totalCashFlow;
    cur.endingBalance = r.closingBalance;
    annualMap.set(y, cur);
  }
  const annual = [...annualMap.values()]
    .sort((a, b) => a.year - b.year)
    .map((a) => ({
      ...a,
      interestAccrued: round2(a.interestAccrued),
      capitalizedInterest: round2(a.capitalizedInterest),
      couponPaid: round2(a.couponPaid),
      principalRepaid: round2(a.principalRepaid),
      totalCashFlow: round2(a.totalCashFlow),
      endingBalance: round2(a.endingBalance),
    }));

  return {
    schedule,
    annual,
    totals: {
      totalInterestAccrued: round2(totalInterestAccrued),
      totalCapitalized: round2(totalCapitalized),
      totalCouponPaid: round2(totalCouponPaid),
      totalPrincipalRepaid: round2(totalPrincipalRepaid),
      totalCashFlow: round2(totalCashFlow),
      finalBalance: round2(balance),
      grownPrincipalAfterDeferral: round2(grownPrincipalAfterDeferral),
    },
  };
}

export function toCSV(rows: ScheduleRow[]): string {
  const header = [
    "Période",
    "Date",
    "Année",
    "Phase",
    "Solde ouverture",
    "Intérêts",
    "Intérêts capitalisés",
    "Coupon payé",
    "Principal remboursé",
    "Flux total",
    "Solde clôture",
  ];
  const lines = rows.map((r) =>
    [
      r.period,
      r.date,
      r.year,
      r.phase,
      r.openingBalance,
      r.interest,
      r.capitalizedInterest,
      r.couponPaid,
      r.principalRepaid,
      r.totalCashFlow,
      r.closingBalance,
    ].join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
