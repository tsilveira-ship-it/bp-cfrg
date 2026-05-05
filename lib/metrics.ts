import type { ModelResult, ModelParams } from "./model/types";

// IRR via Newton-Raphson on monthly cashflows
export function irrMonthly(cashflows: number[], guess = 0.01): number | null {
  if (cashflows.length < 2) return null;
  let rate = guess;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const f = Math.pow(1 + rate, t);
      npv += cashflows[t] / f;
      dnpv += (-t * cashflows[t]) / (f * (1 + rate));
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const newRate = rate - npv / dnpv;
    if (!isFinite(newRate)) return null;
    if (Math.abs(newRate - rate) < 1e-7) return newRate;
    rate = newRate;
  }
  return rate;
}

// IRR annuel à partir de monthly
export function annualizeMonthly(monthlyRate: number | null): number | null {
  if (monthlyRate === null) return null;
  return Math.pow(1 + monthlyRate, 12) - 1;
}

export function npv(cashflows: number[], annualDiscountRate: number): number {
  const r = Math.pow(1 + annualDiscountRate, 1 / 12) - 1;
  return cashflows.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
}

export function paybackPeriodMonths(cashflows: number[]): number | null {
  let cum = 0;
  for (let t = 0; t < cashflows.length; t++) {
    cum += cashflows[t];
    if (cum >= 0) return t;
  }
  return null;
}

// DSCR par année: CFO / service dette (intérêts + principal)
export type DSCREntry = { fy: number; label: string; cfo: number; debtService: number; dscr: number };

export function computeDSCR(result: ModelResult): DSCREntry[] {
  return result.yearly.map((y) => {
    const interest = y.interestExpense ?? 0;
    // Principal repaid via cff: approximé comme inflow - cff - interest mais simplification
    // Reconstruction: principalCash = sum monthly principalCash. Pas exposé directement, on approxime.
    // Utilisation: -cff inclut levée + repayments. Plus simple: yearly principal = sum (m.loanPrincipalRepay + m.bondPrincipalRepay)
    return {
      fy: y.fy,
      label: y.label,
      cfo: y.cfo,
      debtService: interest, // simplifié sans principal pour l'instant
      dscr: interest > 0 ? y.cfo / interest : Infinity,
    };
  });
}

// DSCR détaillé avec principal cash
export function computeDSCRDetailed(result: ModelResult): DSCREntry[] {
  return result.yearly.map((y) => {
    const slice = result.monthly.filter((m) => m.fy === y.fy);
    const principal = slice.reduce((s, m) => s + m.loanPrincipalRepay + m.bondPrincipalRepay, 0);
    const interest = slice.reduce((s, m) => s + m.interestExpense, 0);
    const debtService = interest + principal;
    return {
      fy: y.fy,
      label: y.label,
      cfo: y.cfo,
      debtService,
      dscr: debtService > 0 ? y.cfo / debtService : Infinity,
    };
  });
}

// Multiple investisseur equity: total returns / equity invested
// Hypothèse simple: investisseur reçoit dividendes (= part de net income) + exit valuation = book value FY final
export function equityInvestorReturn(
  result: ModelResult,
  params: ModelParams,
  exitMultipleEbitda = 5
): {
  invested: number;
  cashflows: number[];
  exitValuation: number;
  totalReturn: number;
  multiple: number;
  irr: number | null;
} {
  const totalEquity = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);

  // Cashflows perspective investisseur: -invested au M0, dividendes = 0 (reinvestis), exit = EBITDA × multiple en M final
  const cashflows = new Array(result.horizonMonths + 1).fill(0);
  cashflows[0] = -totalEquity;
  // Sortie = EBITDA dernière année × multiple
  const lastEbitda = result.yearly[result.yearly.length - 1].ebitda;
  const exitVal = Math.max(0, lastEbitda * exitMultipleEbitda);
  cashflows[result.horizonMonths] = exitVal;

  const totalReturn = cashflows.reduce((s, x) => s + x, 0) + totalEquity;
  const multiple = totalEquity > 0 ? exitVal / totalEquity : 0;
  const monthlyIrr = irrMonthly(cashflows);
  const annualIrr = annualizeMonthly(monthlyIrr);

  return {
    invested: totalEquity,
    cashflows,
    exitValuation: exitVal,
    totalReturn,
    multiple,
    irr: annualIrr,
  };
}

// IRR pour un bond holder
export function bondInvestorReturn(
  bondPrincipal: number,
  bondCashflows: number[]
): { invested: number; totalReturn: number; multiple: number; irr: number | null } {
  const cf = [-bondPrincipal, ...bondCashflows];
  const totalReturn = bondCashflows.reduce((s, x) => s + x, 0);
  const multiple = bondPrincipal > 0 ? totalReturn / bondPrincipal : 0;
  const monthlyIrr = irrMonthly(cf);
  const annualIrr = annualizeMonthly(monthlyIrr);
  return { invested: bondPrincipal, totalReturn, multiple, irr: annualIrr };
}

// LTV simplifié: prix moyen TTC × durée moyenne d'abonnement (mois)
// On utilise inverse churn comme proxy de durée moyenne. Pour newSubs on n'a pas de churn modélisé,
// on suppose 24 mois moyens (peut être paramétré plus tard).
export function ltvCac(params: ModelParams, result: ModelResult, avgRetentionMonths = 24) {
  const avgPriceTTC = params.subs.tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
  const ltv = avgPriceTTC * avgRetentionMonths;

  // CAC année 1: marketing total / nouveaux abos cumulés année 1
  const fy1 = result.yearly[0];
  const newSubsFy1 =
    result.monthly[result.monthly.length - 1] && result.monthly.length > 11
      ? result.monthly[11].subsCount
      : 0;
  const cac = newSubsFy1 > 0 ? fy1.marketing / newSubsFy1 : 0;

  return {
    avgPriceTTC,
    avgRetentionMonths,
    ltv,
    cac,
    ratio: cac > 0 ? ltv / cac : Infinity,
  };
}
