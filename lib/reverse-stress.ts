import { computeModel } from "./model/compute";
import type { ModelParams, ModelResult } from "./model/types";

/**
 * Reverse stress test — pour chaque driver, trouve la valeur de rupture qui
 * fait basculer une métrique-clé (cashTrough<0, no break-even, EBITDA Y_last<0,
 * DSCR<1) via bisection.
 *
 * Sortie : pour chaque (driver × métrique), valeur courante / valeur de
 * rupture / marge de sécurité absolue et relative.
 *
 * Hypothèse de monotonicité : pour chaque driver, la métrique évolue de façon
 * monotone dans la direction indiquée. Les drivers non-monotones (ex budget
 * marketing — un budget trop bas ET un budget trop haut détériorent l'EBITDA)
 * sont exclus du reverse stress et marqués séparément pour scan linéaire.
 */

export type StressMetricId =
  | "cashTroughZero"
  | "noBreakEven"
  | "ebitdaLastNegative"
  | "dscrYearBelowOne";

export type StressDirection = "higher-is-worse" | "lower-is-worse";

export type StressDriver = {
  id: string;
  label: string;
  /** Valeur courante du driver dans le scénario base. */
  read: (p: ModelParams) => number;
  /** Applique une valeur — retourne un nouveau ModelParams (clone profond requis). */
  apply: (p: ModelParams, value: number) => ModelParams;
  /** Direction "pire" du driver — détermine la borne `bad` pour la bisection. */
  direction: StressDirection;
  /** Borne plausible/extrême pour la bisection. */
  worstBound: number;
  /** Unité d'affichage (€, %, mois, ratio...) */
  unit: string;
  /** Si true, valeur affichée en pourcent (multiplie par 100). */
  isPct?: boolean;
  /** Description courte du driver. */
  rationale?: string;
};

export type BreakResult = {
  driverId: string;
  driverLabel: string;
  metric: StressMetricId;
  metricLabel: string;
  currentValue: number;
  /** Valeur du driver à la rupture. NaN si déjà cassé ou non trouvé. */
  breakValue: number;
  /** Δ absolu = breakValue - currentValue. */
  absoluteMargin: number;
  /** Δ relatif = |breakValue - currentValue| / |currentValue|. NaN si current=0. */
  relativeMargin: number;
  /** Statut explicite de la recherche. */
  status: "found" | "already-broken" | "no-break-in-bounds";
  iterations: number;
  unit: string;
  isPct: boolean;
};

const METRIC_LABELS: Record<StressMetricId, string> = {
  cashTroughZero: "Trésorerie creux ≥ 0",
  noBreakEven: "Break-even atteint dans l'horizon",
  ebitdaLastNegative: "EBITDA dernier FY ≥ 0",
  dscrYearBelowOne: "DSCR min annuel ≥ 1 (post période grâce)",
};

function safeYearly(r: ModelResult, idx: number) {
  return r.yearly[idx >= 0 ? idx : r.yearly.length + idx];
}

/**
 * DSCR annuel = EBITDA / (intérêt + principal remboursé) — agrégat des
 * monthlyComputed sur 12 mois consécutifs par FY.
 * Skip les FY où le service de la dette est 0 (pas de pertinence).
 * Retourne le minimum sur les FY post-FY0 (FY0 = ouverture, distorsion ramp).
 */
function minAnnualDSCR(r: ModelResult): number {
  let minDscr = Infinity;
  for (let fy = 1; fy < r.yearly.length; fy++) {
    const months = r.monthly.slice(fy * 12, (fy + 1) * 12);
    const interest = months.reduce((s, m) => s + m.interestExpense, 0);
    const principal = months.reduce((s, m) => s + m.loanPrincipalRepay + m.bondPrincipalRepay, 0);
    const debtService = interest + principal;
    if (debtService <= 0) continue;
    const ebitda = r.yearly[fy].ebitda;
    const dscr = ebitda / debtService;
    if (dscr < minDscr) minDscr = dscr;
  }
  return minDscr === Infinity ? 99 : minDscr;
}

/** Retourne true si la métrique passe le test (modèle "sain"). */
function passesMetric(r: ModelResult, m: StressMetricId): boolean {
  switch (m) {
    case "cashTroughZero":
      return r.cashTroughValue >= 0;
    case "noBreakEven":
      return r.breakEvenMonth !== null;
    case "ebitdaLastNegative":
      return (safeYearly(r, -1)?.ebitda ?? 0) >= 0;
    case "dscrYearBelowOne":
      return minAnnualDSCR(r) >= 1;
  }
}

/**
 * Bisection — recherche valeur du driver où la métrique bascule.
 * Précondition : `currentValue` passe la métrique, `worstBound` ne passe pas.
 * Si non vérifié, retourne status correspondant.
 */
export function findBreakValue(
  base: ModelParams,
  driver: StressDriver,
  metric: StressMetricId,
  maxIterations = 40,
  tolerance = 1e-4
): BreakResult {
  const currentValue = driver.read(base);

  // Vérif état courant
  const baseResult = computeModel(driver.apply(base, currentValue));
  if (!passesMetric(baseResult, metric)) {
    return {
      driverId: driver.id,
      driverLabel: driver.label,
      metric,
      metricLabel: METRIC_LABELS[metric],
      currentValue,
      breakValue: NaN,
      absoluteMargin: 0,
      relativeMargin: 0,
      status: "already-broken",
      iterations: 0,
      unit: driver.unit,
      isPct: driver.isPct ?? false,
    };
  }

  // Vérif worstBound échoue
  const worstResult = computeModel(driver.apply(base, driver.worstBound));
  if (passesMetric(worstResult, metric)) {
    return {
      driverId: driver.id,
      driverLabel: driver.label,
      metric,
      metricLabel: METRIC_LABELS[metric],
      currentValue,
      breakValue: driver.worstBound,
      absoluteMargin: driver.worstBound - currentValue,
      relativeMargin: currentValue !== 0 ? Math.abs(driver.worstBound - currentValue) / Math.abs(currentValue) : NaN,
      status: "no-break-in-bounds",
      iterations: 1,
      unit: driver.unit,
      isPct: driver.isPct ?? false,
    };
  }

  // Bisection — `okValue` toujours passe, `badValue` toujours échoue.
  let okValue = currentValue;
  let badValue = driver.worstBound;
  let iterations = 0;
  while (Math.abs(badValue - okValue) > tolerance && iterations < maxIterations) {
    const mid = (okValue + badValue) / 2;
    const midResult = computeModel(driver.apply(base, mid));
    if (passesMetric(midResult, metric)) okValue = mid;
    else badValue = mid;
    iterations++;
  }

  // Valeur de rupture = première valeur côté "bad" — borne supérieure (resp. inf)
  // de l'intervalle [okValue, badValue] selon direction.
  const breakValue = badValue;

  return {
    driverId: driver.id,
    driverLabel: driver.label,
    metric,
    metricLabel: METRIC_LABELS[metric],
    currentValue,
    breakValue,
    absoluteMargin: breakValue - currentValue,
    relativeMargin: currentValue !== 0 ? Math.abs(breakValue - currentValue) / Math.abs(currentValue) : NaN,
    status: "found",
    iterations,
    unit: driver.unit,
    isPct: driver.isPct ?? false,
  };
}

/** Lance le reverse stress sur un set de (driver, métrique). */
export function runReverseStress(
  base: ModelParams,
  drivers: StressDriver[],
  metrics: StressMetricId[]
): BreakResult[] {
  const out: BreakResult[] = [];
  for (const d of drivers) {
    for (const m of metrics) {
      out.push(findBreakValue(base, d, m));
    }
  }
  return out;
}
