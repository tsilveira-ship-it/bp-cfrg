import type { ModelResult, ModelParams } from "./model/types";
import { getInvestorAssumptions } from "./model/defaults";
import {
  monthlyAcquisitions,
  expectedRetentionMonths,
  weightedChannelCac,
} from "./model/compute";

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
// `exitMultipleEbitda` optionnel — si non fourni, lit params.investorAssumptions.exitMultipleEbitda (default 5).
export function equityInvestorReturn(
  result: ModelResult,
  params: ModelParams,
  exitMultipleEbitda?: number
): {
  invested: number;
  cashflows: number[];
  exitValuation: number;
  totalReturn: number;
  multiple: number;
  irr: number | null;
} {
  const totalEquity = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const ebitdaMultiple = exitMultipleEbitda ?? getInvestorAssumptions(params).exitMultipleEbitda!;

  // Cashflows perspective investisseur: -invested au M0, dividendes = 0 (reinvestis), exit = EBITDA × multiple en M final
  const cashflows = new Array(result.horizonMonths + 1).fill(0);
  cashflows[0] = -totalEquity;
  // Sortie = EBITDA dernière année × multiple
  const lastEbitda = result.yearly[result.yearly.length - 1].ebitda;
  const exitVal = Math.max(0, lastEbitda * ebitdaMultiple);
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

// Niveau 2 — LTV par tier (utilise tier.monthlyChurnPct override si défini).
export type TierLtvEntry = {
  tierId: string;
  tierName: string;
  priceTTC: number;
  mixPct: number;
  monthlyChurnPct: number;
  avgRetentionMonths: number;
  ltv: number;
};

export function ltvByTier(params: ModelParams, fallbackRetention?: number): TierLtvEntry[] {
  const fallbackChurn = params.subs.monthlyChurnPct ?? 0;
  const retentionFallback =
    fallbackRetention ?? getInvestorAssumptions(params).retentionMonthsFallback!;
  // Si retentionCurve actif, la rétention par tier suit la même courbe empirique
  // (le tier-churn override est ignoré car la courbe est globale). Sinon, retombe
  // sur tier.monthlyChurnPct ?? global churn, avec fallback constant.
  const curve = params.subs.cohortModel?.retentionCurve;
  return params.subs.tiers.map((t) => {
    const churn = t.monthlyChurnPct ?? fallbackChurn;
    const retention =
      curve && curve.length > 0
        ? expectedRetentionMonths(churn, curve)
        : churn > 0
        ? 1 / churn
        : retentionFallback;
    return {
      tierId: t.id,
      tierName: t.name,
      priceTTC: t.monthlyPrice,
      mixPct: t.mixPct,
      monthlyChurnPct: churn,
      avgRetentionMonths: retention,
      ltv: t.monthlyPrice * retention,
    };
  });
}

// LTV simplifié: prix moyen TTC × durée moyenne d'abonnement (mois).
// Si `monthlyChurnPct` > 0, durée moyenne = 1 / churn (formule analytique cohort exponentiel).
// Sinon fallback override `avgRetentionMonths` (lit params.investorAssumptions.retentionMonthsFallback).
//
// CAC année 1: marketing total Y1 / acquisitions cumulées sur 12 premiers mois.
// Auparavant le code utilisait `result.monthly[11].subsCount` (= stock fin Y1, pas acquisitions) →
// bug qui sous-estimait le CAC et gonflait artificiellement le ratio LTV/CAC affiché à
// l'investisseur. Corrigé : on appelle `monthlyAcquisitions(params, H)` puis somme [0..11].
export function ltvCac(
  params: ModelParams,
  result: ModelResult,
  avgRetentionMonthsOverride?: number
) {
  const avgPriceTTC = params.subs.tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
  const churn = params.subs.monthlyChurnPct ?? 0;
  const fallbackRetention =
    avgRetentionMonthsOverride ?? getInvestorAssumptions(params).retentionMonthsFallback!;
  // Si retentionCurve actif, on intègre la courbe (avec extrapolation tail clampée).
  // Sinon formule fermée 1/churn. Fix du bug où LTV utilisait toujours 1/churn même
  // avec une courbe non-exponentielle (newbie drop sous-estimé, fat-tail sur-estimé).
  const curve = params.subs.cohortModel?.retentionCurve;
  const avgRetentionMonths =
    curve && curve.length > 0
      ? expectedRetentionMonths(churn, curve)
      : churn > 0
      ? 1 / churn
      : fallbackRetention;
  const ltv = avgPriceTTC * avgRetentionMonths;

  const fy1 = result.yearly[0];
  const acquisitionsY1 = result.horizonMonths >= 12
    ? monthlyAcquisitions(params, result.horizonMonths)
        .slice(0, 12)
        .reduce((s, v) => s + v, 0)
    : 0;
  // CAC : si l'utilisateur a défini des canaux d'acquisition (acquisitionChannels),
  // on utilise leur CAC pondéré (source : mix par canal × cacEur). Sinon retombe sur
  // le CAC implicite marketing budget Y1 / acquisitions Y1.
  const channelCac = weightedChannelCac(params);
  const implicitCac = acquisitionsY1 > 0 ? fy1.marketing / acquisitionsY1 : 0;
  const cac = channelCac ?? implicitCac;
  const cacSource: "channels" | "implicit" = channelCac !== null ? "channels" : "implicit";

  return {
    avgPriceTTC,
    avgRetentionMonths,
    ltv,
    cac,
    cacSource,
    ratio: cac > 0 ? ltv / cac : Infinity,
    acquisitionsY1,
  };
}
