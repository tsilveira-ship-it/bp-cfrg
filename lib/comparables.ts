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

/** Benchmarks fitness Paris / industrie SaaS-fitness. Sources publiques. */
export const SECTOR_BENCHMARKS = {
  // Prix abos CrossFit Paris
  monthlyPriceCrossfit: { low: 130, high: 220, source: "Reebok Crossfit Louvre, Train Yard, CrossFit RG (sites publics 2024)" },
  // Salles fitness classiques
  monthlyPriceClassicGym: { low: 30, high: 60, source: "Basic Fit, Neoness, On Air (catalogues 2024)" },
  // CAC fitness B2C
  cacFitness: { low: 80, high: 150, source: "Étude IHRSA 2023, secteur fitness FR" },
  // Churn mensuel
  churnFitnessChain: { low: 0.03, high: 0.05, source: "IHRSA EU 2023" },
  churnCrossfitCommunity: { low: 0.015, high: 0.03, source: "CrossFit affiliate survey" },
  // Marges EBITDA fitness
  ebitdaMarginCrossfit: { low: 0.15, high: 0.25, source: "Étude Xerfi fitness FR 2023" },
  ebitdaMarginGym: { low: 0.20, high: 0.30, source: "Annual reports Basic Fit, Planet Fitness" },
  // LTV
  ltvCrossfitMonths: { low: 24, high: 36, source: "Cohort retention CrossFit affiliates" },
  // Capacité par cours
  classCapacityCrossfit: { low: 12, high: 16, source: "CrossFit HQ programming guidelines" },
  // Membres actifs box mature
  membersMatureCrossfit: { low: 250, high: 450, source: "CrossFit affiliate census 2023" },
  // Loyer m² Paris zone tendue
  rentPerSqmParisYear: { low: 350, high: 700, source: "BNP Paribas Real Estate, indices 2024" },
  // Taux IS
  isRateFR: { low: 0.15, high: 0.25, source: "Code général des impôts FR" },
  // Multiple EBITDA fitness
  multipleEbitdaFitness: { low: 4, high: 6, source: "M&A studies: Pitchbook fitness 2023" },
  // Marketing en % du CA, secteur fitness club
  marketingPctOfRevenueFitness: { low: 0.015, high: 0.03, source: "IHRSA Industry Profile fitness club" },
};

export type SectorBenchmarkKey = keyof typeof SECTOR_BENCHMARKS;
