import type { ModelResult, ModelParams } from "./model/types";
import { CASH_THRESHOLDS, SALARY_RATIO_THRESHOLDS } from "./thresholds";

export function generateSynthesis(result: ModelResult, params: ModelParams): string {
  const first = result.yearly[0];
  const last = result.yearly[result.yearly.length - 1];
  const cashTroughLabel =
    result.cashTroughMonth !== null ? result.monthly[result.cashTroughMonth].label : null;

  const breakEvenLabel =
    result.breakEvenMonth !== null ? result.monthly[result.breakEvenMonth].label : null;

  const totalEquity = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const totalLoans = (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0);
  const totalBonds = (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);
  const totalRaise = totalEquity + totalLoans + totalBonds;

  const salariesPct = (last.salaries / Math.max(1, last.totalRevenue)) * 100;
  const rentPct = (last.rent / Math.max(1, last.totalRevenue)) * 100;
  const ebitdaMarginPct = last.ebitdaMargin * 100;
  const caGrowth =
    first.totalRevenue > 0
      ? ((last.totalRevenue - first.totalRevenue) / first.totalRevenue) * 100
      : 0;

  const f = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);

  const cashStatus =
    result.cashTroughValue < 0
      ? `Trésorerie négative au point bas (${f(result.cashTroughValue)} en ${cashTroughLabel}) — financement supplémentaire ou découvert nécessaire.`
      : result.cashTroughValue < CASH_THRESHOLDS.comfortEur
      ? `Trésorerie tendue au point bas (${f(result.cashTroughValue)} en ${cashTroughLabel}) — buffer fragile.`
      : `Trésorerie confortable, point bas ${f(result.cashTroughValue)} en ${cashTroughLabel}.`;

  const profitStatus =
    last.ebitda > 0
      ? breakEvenLabel
        ? `Break-even EBITDA atteint en ${breakEvenLabel}.`
        : `EBITDA positif en fin d'horizon.`
      : `EBITDA encore négatif en fin d'horizon — modèle non rentable sur la période.`;

  const salariesStatus =
    salariesPct > SALARY_RATIO_THRESHOLDS.veryHighPct * 100
      ? `Masse salariale très élevée (${salariesPct.toFixed(0)}% du CA en ${last.label}) — prioriser optimisation.`
      : salariesPct > SALARY_RATIO_THRESHOLDS.heavyPct * 100
      ? `Masse salariale lourde (${salariesPct.toFixed(0)}% du CA en ${last.label}) — surveiller.`
      : `Masse salariale maîtrisée (${salariesPct.toFixed(0)}% du CA en ${last.label}).`;

  return [
    `Le BP couvre ${result.horizonYears} ans (${first.label} → ${last.label}). CA passe de ${f(
      first.totalRevenue
    )} à ${f(last.totalRevenue)}, soit +${caGrowth.toFixed(0)}% cumulé.`,
    `EBITDA en ${last.label}: ${f(last.ebitda)} (marge ${ebitdaMarginPct.toFixed(1)}%). ${profitStatus}`,
    `${cashStatus}`,
    `Structure de coûts ${last.label}: salaires ${salariesPct.toFixed(0)}% du CA, loyer ${rentPct.toFixed(
      0
    )}%. ${salariesStatus}`,
    `Financement total ${f(totalRaise)} (apports ${f(totalEquity)} + emprunts ${f(
      totalLoans
    )} + obligations ${f(totalBonds)}).`,
  ].join(" ");
}
