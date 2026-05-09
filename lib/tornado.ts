import { computeModel } from "./model/compute";
import type { ModelParams } from "./model/types";
import {
  SENSITIVITY_BOUNDS,
  clampBound,
  DEFAULT_MAX_OPENING_DELAY_MONTHS,
} from "./sensitivity-bounds";

/**
 * Tornado / one-at-a-time sensitivity.
 *
 * Pour chaque driver, on évalue le modèle 2 fois (-shockPct, +shockPct) et on mesure
 * l'écart d'une métrique cible (ex EBITDA dernier FY, cash trough, break-even).
 * Trie les drivers par amplitude d'impact décroissante. C'est la décomposition
 * incontournable d'une analyse de sensibilité — révèle les leviers principaux.
 */

export type TornadoMetric =
  | "ebitdaLastFy"
  | "ebitdaMarginLastFy"
  | "cashTrough"
  | "cashEndLastFy"
  | "breakEvenMonth"
  | "netIncomeLastFy"
  | "irr5y";

export type TornadoDriverConfig = {
  id: string;
  label: string;
  enabled: boolean;
};

export const TORNADO_DRIVERS: TornadoDriverConfig[] = [
  { id: "subsGrowth", label: "Croissance abos", enabled: true },
  { id: "rampEnd", label: "Ramp-up final", enabled: true },
  { id: "priceIndex", label: "Indexation prix", enabled: true },
  { id: "churn", label: "Churn mensuel", enabled: true },
  { id: "mixPremiumShift", label: "Mix premium", enabled: true },
  { id: "conversionBilan", label: "Conversion bilan", enabled: true },
  { id: "capacityPerClass", label: "Capacité/cours", enabled: true },
  { id: "parallelClasses", label: "Cours parallèles", enabled: true },
  { id: "salaryIndex", label: "Indexation salaires", enabled: true },
  { id: "chargesPatro", label: "Charges patronales", enabled: true },
  { id: "marketing", label: "Budget marketing", enabled: true },
  { id: "rent", label: "Loyer", enabled: true },
  { id: "isRate", label: "Taux IS", enabled: true },
  { id: "loanRate", label: "Taux emprunts", enabled: true },
  { id: "openingDelay", label: "Retard ouverture (3 mois)", enabled: true },
];

export type TornadoBar = {
  id: string;
  label: string;
  baseValue: number;
  lowValue: number;       // métrique avec choc négatif
  highValue: number;      // métrique avec choc positif
  lowDelta: number;       // lowValue - baseValue
  highDelta: number;      // highValue - baseValue
  range: number;          // |highDelta - lowDelta| → amplitude totale
};

export type TornadoConfig = {
  shockPct: number;       // ex 0.10 = ±10%
  metric: TornadoMetric;
  /**
   * Mois max de retard d'ouverture utilisés par le driver `openingDelay`.
   * À shock positif (+shockPct), on applique ce nombre de mois de retard ;
   * à shock négatif, l'ouverture est considérée à l'heure (0 mois).
   * Default = DEFAULT_MAX_OPENING_DELAY_MONTHS pour rester aligné avec Monte Carlo.
   */
  maxOpeningDelayMonths?: number;
};

function applyShock(p: ModelParams, driverId: string, shock: number, maxOpeningDelayMonths: number): ModelParams {
  const out: ModelParams = structuredClone(p);
  const factor = 1 + shock;
  switch (driverId) {
    case "subsGrowth":
      if (out.subs.growthRates) {
        out.subs.growthRates = out.subs.growthRates.map((g) => clampBound(g * factor, SENSITIVITY_BOUNDS.subsGrowth));
      }
      break;
    case "rampEnd":
      out.subs.rampEndCount = Math.max(out.subs.rampStartCount, out.subs.rampEndCount * factor);
      break;
    case "priceIndex":
      out.subs.priceIndexPa = clampBound(out.subs.priceIndexPa * factor, SENSITIVITY_BOUNDS.priceIndexPa);
      break;
    case "churn":
      if (out.subs.monthlyChurnPct !== undefined) {
        out.subs.monthlyChurnPct = clampBound(out.subs.monthlyChurnPct * factor, SENSITIVITY_BOUNDS.monthlyChurnPct);
      }
      break;
    case "mixPremiumShift": {
      if (out.subs.tiers.length < 2) break;
      const sorted = [...out.subs.tiers].sort((a, b) => a.monthlyPrice - b.monthlyPrice);
      const cheap = sorted[0];
      const premium = sorted[sorted.length - 1];
      const delta = shock * 0.5; // shock 10% → bascule 5pts de mix
      const cheapInModel = out.subs.tiers.find((t) => t.id === cheap.id)!;
      const premiumInModel = out.subs.tiers.find((t) => t.id === premium.id)!;
      const realShift = Math.max(-cheapInModel.mixPct, Math.min(premiumInModel.mixPct, delta));
      cheapInModel.mixPct = Math.max(0, Math.min(1, cheapInModel.mixPct - realShift));
      premiumInModel.mixPct = Math.max(0, Math.min(1, premiumInModel.mixPct + realShift));
      break;
    }
    case "conversionBilan":
      if (out.subs.bilanFunnel?.enabled) {
        out.subs.bilanFunnel.conversionPct = clampBound(out.subs.bilanFunnel.conversionPct * factor, SENSITIVITY_BOUNDS.conversionPct);
      }
      break;
    case "capacityPerClass":
      if (out.capacity) {
        out.capacity.capacityPerClass = Math.max(SENSITIVITY_BOUNDS.capacityPerClass.min, out.capacity.capacityPerClass * factor);
      }
      break;
    case "parallelClasses":
      if (out.capacity) {
        out.capacity.parallelClasses = Math.max(SENSITIVITY_BOUNDS.parallelClasses.min, Math.round(out.capacity.parallelClasses * factor));
      }
      break;
    case "salaryIndex":
      out.salaries.annualIndexPa = clampBound(out.salaries.annualIndexPa * factor, SENSITIVITY_BOUNDS.salaryIndexPa);
      break;
    case "chargesPatro":
      out.salaries.chargesPatroPct = clampBound(out.salaries.chargesPatroPct * factor, SENSITIVITY_BOUNDS.chargesPatroPct);
      break;
    case "marketing":
      out.marketing.monthlyBudget = Math.max(SENSITIVITY_BOUNDS.marketingMonthly.min, out.marketing.monthlyBudget * factor);
      break;
    case "rent":
      out.rent.monthlyByFy = out.rent.monthlyByFy.map((v) => Math.max(SENSITIVITY_BOUNDS.rentMonthly.min, v * factor));
      break;
    case "isRate":
      out.tax.isRate = clampBound(out.tax.isRate * factor, SENSITIVITY_BOUNDS.isRate);
      break;
    case "loanRate":
      if (Array.isArray(out.financing.loans)) {
        out.financing.loans = out.financing.loans.map((l) => ({
          ...l,
          annualRatePct: clampBound(l.annualRatePct * factor, SENSITIVITY_BOUNDS.loanRatePct),
        }));
      }
      if (Array.isArray(out.financing.bonds)) {
        out.financing.bonds = out.financing.bonds.map((b) => ({
          ...b,
          annualRatePct: clampBound(b.annualRatePct * factor, SENSITIVITY_BOUNDS.loanRatePct),
        }));
      }
      break;
    case "openingDelay": {
      // Choc positif → retard maximal; choc négatif → ouverture à l'heure.
      // Mois de retard = max(0, shock) × maxOpeningDelayMonths, paramétrable
      // (alignement avec Monte Carlo qui tire dans [0, maxOpeningDelayMonths]).
      const months = Math.max(0, shock) * maxOpeningDelayMonths;
      const lostFraction = Math.max(0, Math.min(1, months / 12));
      out.subs.rampStartCount = out.subs.rampStartCount * (1 - lostFraction);
      out.subs.rampEndCount = out.subs.rampEndCount * (1 - lostFraction * 0.5);
      out.marketing.monthlyBudget = out.marketing.monthlyBudget * (1 - lostFraction);
      break;
    }
  }
  return out;
}

function extractMetric(result: ReturnType<typeof computeModel>, metric: TornadoMetric): number {
  const lastFy = result.yearly[result.yearly.length - 1];
  switch (metric) {
    case "ebitdaLastFy":
      return lastFy?.ebitda ?? 0;
    case "ebitdaMarginLastFy":
      return lastFy?.ebitdaMargin ?? 0;
    case "cashTrough":
      return result.cashTroughValue;
    case "cashEndLastFy":
      return lastFy?.cashEnd ?? 0;
    case "breakEvenMonth":
      // null = jamais atteint dans l'horizon → renvoie horizon+1 (pénalisé)
      return result.breakEvenMonth ?? result.horizonMonths + 1;
    case "netIncomeLastFy":
      return lastFy?.netIncome ?? 0;
    case "irr5y":
      return result.irr5y ?? -1;
  }
}

export function runTornado(
  base: ModelParams,
  drivers: TornadoDriverConfig[],
  config: TornadoConfig
): TornadoBar[] {
  const baseResult = computeModel(base);
  const baseValue = extractMetric(baseResult, config.metric);
  const shock = Math.abs(config.shockPct);
  const maxOpeningDelayMonths = config.maxOpeningDelayMonths ?? DEFAULT_MAX_OPENING_DELAY_MONTHS;

  const bars: TornadoBar[] = [];
  for (const d of drivers) {
    if (!d.enabled) continue;
    const lowParams = applyShock(base, d.id, -shock, maxOpeningDelayMonths);
    const highParams = applyShock(base, d.id, +shock, maxOpeningDelayMonths);
    const lowResult = computeModel(lowParams);
    const highResult = computeModel(highParams);
    const lowValue = extractMetric(lowResult, config.metric);
    const highValue = extractMetric(highResult, config.metric);
    const lowDelta = lowValue - baseValue;
    const highDelta = highValue - baseValue;
    bars.push({
      id: d.id,
      label: d.label,
      baseValue,
      lowValue,
      highValue,
      lowDelta,
      highDelta,
      range: Math.abs(highDelta - lowDelta),
    });
  }

  // Trie par range décroissant (drivers à plus fort impact en haut)
  bars.sort((a, b) => b.range - a.range);
  return bars;
}
