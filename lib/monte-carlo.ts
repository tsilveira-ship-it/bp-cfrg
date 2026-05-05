import { computeModel } from "./model/compute";
import type { ModelParams, ModelResult } from "./model/types";

export type MCDriver = {
  id: string;
  label: string;
  /** Variation relative max (ex 0.2 = ±20%). */
  rangePct: number;
  enabled: boolean;
};

export const DEFAULT_DRIVERS: MCDriver[] = [
  { id: "subsGrowth", label: "Croissance abos (taux annuels)", rangePct: 0.20, enabled: true },
  { id: "rampEnd", label: "Ramp-up final (rampEndCount)", rangePct: 0.20, enabled: true },
  { id: "priceIndex", label: "Indexation prix abos", rangePct: 0.50, enabled: true },
  { id: "churn", label: "Churn mensuel", rangePct: 0.50, enabled: true },
  { id: "salaryIndex", label: "Indexation salaires", rangePct: 0.50, enabled: true },
  { id: "marketing", label: "Budget marketing", rangePct: 0.20, enabled: true },
  { id: "rent", label: "Loyer (1ère année)", rangePct: 0.10, enabled: false },
  { id: "vatRate", label: "Taux TVA", rangePct: 0.10, enabled: false },
];

export type MCConfig = {
  nSimulations: number;
  drivers: MCDriver[];
  seed: number;
};

export type MCSampleResult = {
  yearlyEbitda: number[];
  yearlyNetIncome: number[];
  cashTrough: number;
  breakEvenMonth: number | null;
  finalCash: number;
};

export type MCAggregate = {
  count: number;
  yearlyEbitdaP10: number[];
  yearlyEbitdaP50: number[];
  yearlyEbitdaP90: number[];
  yearlyNetIncomeP10: number[];
  yearlyNetIncomeP50: number[];
  yearlyNetIncomeP90: number[];
  cashTroughP10: number;
  cashTroughP50: number;
  cashTroughP90: number;
  finalCashP10: number;
  finalCashP50: number;
  finalCashP90: number;
  breakEvenP50: number | null;
  pctBreakEven: number;     // % de simulations où break-even atteint dans l'horizon
  pctCashNegative: number;  // % où tréso passe sous 0
  fyLabels: string[];
  histogram: HistogramBin[]; // sur EBITDA dernière année
};

export type HistogramBin = {
  min: number;
  max: number;
  count: number;
};

/** PRNG mulberry32 seedable, déterministe. */
function makeRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tire un facteur uniforme dans [1-rangePct, 1+rangePct]. */
function jitter(rng: () => number, rangePct: number): number {
  return 1 + (rng() * 2 - 1) * rangePct;
}

function sampleParams(base: ModelParams, drivers: MCDriver[], rng: () => number): ModelParams {
  const p: ModelParams = structuredClone(base);
  const enabled = new Set(drivers.filter((d) => d.enabled).map((d) => d.id));
  const get = (id: string) => drivers.find((d) => d.id === id);

  if (enabled.has("subsGrowth") && p.subs.growthRates) {
    const r = get("subsGrowth")!.rangePct;
    p.subs.growthRates = p.subs.growthRates.map((g) => g * jitter(rng, r));
  }
  if (enabled.has("rampEnd")) {
    const r = get("rampEnd")!.rangePct;
    p.subs.rampEndCount = p.subs.rampEndCount * jitter(rng, r);
  }
  if (enabled.has("priceIndex")) {
    const r = get("priceIndex")!.rangePct;
    p.subs.priceIndexPa = p.subs.priceIndexPa * jitter(rng, r);
  }
  if (enabled.has("churn") && p.subs.monthlyChurnPct !== undefined) {
    const r = get("churn")!.rangePct;
    p.subs.monthlyChurnPct = Math.max(0, p.subs.monthlyChurnPct * jitter(rng, r));
  }
  if (enabled.has("salaryIndex")) {
    const r = get("salaryIndex")!.rangePct;
    p.salaries.annualIndexPa = p.salaries.annualIndexPa * jitter(rng, r);
  }
  if (enabled.has("marketing")) {
    const r = get("marketing")!.rangePct;
    p.marketing.monthlyBudget = p.marketing.monthlyBudget * jitter(rng, r);
  }
  if (enabled.has("rent") && p.rent.monthlyByFy.length > 0) {
    const r = get("rent")!.rangePct;
    const factor = jitter(rng, r);
    p.rent.monthlyByFy = p.rent.monthlyByFy.map((v) => v * factor);
  }
  if (enabled.has("vatRate")) {
    const r = get("vatRate")!.rangePct;
    p.subs.vatRate = p.subs.vatRate * jitter(rng, r);
  }

  return p;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

function buildHistogram(values: number[], bins = 20): HistogramBin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ min, max, count: values.length }];
  const step = (max - min) / bins;
  const out: HistogramBin[] = [];
  for (let i = 0; i < bins; i++) {
    out.push({ min: min + step * i, max: min + step * (i + 1), count: 0 });
  }
  for (const v of values) {
    const i = Math.min(bins - 1, Math.floor((v - min) / step));
    out[i].count++;
  }
  return out;
}

export function runMonteCarlo(base: ModelParams, config: MCConfig): MCAggregate {
  const rng = makeRng(config.seed);
  const samples: MCSampleResult[] = [];
  let firstResult: ModelResult | null = null;

  for (let i = 0; i < config.nSimulations; i++) {
    const sampled = sampleParams(base, config.drivers, rng);
    const result = computeModel(sampled);
    if (i === 0) firstResult = result;
    samples.push({
      yearlyEbitda: result.yearly.map((y) => y.ebitda),
      yearlyNetIncome: result.yearly.map((y) => y.netIncome),
      cashTrough: result.cashTroughValue,
      breakEvenMonth: result.breakEvenMonth,
      finalCash: result.yearly[result.yearly.length - 1]?.cashEnd ?? 0,
    });
  }

  const Y = firstResult?.yearly.length ?? 0;
  const yearlyEbitdaP10: number[] = [];
  const yearlyEbitdaP50: number[] = [];
  const yearlyEbitdaP90: number[] = [];
  const yearlyNetIncomeP10: number[] = [];
  const yearlyNetIncomeP50: number[] = [];
  const yearlyNetIncomeP90: number[] = [];

  for (let fy = 0; fy < Y; fy++) {
    const ebitdas = samples.map((s) => s.yearlyEbitda[fy]).sort((a, b) => a - b);
    const nets = samples.map((s) => s.yearlyNetIncome[fy]).sort((a, b) => a - b);
    yearlyEbitdaP10.push(percentile(ebitdas, 0.10));
    yearlyEbitdaP50.push(percentile(ebitdas, 0.50));
    yearlyEbitdaP90.push(percentile(ebitdas, 0.90));
    yearlyNetIncomeP10.push(percentile(nets, 0.10));
    yearlyNetIncomeP50.push(percentile(nets, 0.50));
    yearlyNetIncomeP90.push(percentile(nets, 0.90));
  }

  const cashTroughs = samples.map((s) => s.cashTrough).sort((a, b) => a - b);
  const finalCashes = samples.map((s) => s.finalCash).sort((a, b) => a - b);
  const breakEvenMonths = samples
    .map((s) => s.breakEvenMonth)
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);

  const finalEbitdas = samples.map((s) => s.yearlyEbitda[Y - 1] ?? 0);
  const histogram = buildHistogram(finalEbitdas, 20);

  return {
    count: samples.length,
    yearlyEbitdaP10,
    yearlyEbitdaP50,
    yearlyEbitdaP90,
    yearlyNetIncomeP10,
    yearlyNetIncomeP50,
    yearlyNetIncomeP90,
    cashTroughP10: percentile(cashTroughs, 0.10),
    cashTroughP50: percentile(cashTroughs, 0.50),
    cashTroughP90: percentile(cashTroughs, 0.90),
    finalCashP10: percentile(finalCashes, 0.10),
    finalCashP50: percentile(finalCashes, 0.50),
    finalCashP90: percentile(finalCashes, 0.90),
    breakEvenP50: breakEvenMonths.length > 0 ? percentile(breakEvenMonths, 0.50) : null,
    pctBreakEven: breakEvenMonths.length / samples.length,
    pctCashNegative: samples.filter((s) => s.cashTrough < 0).length / samples.length,
    fyLabels: firstResult?.fyLabels ?? [],
    histogram,
  };
}
