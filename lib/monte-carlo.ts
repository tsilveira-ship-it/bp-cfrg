import { computeModel } from "./model/compute";
import type { ModelParams, ModelResult } from "./model/types";

export type MCDistribution = "uniform" | "normal" | "triangular";

export type MCDriver = {
  id: string;
  label: string;
  /** Variation relative max (ex 0.2 = ±20%). */
  rangePct: number;
  enabled: boolean;
  /**
   * Catégorie d'agrégation pour corrélation (ex "inflation" → price + salary index).
   * Drivers de même catégorie partagent un facteur commun pondéré par `correlationWeight`.
   */
  category?: string;
  /** Poids du facteur commun (0..1). 0 = indépendant, 1 = entièrement piloté par le facteur commun. */
  correlationWeight?: number;
};

export const DEFAULT_DRIVERS: MCDriver[] = [
  // Demand / revenue
  { id: "subsGrowth", label: "Croissance abos (taux annuels)", rangePct: 0.20, enabled: true },
  { id: "rampEnd", label: "Ramp-up final (rampEndCount)", rangePct: 0.20, enabled: true },
  { id: "priceIndex", label: "Indexation prix abos", rangePct: 0.50, enabled: true, category: "inflation", correlationWeight: 0.6 },
  { id: "churn", label: "Churn mensuel", rangePct: 0.50, enabled: true },
  { id: "mixPremiumShift", label: "Mix premium (basculement tier)", rangePct: 0.20, enabled: false },
  { id: "conversionBilan", label: "Conversion bilan → abo", rangePct: 0.30, enabled: false },

  // Capacity (must-have)
  { id: "capacityPerClass", label: "Capacité par cours", rangePct: 0.15, enabled: false },
  { id: "parallelClasses", label: "Cours simultanés (parallèles)", rangePct: 0.25, enabled: false },

  // Costs
  { id: "salaryIndex", label: "Indexation salaires", rangePct: 0.50, enabled: true, category: "inflation", correlationWeight: 0.6 },
  { id: "chargesPatro", label: "Charges patronales", rangePct: 0.10, enabled: false },
  { id: "marketing", label: "Budget marketing", rangePct: 0.20, enabled: true },
  { id: "rent", label: "Loyer (1ère année)", rangePct: 0.10, enabled: false },

  // Tax / financing
  { id: "isRate", label: "Taux IS", rangePct: 0.20, enabled: false },
  { id: "vatRate", label: "Taux TVA", rangePct: 0.10, enabled: false },
  { id: "loanRate", label: "Taux d'intérêt emprunts", rangePct: 0.30, enabled: false },

  // Timing
  { id: "openingDelay", label: "Retard d'ouverture (mois)", rangePct: 1.0, enabled: false },
];

export type MCConfig = {
  nSimulations: number;
  drivers: MCDriver[];
  seed: number;
  /** Distribution des chocs. Default uniform (backwards-compat). */
  distribution?: MCDistribution;
  /** Active corrélation par catégorie (default true). */
  enableCorrelation?: boolean;
  /** Retard d'ouverture max en mois (default 6). Le driver `openingDelay` tire dans [0, max]. */
  maxOpeningDelayMonths?: number;
};

export type MCSampleResult = {
  yearlyEbitda: number[];
  yearlyEbitdaMargin: number[];
  yearlyNetIncome: number[];
  cashTrough: number;
  cashPeakNeed: number;       // pic de besoin de financement = max(-cashBalance, 0) sur l'horizon
  breakEvenMonth: number | null;
  finalCash: number;
  irr5y: number | null;
};

export type MCAggregate = {
  count: number;
  yearlyEbitdaP10: number[];
  yearlyEbitdaP50: number[];
  yearlyEbitdaP90: number[];
  yearlyEbitdaMarginP10: number[];
  yearlyEbitdaMarginP50: number[];
  yearlyEbitdaMarginP90: number[];
  yearlyNetIncomeP10: number[];
  yearlyNetIncomeP50: number[];
  yearlyNetIncomeP90: number[];
  cashTroughP10: number;
  cashTroughP50: number;
  cashTroughP90: number;
  /** VaR 5% sur cashTrough = quantile 5% (perte plancher avec 95% confiance). */
  cashTroughVaR5: number;
  /** CVaR 5% = espérance conditionnelle dans le pire 5% (Expected Shortfall). */
  cashTroughCVaR5: number;
  /** Pic de besoin de financement médian + P90. */
  cashPeakNeedP50: number;
  cashPeakNeedP90: number;
  finalCashP10: number;
  finalCashP50: number;
  finalCashP90: number;
  breakEvenP50: number | null;
  breakEvenP10: number | null;
  breakEvenP90: number | null;
  pctBreakEven: number;
  pctBreakEvenBeforeFy3: number;  // % sims atteignant break-even avant fin FY3
  pctCashNegative: number;
  irrP10: number | null;
  irrP50: number | null;
  irrP90: number | null;
  fyLabels: string[];
  histogram: HistogramBin[];
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

/** Box-Muller : tire N(0,1) à partir de 2 uniformes. */
function gaussian(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Tirage triangulaire centré sur 0, support [-1, 1]. */
function triangular(rng: () => number): number {
  return rng() - rng();
}

/**
 * Tire un facteur multiplicatif autour de 1 selon la distribution choisie.
 * `commonShock` (∈ [-1, 1]) : composante commune de catégorie ; combinée à un résidu propre
 * via `correlationWeight`. Si non corrélé, le résidu fait tout le travail.
 */
function jitter(
  rng: () => number,
  rangePct: number,
  distribution: MCDistribution,
  commonShock: number,
  correlationWeight: number
): number {
  let raw: number;
  switch (distribution) {
    case "normal":
      // Gaussien tronqué à ±2σ ; on mappe σ = rangePct/2 pour que ±2σ ≈ ±rangePct
      raw = Math.max(-1, Math.min(1, gaussian(rng) / 2));
      break;
    case "triangular":
      raw = triangular(rng);
      break;
    case "uniform":
    default:
      raw = rng() * 2 - 1;
      break;
  }
  const w = Math.max(0, Math.min(1, correlationWeight));
  // Mélange linéaire ; variance ≈ w² + (1-w)² (légère sous-dispersion mais OK en MC d'application)
  const mixed = w * commonShock + (1 - w) * raw;
  return 1 + mixed * rangePct;
}

/** Clamp générique. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function sampleParams(
  base: ModelParams,
  drivers: MCDriver[],
  rng: () => number,
  distribution: MCDistribution,
  enableCorrelation: boolean,
  maxOpeningDelayMonths: number
): { params: ModelParams; openingDelay: number } {
  const p: ModelParams = structuredClone(base);
  const enabled = new Set(drivers.filter((d) => d.enabled).map((d) => d.id));
  const get = (id: string) => drivers.find((d) => d.id === id);

  // Pré-tirage des facteurs communs par catégorie (corrélation simple)
  const commonByCategory = new Map<string, number>();
  if (enableCorrelation) {
    const categories = new Set(
      drivers
        .filter((d) => d.enabled && d.category)
        .map((d) => d.category as string)
    );
    for (const cat of categories) {
      let shock: number;
      switch (distribution) {
        case "normal":
          shock = clamp(gaussian(rng) / 2, -1, 1);
          break;
        case "triangular":
          shock = triangular(rng);
          break;
        default:
          shock = rng() * 2 - 1;
      }
      commonByCategory.set(cat, shock);
    }
  }
  const getCommonShock = (d: MCDriver) =>
    enableCorrelation && d.category ? commonByCategory.get(d.category) ?? 0 : 0;
  const getWeight = (d: MCDriver) =>
    enableCorrelation && d.category ? d.correlationWeight ?? 0 : 0;

  const tirer = (id: string): number => {
    const d = get(id)!;
    return jitter(rng, d.rangePct, distribution, getCommonShock(d), getWeight(d));
  };

  // ───────── Demand / revenue ─────────
  if (enabled.has("subsGrowth") && p.subs.growthRates) {
    // Tirage indépendant par FY (random walk) au lieu d'un facteur commun
    const r = get("subsGrowth")!.rangePct;
    p.subs.growthRates = p.subs.growthRates.map((g) => {
      const f = jitter(rng, r, distribution, 0, 0);
      return clamp(g * f, -0.5, 5);
    });
  }
  if (enabled.has("rampEnd")) {
    const f = tirer("rampEnd");
    p.subs.rampEndCount = Math.max(p.subs.rampStartCount, p.subs.rampEndCount * f);
  }
  if (enabled.has("priceIndex")) {
    p.subs.priceIndexPa = clamp(p.subs.priceIndexPa * tirer("priceIndex"), -0.1, 0.5);
  }
  if (enabled.has("churn") && p.subs.monthlyChurnPct !== undefined) {
    p.subs.monthlyChurnPct = clamp(p.subs.monthlyChurnPct * tirer("churn"), 0, 0.5);
  }
  if (enabled.has("mixPremiumShift") && p.subs.tiers.length >= 2) {
    // Bascule un % de mix du tier le moins cher vers le plus cher
    const f = tirer("mixPremiumShift") - 1; // delta multiplicateur en pts
    const sorted = [...p.subs.tiers].sort((a, b) => a.monthlyPrice - b.monthlyPrice);
    const cheap = sorted[0];
    const premium = sorted[sorted.length - 1];
    const shift = clamp(f * 0.5, -cheap.mixPct, premium.mixPct); // borne par stocks mix
    const cheapInModel = p.subs.tiers.find((t) => t.id === cheap.id)!;
    const premiumInModel = p.subs.tiers.find((t) => t.id === premium.id)!;
    cheapInModel.mixPct = clamp(cheapInModel.mixPct - shift, 0, 1);
    premiumInModel.mixPct = clamp(premiumInModel.mixPct + shift, 0, 1);
  }
  if (enabled.has("conversionBilan") && p.subs.bilanFunnel?.enabled) {
    p.subs.bilanFunnel.conversionPct = clamp(
      p.subs.bilanFunnel.conversionPct * tirer("conversionBilan"),
      0,
      1
    );
  }

  // ───────── Capacity ─────────
  if (enabled.has("capacityPerClass") && p.capacity) {
    p.capacity.capacityPerClass = Math.max(1, p.capacity.capacityPerClass * tirer("capacityPerClass"));
  }
  if (enabled.has("parallelClasses") && p.capacity) {
    p.capacity.parallelClasses = Math.max(1, Math.round(p.capacity.parallelClasses * tirer("parallelClasses")));
  }

  // ───────── Costs ─────────
  if (enabled.has("salaryIndex")) {
    p.salaries.annualIndexPa = clamp(p.salaries.annualIndexPa * tirer("salaryIndex"), -0.05, 0.3);
  }
  if (enabled.has("chargesPatro")) {
    p.salaries.chargesPatroPct = clamp(p.salaries.chargesPatroPct * tirer("chargesPatro"), 0, 1);
  }
  if (enabled.has("marketing")) {
    p.marketing.monthlyBudget = Math.max(0, p.marketing.monthlyBudget * tirer("marketing"));
  }
  if (enabled.has("rent") && p.rent.monthlyByFy.length > 0) {
    const f = tirer("rent");
    p.rent.monthlyByFy = p.rent.monthlyByFy.map((v) => Math.max(0, v * f));
  }

  // ───────── Tax / financing ─────────
  if (enabled.has("isRate")) {
    p.tax.isRate = clamp(p.tax.isRate * tirer("isRate"), 0, 0.5);
  }
  if (enabled.has("vatRate")) {
    p.subs.vatRate = clamp(p.subs.vatRate * tirer("vatRate"), 0, 0.4);
  }
  if (enabled.has("loanRate") && p.financing) {
    const f = tirer("loanRate");
    if (Array.isArray(p.financing.loans)) {
      p.financing.loans = p.financing.loans.map((l) => ({
        ...l,
        annualRatePct: clamp(l.annualRatePct * f, 0, 25),
      }));
    }
    if (Array.isArray(p.financing.bonds)) {
      p.financing.bonds = p.financing.bonds.map((b) => ({
        ...b,
        annualRatePct: clamp(b.annualRatePct * f, 0, 25),
      }));
    }
  }

  // ───────── Timing ─────────
  let openingDelay = 0;
  if (enabled.has("openingDelay")) {
    // rangePct utilisé comme coefficient d'amplitude ; tirage uniforme positif [0, max]
    const u = rng();
    openingDelay = Math.round(u * maxOpeningDelayMonths);
    if (openingDelay > 0) {
      // Décale ramp + revenue + dépenses variables d'autant : on shift les arrays "monthlyByFy"-style indirectement.
      // Approche pragmatique : on réduit la trajectoire en abaissant rampStart/rampEnd proportionnellement
      // à la fraction du FY perdue, et on multiplie marketing budget par fraction restante du premier FY.
      const lostFraction = clamp(openingDelay / 12, 0, 1);
      p.subs.rampStartCount = p.subs.rampStartCount * (1 - lostFraction);
      p.subs.rampEndCount = p.subs.rampEndCount * (1 - lostFraction * 0.5);
      // Marketing payé seulement sur la fraction ouverte
      p.marketing.monthlyBudget = p.marketing.monthlyBudget * (1 - lostFraction);
    }
  }

  return { params: p, openingDelay };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

/** Expected Shortfall (CVaR) : moyenne des q% pires (queue gauche). */
function cvar(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const cut = Math.max(1, Math.floor(q * sorted.length));
  let sum = 0;
  for (let i = 0; i < cut; i++) sum += sorted[i];
  return sum / cut;
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
  const distribution: MCDistribution = config.distribution ?? "uniform";
  const enableCorrelation = config.enableCorrelation ?? true;
  const maxOpeningDelayMonths = config.maxOpeningDelayMonths ?? 6;
  const samples: MCSampleResult[] = [];
  let firstResult: ModelResult | null = null;

  for (let i = 0; i < config.nSimulations; i++) {
    const { params: sampled } = sampleParams(
      base,
      config.drivers,
      rng,
      distribution,
      enableCorrelation,
      maxOpeningDelayMonths
    );
    const result = computeModel(sampled);
    if (i === 0) firstResult = result;

    // Pic de besoin de financement = max(-cashBalance, 0) sur tous les mois
    let peakNeed = 0;
    for (const m of result.monthly) {
      if (m.cashBalance < 0) peakNeed = Math.max(peakNeed, -m.cashBalance);
    }

    samples.push({
      yearlyEbitda: result.yearly.map((y) => y.ebitda),
      yearlyEbitdaMargin: result.yearly.map((y) => y.ebitdaMargin),
      yearlyNetIncome: result.yearly.map((y) => y.netIncome),
      cashTrough: result.cashTroughValue,
      cashPeakNeed: peakNeed,
      breakEvenMonth: result.breakEvenMonth,
      finalCash: result.yearly[result.yearly.length - 1]?.cashEnd ?? 0,
      irr5y: result.irr5y,
    });
  }

  const Y = firstResult?.yearly.length ?? 0;
  const yearlyEbitdaP10: number[] = [];
  const yearlyEbitdaP50: number[] = [];
  const yearlyEbitdaP90: number[] = [];
  const yearlyEbitdaMarginP10: number[] = [];
  const yearlyEbitdaMarginP50: number[] = [];
  const yearlyEbitdaMarginP90: number[] = [];
  const yearlyNetIncomeP10: number[] = [];
  const yearlyNetIncomeP50: number[] = [];
  const yearlyNetIncomeP90: number[] = [];

  for (let fy = 0; fy < Y; fy++) {
    const ebitdas = samples.map((s) => s.yearlyEbitda[fy]).sort((a, b) => a - b);
    const margins = samples.map((s) => s.yearlyEbitdaMargin[fy]).sort((a, b) => a - b);
    const nets = samples.map((s) => s.yearlyNetIncome[fy]).sort((a, b) => a - b);
    yearlyEbitdaP10.push(percentile(ebitdas, 0.1));
    yearlyEbitdaP50.push(percentile(ebitdas, 0.5));
    yearlyEbitdaP90.push(percentile(ebitdas, 0.9));
    yearlyEbitdaMarginP10.push(percentile(margins, 0.1));
    yearlyEbitdaMarginP50.push(percentile(margins, 0.5));
    yearlyEbitdaMarginP90.push(percentile(margins, 0.9));
    yearlyNetIncomeP10.push(percentile(nets, 0.1));
    yearlyNetIncomeP50.push(percentile(nets, 0.5));
    yearlyNetIncomeP90.push(percentile(nets, 0.9));
  }

  const cashTroughs = samples.map((s) => s.cashTrough).sort((a, b) => a - b);
  const finalCashes = samples.map((s) => s.finalCash).sort((a, b) => a - b);
  const peakNeeds = samples.map((s) => s.cashPeakNeed).sort((a, b) => a - b);
  const breakEvenMonths = samples
    .map((s) => s.breakEvenMonth)
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const irrs = samples
    .map((s) => s.irr5y)
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);

  const finalEbitdas = samples.map((s) => s.yearlyEbitda[Y - 1] ?? 0);
  const histogram = buildHistogram(finalEbitdas, 20);

  // Break-even avant fin FY3 = month < 36 (3 ans)
  const fy3Cutoff = 36;
  const pctBreakEvenBeforeFy3 = breakEvenMonths.filter((m) => m < fy3Cutoff).length / samples.length;

  return {
    count: samples.length,
    yearlyEbitdaP10,
    yearlyEbitdaP50,
    yearlyEbitdaP90,
    yearlyEbitdaMarginP10,
    yearlyEbitdaMarginP50,
    yearlyEbitdaMarginP90,
    yearlyNetIncomeP10,
    yearlyNetIncomeP50,
    yearlyNetIncomeP90,
    cashTroughP10: percentile(cashTroughs, 0.1),
    cashTroughP50: percentile(cashTroughs, 0.5),
    cashTroughP90: percentile(cashTroughs, 0.9),
    cashTroughVaR5: percentile(cashTroughs, 0.05),
    cashTroughCVaR5: cvar(cashTroughs, 0.05),
    cashPeakNeedP50: percentile(peakNeeds, 0.5),
    cashPeakNeedP90: percentile(peakNeeds, 0.9),
    finalCashP10: percentile(finalCashes, 0.1),
    finalCashP50: percentile(finalCashes, 0.5),
    finalCashP90: percentile(finalCashes, 0.9),
    breakEvenP50: breakEvenMonths.length > 0 ? percentile(breakEvenMonths, 0.5) : null,
    breakEvenP10: breakEvenMonths.length > 0 ? percentile(breakEvenMonths, 0.1) : null,
    breakEvenP90: breakEvenMonths.length > 0 ? percentile(breakEvenMonths, 0.9) : null,
    pctBreakEven: breakEvenMonths.length / samples.length,
    pctBreakEvenBeforeFy3,
    pctCashNegative: samples.filter((s) => s.cashTrough < 0).length / samples.length,
    irrP10: irrs.length > 0 ? percentile(irrs, 0.1) : null,
    irrP50: irrs.length > 0 ? percentile(irrs, 0.5) : null,
    irrP90: irrs.length > 0 ? percentile(irrs, 0.9) : null,
    fyLabels: firstResult?.fyLabels ?? [],
    histogram,
  };
}
