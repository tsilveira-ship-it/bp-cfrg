/**
 * Seuils opérationnels et garde-fous partagés.
 *
 * Centralise les valeurs « numériques avec sens métier » qui étaient
 * dispersées dans health-check, synthesis, vc-audit, capacity-planner.
 * Ces valeurs sont des heuristiques projet (pas des paramètres BP) :
 * elles vivent ici plutôt que dans `ModelParams` parce qu'elles
 * concernent l'interprétation des résultats, pas le calcul lui-même.
 */

export const CASH_THRESHOLDS = {
  /** Au-dessous = warning « buffer tendu » dans health-check. */
  thinEur: 10_000,
  /** Au-dessous = synthèse « tendue » ; au-dessus = « confortable ». */
  comfortEur: 50_000,
} as const;

export const SALARY_RATIO_THRESHOLDS = {
  /** Salaires/CA — au-delà = « lourde ». */
  heavyPct: 0.35,
  /** Salaires/CA — au-delà = « très élevée ». */
  veryHighPct: 0.50,
} as const;

export const BFR_DAYS_THRESHOLDS = {
  /** > N jours de CA = warning. */
  warning: 90,
  /** > N jours = critical (ou < 0). */
  critical: 180,
} as const;

export const SATURATION_THRESHOLDS = {
  /** Au-delà = warning capacité. */
  warning: 0.95,
  /** Au-delà = critical. */
  critical: 1.0,
  /** Cible par défaut quand `params.capacity.targetSaturationPct` est absent. */
  defaultTarget: 0.75,
  /** Pic au-delà = recommander scale global plutôt que doubler les pics. */
  overflow: 1.5,
  /** Si < N% des cellules actives sont en tension, doubler les pics suffit. */
  peakRatioThreshold: 0.4,
} as const;

export const FINANCING_RATE_THRESHOLDS = {
  /** Taux annuel emprunt/obligation hors plage = warning. */
  minPct: 0,
  maxPct: 30,
  /** D/E ratio : au-delà = warning « financement déséquilibré ». */
  debtToTotalWarn: 0.5,
} as const;

export const COACHING_HEURISTICS = {
  /** Heures coaching mensuelles disponibles par FTE cadre coach.
   *  35 h/sem × 4.3 sem/mois × 0.86 (≈ taux productif coaching, hors admin/programmation). */
  monthlyHoursPerCadreFte: 130,
  /** Heures de séance/membre/mois fallback si `params.capacity.avgSessionsPerMonth` absent. */
  fallbackSessionsPerMember: 12,
} as const;

export const EBITDA_THRESHOLDS = {
  /** Marge EBITDA dernier FY < N = warning. */
  warningMargin: -0.1,
} as const;
