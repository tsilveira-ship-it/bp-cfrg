export type Comparable = {
  metric: string;
  category: "Prix" | "Acquisition" | "Rétention" | "Marges" | "Marché" | "Capacité";
  ourValue: number;
  unit: "€" | "%" | "n" | "mois" | "x";
  benchmarkLow: number;
  benchmarkHigh: number;
  source: string;
  comment?: string;
};

export type ComparableEval = Comparable & {
  status: "below" | "in-range" | "above";
};

export function evaluate(c: Comparable): ComparableEval {
  const status: ComparableEval["status"] =
    c.ourValue < c.benchmarkLow
      ? "below"
      : c.ourValue > c.benchmarkHigh
        ? "above"
        : "in-range";
  return { ...c, status };
}

/**
 * Benchmarks fitness Paris / industrie SaaS-fitness. Sources publiques.
 * La source de vérité vit maintenant dans `lib/model/defaults.ts` (`DEFAULT_PARAMS.sectorBenchmarks`),
 * surchargeable via `params.sectorBenchmarks`. On expose ici un re-export pour rétrocompatibilité
 * du code existant qui importe `SECTOR_BENCHMARKS` directement (tests, ancien VC audit, etc.).
 * Pour un audit cohérent avec le scénario actif, préférez `getSectorBenchmarks(params)`.
 */
import { DEFAULT_PARAMS } from "./model/defaults";

export const SECTOR_BENCHMARKS = DEFAULT_PARAMS.sectorBenchmarks! as Required<
  NonNullable<typeof DEFAULT_PARAMS.sectorBenchmarks>
>;

export type SectorBenchmarkKey = keyof typeof SECTOR_BENCHMARKS;
