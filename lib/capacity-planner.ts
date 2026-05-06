import type {
  CoachAllocation,
  GymArea,
  ModelParams,
  WeeklySchedule,
} from "./model/types";

const WEEKS_PER_MONTH = 4.3;

/** ETP standard France: 35h/sem × 4.33 = 151,67h/mois théoriques. */
export const HOURS_PER_FTE_THEORETICAL = 35 * WEEKS_PER_MONTH;

/** Ratio d'heures productives sur heures contractuelles (déduit CP, formation, maladie). */
export const DEFAULT_PRODUCTIVE_RATIO = 0.90;

/** Heures productives par mois pour 1 ETP au taux par défaut: 137h/mois. */
export const HOURS_PER_FTE_PRODUCTIVE = HOURS_PER_FTE_THEORETICAL * DEFAULT_PRODUCTIVE_RATIO;

export const DEFAULT_AREAS: GymArea[] = [
  { id: "area_a", name: "Espace A", capacity: 14 },
  { id: "area_b", name: "Espace B", capacity: 12 },
];

export const DEFAULT_SCHEDULE: WeeklySchedule = {
  weekdayClassesPerArea: 5,
  weekendClassesPerArea: 3,
  hoursPerClass: 1,
};

/** Demande hebdo (heures) en base × scaling FY. */
export function computeWeeklyHours(
  areas: GymArea[],
  schedule: WeeklySchedule,
  scale = 1
): number {
  const classesPerWeek =
    (5 * schedule.weekdayClassesPerArea + 2 * schedule.weekendClassesPerArea) * areas.length;
  return classesPerWeek * schedule.hoursPerClass * scale;
}

export function computeMonthlyHours(
  areas: GymArea[],
  schedule: WeeklySchedule,
  scale = 1
): number {
  return computeWeeklyHours(areas, schedule, scale) * WEEKS_PER_MONTH;
}

/** Capacité places-cours par mois (si tous les cours pleins). */
export function computeMonthlyCapacitySlots(
  areas: GymArea[],
  schedule: WeeklySchedule,
  scale = 1
): number {
  const totalCapacityPerArea = areas.reduce((s, a) => s + a.capacity, 0);
  const classesPerWeekPerAreaAvg =
    5 * schedule.weekdayClassesPerArea + 2 * schedule.weekendClassesPerArea;
  // chaque cours d'un espace = capacity de cet espace × 1 cours
  // Σ = sum(area_i.capacity × classesPerWeek_per_area_i) ; ici classes per area = même valeur
  return classesPerWeekPerAreaAvg * totalCapacityPerArea * WEEKS_PER_MONTH * scale;
}

/** Heures allouées (cadres + freelance) pour un FY donné. */
export function computeAllocatedHours(
  allocations: CoachAllocation[] | undefined,
  fy: number
): { cadre: number; freelance: number; total: number } {
  const list = (allocations ?? []).filter((a) => a.fy === fy);
  const cadre = list.filter((a) => a.coachKind === "cadre").reduce((s, a) => s + a.hoursPerMonth, 0);
  const freelance = list
    .filter((a) => a.coachKind === "freelance")
    .reduce((s, a) => s + a.hoursPerMonth, 0);
  return { cadre, freelance, total: cadre + freelance };
}

/** Convertit des heures/mois en nombre d'ETP nécessaires (avec ratio productif). */
export function hoursToFte(monthlyHours: number, productiveRatio = DEFAULT_PRODUCTIVE_RATIO): number {
  const productivePerFte = HOURS_PER_FTE_THEORETICAL * productiveRatio;
  if (productivePerFte <= 0) return 0;
  return monthlyHours / productivePerFte;
}

export type CdiHypothesis = {
  monthlyGross: number;        // brut mensuel par ETP (ex 3000€)
  chargesPatroPct: number;     // charges patronales (ex 0.42)
  thirteenthMonth: boolean;    // 13e mois (default false pour coach)
  benefitsMonthly: number;     // mutuelle + tickets resto + transport (€/mois)
  productiveRatio: number;     // 0.90 par défaut
};

export type FreelanceHypothesis = {
  hourlyRate: number;          // €/h facturé (ex 40)
};

export type CostComparison = {
  hours: number;
  /** Coût total CDI pour H heures (arrondi: nb d'ETP minimum pour couvrir, salaire fixe). */
  cdiCost: number;
  cdiFteCount: number;
  cdiTotalProductiveHoursOffered: number;
  cdiUtilization: number;      // hours / cdiTotalProductiveHoursOffered (0..1)
  /** Coût total freelance pour H heures (linéaire). */
  freelanceCost: number;
  /** Différence: cdiCost - freelanceCost (positif = CDI plus cher). */
  delta: number;
  /** Recommandation textuelle. */
  recommendation: "cdi" | "freelance" | "tied";
};

/** Coût mensuel total CDI pour 1 ETP. */
export function cdiMonthlyCostPerFte(h: CdiHypothesis): number {
  const grossWith13 = h.thirteenthMonth ? h.monthlyGross * 13 / 12 : h.monthlyGross;
  const charged = grossWith13 * (1 + h.chargesPatroPct);
  return charged + h.benefitsMonthly;
}

/** Compare CDI vs Freelance pour H heures/mois. */
export function compareCdiVsFreelance(
  hours: number,
  cdi: CdiHypothesis,
  freelance: FreelanceHypothesis
): CostComparison {
  const productivePerFte = HOURS_PER_FTE_THEORETICAL * cdi.productiveRatio;
  // Nb de CDI nécessaires (arrondi sup pour couvrir)
  const cdiFteCount = productivePerFte > 0 ? Math.ceil(hours / productivePerFte) : 0;
  const cdiCost = cdiFteCount * cdiMonthlyCostPerFte(cdi);
  const cdiTotalProductiveHoursOffered = cdiFteCount * productivePerFte;
  const cdiUtilization = cdiTotalProductiveHoursOffered > 0 ? hours / cdiTotalProductiveHoursOffered : 0;
  const freelanceCost = hours * freelance.hourlyRate;
  const delta = cdiCost - freelanceCost;
  const recommendation: "cdi" | "freelance" | "tied" =
    Math.abs(delta) < 50 ? "tied" : delta < 0 ? "cdi" : "freelance";
  return {
    hours,
    cdiCost,
    cdiFteCount,
    cdiTotalProductiveHoursOffered,
    cdiUtilization,
    freelanceCost,
    delta,
    recommendation,
  };
}

/** Trouve les heures/mois où CDI = Freelance (point de bascule).
 *  Algo: balaye 0..maxHours, retourne le premier H où cdiCost <= freelanceCost. */
export function findBreakEvenHours(
  cdi: CdiHypothesis,
  freelance: FreelanceHypothesis,
  maxHours = 600,
  step = 5
): number | null {
  for (let h = step; h <= maxHours; h += step) {
    const cmp = compareCdiVsFreelance(h, cdi, freelance);
    if (cmp.cdiCost <= cmp.freelanceCost) return h;
  }
  return null;
}

/** Coût mensuel d'un pool freelance basé sur les heures allouées et son hourlyRate. */
export function freelanceCostFromAllocations(
  p: ModelParams,
  allocations: CoachAllocation[] | undefined,
  fy: number
): number {
  if (!allocations) return 0;
  const list = allocations.filter((a) => a.fy === fy && a.coachKind === "freelance");
  let total = 0;
  for (const a of list) {
    const pool = (p.salaries.freelancePools ?? []).find((pl) => pl.id === a.coachId);
    if (!pool) continue;
    const idx = Math.pow(1 + (p.salaries.annualIndexPa ?? 0), Math.max(0, fy - 1));
    total += pool.hourlyRate * a.hoursPerMonth * idx;
  }
  return total;
}
