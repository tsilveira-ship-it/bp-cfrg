import type { ModelParams } from "./model/types";

/**
 * Inventaire des paramètres — aplatit `ModelParams` en leaf-paths exploitables
 * pour l'audit individuel (livrable A du plan d'audit param-par-param).
 *
 * Chaque entrée représente UNE valeur scalaire (number/boolean/string) ou un
 * petit array primitif (ex saisonnalité 12 mois). Les sous-objets entité
 * (shareholders, dilutionEvents, actuals, fieldNotes...) sont volontairement
 * traités comme "metadata" et non explosés — ce ne sont pas des paramètres
 * du modèle financier au sens BP investisseur.
 */

export type ParamCategory =
  | "timeline"
  | "revenue.subscriptions"
  | "revenue.legacy"
  | "revenue.prestations"
  | "revenue.merch"
  | "revenue.acquisition"
  | "costs.salaries"
  | "costs.rent"
  | "costs.recurring"
  | "costs.oneoff"
  | "costs.marketing"
  | "costs.provisions"
  | "capex"
  | "financing.equity"
  | "financing.loans"
  | "financing.bonds"
  | "tax"
  | "bfr"
  | "captable"
  | "capacity"
  | "thresholds.audit"
  | "thresholds.investor"
  | "benchmarks"
  | "stress"
  | "montecarlo"
  | "heuristics"
  | "cash"
  | "metadata";

export type ParamValueType =
  | "number"
  | "boolean"
  | "string"
  | "number[]"
  | "object[]"
  | "object";

export type ParamInventoryEntry = {
  /** Chemin dot-notation, ex `subs.tiers[0].monthlyPrice`. */
  path: string;
  /** Valeur observée dans le scénario fourni. */
  value: unknown;
  /** Type technique pour l'UI / les bornes. */
  type: ParamValueType;
  /** Catégorie business pour regroupement. */
  category: ParamCategory;
  /** Vrai si le paramètre est purement métadonnée (notes, validations, etc.). */
  isMetadata: boolean;
};

/**
 * Préfixes de paths considérés comme métadonnées (non exposés dans l'audit BP).
 * Ils sont quand même listés mais flag isMetadata=true.
 */
const METADATA_PREFIXES = [
  "notes",
  "fieldNotes",
  "fieldQA",
  "fieldValidations",
  "actuals",
];

/**
 * Catégorisation des chemins racine. Ordre = première correspondance gagne.
 * Un path qui ne matche aucune règle tombe en "metadata".
 */
const CATEGORY_RULES: Array<[RegExp, ParamCategory]> = [
  [/^timeline\./, "timeline"],
  [/^subs\.tiers/, "revenue.subscriptions"],
  [/^subs\.bilanFunnel/, "revenue.acquisition"],
  [/^subs\.acquisitionChannels/, "revenue.acquisition"],
  [/^subs\.cohortModel/, "revenue.acquisition"],
  [/^subs\./, "revenue.subscriptions"],
  [/^legacy\./, "revenue.legacy"],
  [/^prestations\./, "revenue.prestations"],
  [/^merch\./, "revenue.merch"],
  [/^salaries\./, "costs.salaries"],
  [/^rent\./, "costs.rent"],
  [/^recurring\[/, "costs.recurring"],
  [/^oneOffs\[/, "costs.oneoff"],
  [/^marketing\./, "costs.marketing"],
  [/^provisions\./, "costs.provisions"],
  [/^capex(\.|Items)/, "capex"],
  [/^financing\.equity/, "financing.equity"],
  [/^financing\.loans/, "financing.loans"],
  [/^financing\.bonds/, "financing.bonds"],
  [/^financing\./, "financing.equity"],
  [/^tax\./, "tax"],
  [/^bfr\./, "bfr"],
  [/^capTable\./, "captable"],
  [/^capacity\./, "capacity"],
  [/^auditThresholds\./, "thresholds.audit"],
  [/^investorAssumptions\./, "thresholds.investor"],
  [/^sectorBenchmarks\./, "benchmarks"],
  [/^stressScenarios/, "stress"],
  [/^mcDefaults\./, "montecarlo"],
  [/^capacityHeuristics\./, "heuristics"],
  [/^openingCash$/, "cash"],
];

function categorize(path: string): ParamCategory {
  for (const [re, cat] of CATEGORY_RULES) {
    if (re.test(path)) return cat;
  }
  return "metadata";
}

function isMetadataPath(path: string): boolean {
  return METADATA_PREFIXES.some((p) => path === p || path.startsWith(p + ".") || path.startsWith(p + "["));
}

function typeOf(v: unknown): ParamValueType {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "string") return "string";
  if (Array.isArray(v)) {
    if (v.length > 0 && typeof v[0] === "number") return "number[]";
    return "object[]";
  }
  return "object";
}

/**
 * Indique si une valeur doit être traitée comme leaf (pas explosée davantage).
 * Un array de primitives → leaf. Un array d'objets → on explose.
 * Un objet → on explose (sauf métadonnées entités gérées par l'appelant).
 */
function isLeaf(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v !== "object") return true;
  if (Array.isArray(v)) {
    return v.length === 0 || typeof v[0] !== "object";
  }
  return false;
}

/**
 * Chemins qui doivent être traités comme leaf monolithique même si ce sont des objets/arrays.
 * Évite d'exploser des structures riches mais opaques pour l'audit BP (entités, threads, etc.).
 */
const FORCE_LEAF_PATHS = new Set<string>([
  "capTable.shareholders",
  "capTable.events",
  "capacity.areas",
  "capacity.coachAllocations",
  "capacity.personas",
  "capacity.demandHeatmap",
  "capacity.parallelByCellMatrix",
  "capacity.disciplineByCellMatrix",
  "capacity.weeklySchedule",
  "capacity.scaleByFy",
  "capacity.sessionsByTenure",
  "stressScenarios",
  "mcDefaults.driverOverrides",
  "subs.tiers[*].mixPctByFy",
  "subs.cohortModel.retentionCurve",
  "salaries.chargesProfiles",
]);

function isForcedLeaf(path: string): boolean {
  if (FORCE_LEAF_PATHS.has(path)) return true;
  // gérer les patterns avec [*]
  for (const pattern of FORCE_LEAF_PATHS) {
    if (!pattern.includes("[*]")) continue;
    const re = new RegExp("^" + pattern.replace(/\[\*\]/g, "\\[\\d+\\]") + "$");
    if (re.test(path)) return true;
  }
  return false;
}

function walk(obj: unknown, basePath: string, out: ParamInventoryEntry[]): void {
  if (obj === null || obj === undefined) return;

  if (isForcedLeaf(basePath)) {
    out.push({
      path: basePath,
      value: obj,
      type: typeOf(obj),
      category: categorize(basePath),
      isMetadata: isMetadataPath(basePath),
    });
    return;
  }

  if (isLeaf(obj)) {
    out.push({
      path: basePath,
      value: obj,
      type: typeOf(obj),
      category: categorize(basePath),
      isMetadata: isMetadataPath(basePath),
    });
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => walk(item, `${basePath}[${i}]`, out));
    return;
  }

  // Objet
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const nextPath = basePath ? `${basePath}.${key}` : key;
    walk((obj as Record<string, unknown>)[key], nextPath, out);
  }
}

/**
 * Aplatit `ModelParams` en liste exhaustive de leaf-paths.
 * Sortie triée par path pour stabilité du snapshot.
 */
export function flattenParams(p: ModelParams): ParamInventoryEntry[] {
  const out: ParamInventoryEntry[] = [];
  walk(p, "", out);
  // Tri stable alphabétique pour snapshot reproductible
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

/**
 * Compte les entrées par catégorie — utile pour rapport d'inventaire.
 */
export function countByCategory(entries: ParamInventoryEntry[]): Record<ParamCategory, number> {
  const out = {} as Record<ParamCategory, number>;
  for (const e of entries) {
    out[e.category] = (out[e.category] ?? 0) + 1;
  }
  return out;
}

/**
 * Filtre les paramètres "business" (non-métadonnées) — ceux qui doivent être
 * audités, sourcés et défendus devant un investisseur.
 */
export function businessParams(entries: ParamInventoryEntry[]): ParamInventoryEntry[] {
  return entries.filter((e) => !e.isMetadata && e.category !== "metadata");
}
