import type {
  ClassDiscipline,
  CoachAllocation,
  GymArea,
  ModelParams,
  Persona,
  WeeklySchedule,
} from "./model/types";
import { SATURATION_THRESHOLDS } from "./thresholds";

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
  scale: number,
  parallelMatrix?: number[][]
): { cells: SaturationCell[]; maxSaturation: number; avgSaturation: number; totalDemand: number; totalCapacity: number } {
  const totalWeight = heatmapTotalWeight(matrix);
  const totalDemandMonth = membersAtFyEnd * avgSessionsPerMonth;
  const sortedCaps = [...areas.map((a) => a.capacity)].sort((x, y) => y - x);
  const totalAreaCapacity = sortedCaps.reduce((s, c) => s + c, 0);
  const cells: SaturationCell[] = [];
  let maxSat = 0;
  let satSum = 0;
  let satCount = 0;
  let totalCap = 0;

  for (let dow = 0; dow < 7; dow++) {
    for (let i = 0; i < HEATMAP_HOURS.length; i++) {
      const hour = HEATMAP_HOURS[i];
      const w = matrix[dow]?.[i] ?? 0;
      // Bundle 2 — Si parallelMatrix défini, capacité par cellule = nbEspacesOuverts × cap des N premiers
      // Sinon (Bundle 1), tous les espaces sont ouverts par défaut.
      let cellCapacity = totalAreaCapacity;
      if (parallelMatrix) {
        const nOpen = Math.max(0, Math.min(parallelMatrix[dow]?.[i] ?? 0, areas.length));
        cellCapacity = 0;
        for (let k = 0; k < nOpen; k++) cellCapacity += sortedCaps[k];
      }
      const demandSlotMonth = totalWeight > 0 ? (totalDemandMonth * w) / totalWeight : 0;
      const capacitySlotMonth = w > 0 && cellCapacity > 0 ? cellCapacity * scale * 4.3 : 0;
      const sat = capacitySlotMonth > 0 ? demandSlotMonth / capacitySlotMonth : (demandSlotMonth > 0 ? Infinity : 0);
      if (w > 0) {
        if (sat > maxSat && Number.isFinite(sat)) maxSat = sat;
        satSum += Number.isFinite(sat) ? sat : 0;
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
  targetSat: number = SATURATION_THRESHOLDS.defaultTarget
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

  if (heat.maxSaturation > SATURATION_THRESHOLDS.overflow) {
    return {
      type: "overflow",
      message: `Saturation pic ${(heat.maxSaturation * 100).toFixed(0)}% — scale global ${suggestedScaleGlobal.toFixed(2)} requis OU doubler les ${peakCells} créneaux pics.`,
      suggestedScaleGlobal,
      suggestedScalePeaks: 2,
      hotCells,
    };
  }

  if (peakRatio < SATURATION_THRESHOLDS.peakRatioThreshold) {
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

// ============================================================================
// Bundle 2 — Planning hétérogène par créneau
// ============================================================================

/**
 * Matrice par défaut "1 espace ouvert" sur les heures de schedule, 0 ailleurs.
 * Reflète DEFAULT_SCHEDULE : 5 wd (en pic 7h, 12h, 18h, 19h, 20h) + 3 we (9h, 10h, 11h).
 */
export function defaultParallelMatrix(): number[][] {
  const out: number[][] = [];
  const wdHours = [7, 12, 18, 19, 20];
  const weHours = [9, 10, 11];
  for (let dow = 0; dow < 7; dow++) {
    const row = new Array(HEATMAP_HOURS.length).fill(0);
    const isWeekend = dow >= 5;
    const targetHours = isWeekend ? weHours : wdHours;
    for (const h of targetHours) {
      const i = HEATMAP_HOURS.indexOf(h);
      if (i >= 0) row[i] = 1;
    }
    out.push(row);
  }
  return out;
}

/**
 * Compute capacity mensuelle places à partir d'une matrice de parallélisme par créneau.
 * Pour chaque cellule [dow][hour] : capacity_slot/sem = nbAreasOpen × Σ(areas.capacity).
 * Note: si nbAreasOpen=2, on suppose que les 2 plus grands espaces sont ouverts.
 * Simplification (V2) : on prend nbAreasOpen × moyenne des espaces.
 */
export function computeMonthlyCapacityFromMatrix(
  matrix: number[][],
  areas: GymArea[],
  scale = 1
): number {
  if (areas.length === 0) return 0;
  // On utilise les capacités triées descendantes pour matérialiser "les N premiers espaces ouverts"
  const sortedCaps = [...areas.map((a) => a.capacity)].sort((x, y) => y - x);
  let weeklyCap = 0;
  for (let dow = 0; dow < matrix.length; dow++) {
    for (let i = 0; i < matrix[dow].length; i++) {
      const n = Math.max(0, Math.min(matrix[dow][i], areas.length));
      let cellCap = 0;
      for (let k = 0; k < n; k++) cellCap += sortedCaps[k];
      weeklyCap += cellCap;
    }
  }
  return weeklyCap * 4.3 * scale;
}

/**
 * Bundle 2 — Sat-driven auto-scheduling.
 * Étant donné la heatmap de demande + capacité espace A (premier espace),
 * propose une matrice de parallélisme : ouvre N espaces sur les créneaux
 * où la demande projette > targetSat avec N-1 espaces.
 *
 * Algo glouton : pour chaque cellule active (weight > 0), monter le nombre
 * d'espaces ouverts jusqu'à ce que sat <= target ou jusqu'à areas.length.
 */
export function autoScheduleParallelMatrix(
  membersAtFyEnd: number,
  avgSessionsPerMonth: number,
  demandMatrix: number[][],
  areas: GymArea[],
  scale: number,
  targetSat: number = SATURATION_THRESHOLDS.defaultTarget
): number[][] {
  const out: number[][] = Array.from({ length: 7 }, () =>
    new Array(HEATMAP_HOURS.length).fill(0)
  );
  const totalWeight = heatmapTotalWeight(demandMatrix);
  if (totalWeight <= 0 || areas.length === 0) return out;
  const totalDemand = membersAtFyEnd * avgSessionsPerMonth;
  const sortedCaps = [...areas.map((a) => a.capacity)].sort((x, y) => y - x);
  for (let dow = 0; dow < 7; dow++) {
    for (let i = 0; i < HEATMAP_HOURS.length; i++) {
      const w = demandMatrix[dow]?.[i] ?? 0;
      if (w <= 0) continue;
      const demandSlot = (totalDemand * w) / totalWeight;
      // Essaye 1 puis 2 puis 3... espaces jusqu'à atteindre target sat.
      let n = 1;
      for (; n <= areas.length; n++) {
        let cap = 0;
        for (let k = 0; k < n; k++) cap += sortedCaps[k];
        const capSlot = cap * scale * 4.3;
        if (capSlot > 0 && demandSlot / capSlot <= targetSat) break;
      }
      out[dow][i] = Math.min(n, areas.length);
    }
  }
  return out;
}

// ============================================================================
// Bundle 2 — avgSessionsPerMonth dérivé du cohort
// ============================================================================

/**
 * Calcule la moyenne pondérée de séances/mois en fonction de la composition
 * de la base par tranches d'ancienneté.
 * Si cohortModel non actif, retourne fallback constant.
 *
 * Approche simplifiée :
 * - Si on a counts mensuels (subsCount[]) sur l'horizon, à un mois m donné :
 *   - Cohorte "récente" (entrée dans les 3 derniers mois) ≈ 25% en steady
 *   - "Mid" (3-12 mois) ≈ 35%
 *   - "Long" (12+ mois) ≈ 40%
 * - Avec proportions paramétrables. Pour V1, ratios fixes.
 */
export function avgSessionsWeighted(
  base: { newMember: number; midTerm: number; longTerm: number },
  fallback: number,
  cohortActive: boolean,
  shareNew = 0.25,
  shareMid = 0.35,
  shareLong = 0.40
): number {
  if (!cohortActive) return fallback;
  const sumShare = shareNew + shareMid + shareLong;
  if (sumShare <= 0) return fallback;
  return (
    (base.newMember * shareNew + base.midTerm * shareMid + base.longTerm * shareLong) / sumShare
  );
}

// ============================================================================
// Bundle 3 — Disciplines, personas, no-show, coût marginal
// ============================================================================

/** Liste des disciplines supportées avec couleurs UI. */
export const DISCIPLINES: { id: ClassDiscipline; label: string; color: string }[] = [
  { id: "crossfit", label: "CrossFit", color: "#D32F2F" },
  { id: "hyrox", label: "Hyrox", color: "#7C2D12" },
  { id: "halterophilie", label: "Haltéro", color: "#B45309" },
  { id: "gymnastique", label: "Gym", color: "#0E7490" },
  { id: "running", label: "Running", color: "#16A34A" },
  { id: "teens", label: "Teens", color: "#A21CAF" },
  { id: "masters", label: "Masters", color: "#0F766E" },
  { id: "other", label: "Autre", color: "#64748B" },
];

/** Personas par défaut basés sur la heatmap CRM CFRG. */
export function defaultPersonas(): Persona[] {
  return [
    {
      id: "csp_plus",
      name: "CSP+ 30-45 ans",
      sharePct: 0.55,
      avgSessionsPerMonth: 9,
      disciplineMix: { crossfit: 0.6, hyrox: 0.2, halterophilie: 0.1, gymnastique: 0.1 },
      hourPreferences: { morning: 0.25, lunch: 0.15, evening: 0.55, weekend: 0.05 },
    },
    {
      id: "athlete_hyrox",
      name: "Athlète Hyrox amateur",
      sharePct: 0.10,
      avgSessionsPerMonth: 12,
      disciplineMix: { hyrox: 0.5, crossfit: 0.3, running: 0.2 },
      hourPreferences: { morning: 0.4, lunch: 0.10, evening: 0.40, weekend: 0.10 },
    },
    {
      id: "masters_50",
      name: "Masters 50+",
      sharePct: 0.10,
      avgSessionsPerMonth: 6,
      disciplineMix: { masters: 0.7, crossfit: 0.2, gymnastique: 0.1 },
      hourPreferences: { morning: 0.7, lunch: 0.1, evening: 0.1, weekend: 0.1 },
    },
    {
      id: "teens_14",
      name: "Teens 14+",
      sharePct: 0.05,
      avgSessionsPerMonth: 5,
      disciplineMix: { teens: 0.8, crossfit: 0.2 },
      hourPreferences: { morning: 0.0, lunch: 0.1, evening: 0.5, weekend: 0.4 },
    },
    {
      id: "forces_ordre",
      name: "Forces de l'ordre / prépa",
      sharePct: 0.05,
      avgSessionsPerMonth: 10,
      disciplineMix: { crossfit: 0.4, hyrox: 0.4, running: 0.2 },
      hourPreferences: { morning: 0.5, lunch: 0.1, evening: 0.3, weekend: 0.1 },
    },
    {
      id: "newbie",
      name: "Débutant reprise sport",
      sharePct: 0.15,
      avgSessionsPerMonth: 5,
      disciplineMix: { crossfit: 0.7, gymnastique: 0.15, masters: 0.15 },
      hourPreferences: { morning: 0.2, lunch: 0.2, evening: 0.5, weekend: 0.1 },
    },
  ];
}

/**
 * Bundle 3 — Calcule la moyenne pondérée sessions/mois sur l'ensemble des personas.
 */
export function avgSessionsByPersona(personas: Persona[]): number {
  const sumShare = personas.reduce((s, p) => s + p.sharePct, 0);
  if (sumShare <= 0) return 0;
  return personas.reduce((s, p) => s + p.sharePct * p.avgSessionsPerMonth, 0) / sumShare;
}

/**
 * Bundle 3 — Distribution de la demande par persona × créneau (heatmap).
 * Utile pour voir si un persona est mal servi (Masters 50+ matin = OK, Teens soir = OK).
 *
 * Pour chaque cellule, on combine :
 *   weight_persona = base_weight × pref_horaire(persona, dow, hour)
 * Puis on normalise par persona.
 */
export function buildDemandHeatmapFromPersonas(
  personas: Persona[],
  baseMatrix: number[][]
): number[][] {
  // Aggrégation simple : pour chaque cellule, somme(weight_base × pref_horaire(persona, dow, hour) × share_persona)
  const out: number[][] = Array.from({ length: 7 }, () =>
    new Array(HEATMAP_HOURS.length).fill(0)
  );
  for (let dow = 0; dow < 7; dow++) {
    const isWeekend = dow >= 5;
    for (let i = 0; i < HEATMAP_HOURS.length; i++) {
      const hour = HEATMAP_HOURS[i];
      const base = baseMatrix[dow]?.[i] ?? 0;
      if (base <= 0) continue;
      let weight = 0;
      for (const p of personas) {
        const pref = p.hourPreferences ?? { morning: 0.25, lunch: 0.15, evening: 0.55, weekend: 0.05 };
        let prefValue = 0;
        if (isWeekend) prefValue = pref.weekend;
        else if (hour >= 7 && hour < 10) prefValue = pref.morning;
        else if (hour >= 11 && hour < 14) prefValue = pref.lunch;
        else if (hour >= 17 && hour <= 21) prefValue = pref.evening;
        else prefValue = pref.morning * 0.3; // creux
        weight += p.sharePct * prefValue;
      }
      out[dow][i] = base * weight;
    }
  }
  return out;
}

/**
 * Bundle 3 — Capacité effective avec no-show factor.
 * Si noShow=0.10, on peut overbook légèrement → capacité × (1 / 0.90) = +11%.
 */
export function effectiveCapacityWithNoShow(rawCapacity: number, noShowPct = 0): number {
  const usable = Math.max(0.5, 1 - noShowPct);
  return rawCapacity / usable;
}

export type MarginalClassEconomics = {
  hourlyCostEur: number;       // coût d'ouverture d'1h cours (1 coach freelance)
  revenuePerSlotEur: number;   // revenu moyen / place vendue HT
  capacityPerHour: number;     // places dispo / cours
  breakevenFillRate: number;   // % remplissage minimal pour rentabiliser
  recommendedOpen: boolean;    // true si fillRate prévu ≥ breakeven
};

/**
 * Bundle 3 — Économie marginale d'un cours supplémentaire ouvert.
 * coût = 1h × tarif coach freelance.
 * revenu = nb places vendues × prix moyen séance HT (= prix abo HT / sessions/mo).
 * breakeven = coût / (places × prix unitaire).
 */
export function marginalClassEconomics(
  hourlyCostEur: number,
  capacityPerHour: number,
  revenuePerSlotEur: number,
  expectedFillRate = 0.7
): MarginalClassEconomics {
  const breakevenFillRate =
    capacityPerHour > 0 && revenuePerSlotEur > 0
      ? hourlyCostEur / (capacityPerHour * revenuePerSlotEur)
      : Infinity;
  return {
    hourlyCostEur,
    revenuePerSlotEur,
    capacityPerHour,
    breakevenFillRate,
    recommendedOpen: expectedFillRate >= breakevenFillRate,
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
