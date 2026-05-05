import type {
  CoachAllocation,
  GymArea,
  ModelParams,
  WeeklySchedule,
} from "./model/types";

const WEEKS_PER_MONTH = 4.3;

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
