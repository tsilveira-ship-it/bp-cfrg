/**
 * Bornes communes (clamp min/max) appliquées aux paramètres choqués
 * par tornado.ts et monte-carlo.ts.
 *
 * Avant centralisation, chacun des deux modules définissait ses propres
 * limites en littéraux (parfois identiques, parfois divergentes).
 * Une analyse de sensibilité incohérente entre tornado et Monte Carlo
 * sur la même variable rend les conclusions non-comparables.
 */

export const SENSITIVITY_BOUNDS = {
  subsGrowth: { min: -0.5, max: 5 },
  priceIndexPa: { min: -0.1, max: 0.5 },
  monthlyChurnPct: { min: 0, max: 0.5 },
  salaryIndexPa: { min: -0.05, max: 0.3 },
  chargesPatroPct: { min: 0, max: 1 },
  isRate: { min: 0, max: 0.5 },
  vatRate: { min: 0, max: 0.4 },
  /** Taux annuel des emprunts et obligations (en %, pas ratio). */
  loanRatePct: { min: 0, max: 25 },
  conversionPct: { min: 0, max: 1 },
  capacityPerClass: { min: 1, max: Infinity },
  parallelClasses: { min: 1, max: Infinity },
  marketingMonthly: { min: 0, max: Infinity },
  rentMonthly: { min: 0, max: Infinity },
} as const;

/** Mois max de retard d'ouverture utilisé par tornado et Monte Carlo. */
export const DEFAULT_MAX_OPENING_DELAY_MONTHS = 6;

export function clampBound(
  value: number,
  bound: { min: number; max: number }
): number {
  return Math.max(bound.min, Math.min(bound.max, value));
}
