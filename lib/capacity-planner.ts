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

// ============================================================================
// Bundle 1 — Heatmap saturation par créneau (jour × heure)
// ============================================================================

/** Heures couvertes par la heatmap : 7h → 20h (14 cellules). */
export const HEATMAP_HOURS = Array.from({ length: 14 }, (_, i) => 7 + i);
export const HEATMAP_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

/**
 * Bundle 1 — Heatmap par défaut (demande uniforme weekday 5/jour, weekend 3/jour).
 * Reflète DEFAULT_SCHEDULE. Distribue la demande sur des créneaux plausibles
 * (matin, midi, soir) avec poids différenciés.
 */
export function defaultDemandHeatmap(): number[][] {
  const out: number[][] = [];
  for (let dow = 0; dow < 7; dow++) {
    const row = new Array(HEATMAP_HOURS.length).fill(0);
    const isWeekend = dow >= 5;
    for (let i = 0; i < HEATMAP_HOURS.length; i++) {
      const hour = HEATMAP_HOURS[i];
      // Weekday : pic 7h-9h + 12h-13h + 17h-21h
      // Weekend : pic 9h-12h
      if (!isWeekend) {
        if (hour >= 7 && hour <= 8) row[i] = 1.0;       // matin
        else if (hour === 12) row[i] = 0.6;             // midi
        else if (hour >= 17 && hour <= 20) row[i] = 1.5; // soir (pic)
        else row[i] = 0.2;                               // creux journée
      } else {
        if (hour >= 9 && hour <= 11) row[i] = 1.2;       // matin weekend
        else row[i] = 0;                                  // pas de cours sinon (default)
      }
    }
    out.push(row);
  }
  return out;
}

/** Total des poids dans la heatmap (sert de normaliseur). */
export function heatmapTotalWeight(matrix: number[][]): number {
  return matrix.reduce((s, row) => s + row.reduce((rs, v) => rs + v, 0), 0);
}

export type SaturationCell = {
  dow: number;        // 0..6 (Lun..Dim)
  hour: number;       // 7..20
  weight: number;     // poids brut heatmap
  demandSlot: number; // demande mensuelle attribuée à ce créneau
  capacitySlot: number; // capacité mensuelle de ce créneau (places)
  saturation: number; // demand / capacity
};

/**
 * Bundle 1 — Calcule la saturation par cellule (dow × hour) pour un FY donné.
 *
 * Approche :
 * - demand_total/mo = membres × avgSessionsPerMonth (au mois de fin du FY)
 * - distribution = heatmap (poids relatifs) → demand_slot[i,j] = demand_total × weight[i,j] / sumWeights
 * - capacity_slot[i,j] = (areas total capacity × scale[fy] × 4.3) si weight > 0, sinon 0
 *   (note: chaque créneau ouvert peut accueillir Σ areas.capacity simultanément)
 */
export function computeSaturationHeatmap(
  membersAtFyEnd: number,
  avgSessionsPerMonth: number,
  matrix: number[][],
  areas: GymArea[],
  scale: number
): { cells: SaturationCell[]; maxSaturation: number; avgSaturation: number; totalDemand: number; totalCapacity: number } {
  const totalWeight = heatmapTotalWeight(matrix);
  const totalDemandMonth = membersAtFyEnd * avgSessionsPerMonth;
  const areaCapacity = areas.reduce((s, a) => s + a.capacity, 0);
  const cells: SaturationCell[] = [];
  let maxSat = 0;
  let satSum = 0;
  let satCount = 0;
  let totalCap = 0;

  for (let dow = 0; dow < 7; dow++) {
    for (let i = 0; i < HEATMAP_HOURS.length; i++) {
      const hour = HEATMAP_HOURS[i];
      const w = matrix[dow]?.[i] ?? 0;
      // Demande projetée mensuelle sur ce créneau = total × poids relatif × 4.3 sem/mois
      // (chaque cellule dow×hour est un créneau hebdomadaire, on le compte 4.3 fois/mois)
      const demandSlotMonth = totalWeight > 0 ? (totalDemandMonth * w) / totalWeight : 0;
      const capacitySlotMonth = w > 0 ? areaCapacity * scale * 4.3 : 0;
      const sat = capacitySlotMonth > 0 ? demandSlotMonth / capacitySlotMonth : 0;
      if (w > 0) {
        if (sat > maxSat) maxSat = sat;
        satSum += sat;
        satCount += 1;
        totalCap += capacitySlotMonth;
      }
      cells.push({ dow, hour, weight: w, demandSlot: demandSlotMonth, capacitySlot: capacitySlotMonth, saturation: sat });
    }
  }
  return {
    cells,
    maxSaturation: maxSat,
    avgSaturation: satCount > 0 ? satSum / satCount : 0,
    totalDemand: totalDemandMonth,
    totalCapacity: totalCap,
  };
}

/**
 * Bundle 1 — Reco engine : étant donné la heatmap saturation,
 * identifie les cellules >100% (impossible) et propose une stratégie.
 */
export type SaturationRecommendation = {
  type: "ok" | "scale-global" | "double-peaks" | "overflow";
  message: string;
  suggestedScaleGlobal?: number;
  suggestedScalePeaks?: number;
  hotCells: { dow: number; hour: number; saturation: number }[];
};

export function recommendCapacityStrategy(
  heat: ReturnType<typeof computeSaturationHeatmap>,
  targetSat = 0.75
): SaturationRecommendation {
  const hotCells = heat.cells
    .filter((c) => c.weight > 0 && c.saturation > 1)
    .sort((a, b) => b.saturation - a.saturation)
    .slice(0, 10)
    .map((c) => ({ dow: c.dow, hour: c.hour, saturation: c.saturation }));

  if (heat.maxSaturation <= targetSat * 1.05) {
    return {
      type: "ok",
      message: `Saturation max ${(heat.maxSaturation * 100).toFixed(0)}% (cible ${(targetSat * 100).toFixed(0)}%). Tu es dans la zone optimale.`,
      hotCells: [],
    };
  }

  // Scale global pour atteindre target sur le pic
  const suggestedScaleGlobal = heat.maxSaturation / targetSat;
  // Si beaucoup de cellules hot, propose de doubler les pics au lieu de tout
  const peakCells = heat.cells.filter((c) => c.weight > 0 && c.saturation > targetSat).length;
  const totalActiveCells = heat.cells.filter((c) => c.weight > 0).length;
  const peakRatio = totalActiveCells > 0 ? peakCells / totalActiveCells : 0;

  if (heat.maxSaturation > 1.5) {
    return {
      type: "overflow",
      message: `Saturation pic ${(heat.maxSaturation * 100).toFixed(0)}% — scale global ${suggestedScaleGlobal.toFixed(2)} requis OU doubler les ${peakCells} créneaux pics.`,
      suggestedScaleGlobal,
      suggestedScalePeaks: 2,
      hotCells,
    };
  }

  if (peakRatio < 0.4) {
    return {
      type: "double-peaks",
      message: `${peakCells} créneaux/${totalActiveCells} en tension. Plutôt que scale global ${suggestedScaleGlobal.toFixed(2)}, double juste les pics → économie coût coach.`,
      suggestedScaleGlobal,
      suggestedScalePeaks: 2,
      hotCells,
    };
  }

  return {
    type: "scale-global",
    message: `Demande dépasse cible. Scale global ${suggestedScaleGlobal.toFixed(2)} suggéré pour atteindre ${(targetSat * 100).toFixed(0)}% sur le pic.`,
    suggestedScaleGlobal,
    hotCells,
  };
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
