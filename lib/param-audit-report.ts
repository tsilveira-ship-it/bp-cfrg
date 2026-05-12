import type { ModelParams } from "./model/types";
import {
  flattenParams,
  businessParams,
  countByCategory,
  type ParamInventoryEntry,
} from "./param-inventory";
import { resolveSource, type SourceState, type ParamCriticality } from "./param-source-map";
import { getSectorBenchmarks, getAuditThresholds } from "./model/defaults";
import { getValidationStatus, type ValidationStatus } from "./validation-status";

/**
 * Benchmark agrégé — la comparaison se fait sur une métrique DÉRIVÉE des
 * paramètres (ARPU pondéré, CAC implicite, etc.), pas sur un leaf-param.
 * Évite les faux positifs (ex tier "4 séances" à 70€ flagged "below 130€"
 * alors que le bench est sur le prix moyen pondéré).
 */
export type AggregateBenchmark = {
  id: string;
  label: string;
  computedValue: number;
  computedFormula: string;
  benchmarkRef: string;
  benchmarkRange: { low: number; high: number; source: string };
  verdict: "in-range" | "below" | "above";
  comment: string;
};

function computeAggregateBenchmarks(p: ModelParams): AggregateBenchmark[] {
  const bm = getSectorBenchmarks(p);
  const out: AggregateBenchmark[] = [];

  // ARPU pondéré (prix moyen × mixPct)
  const tiers = p.subs.tiers ?? [];
  const totalMix = tiers.reduce((s, t) => s + t.mixPct, 0);
  if (tiers.length > 0 && totalMix > 0) {
    const arpu = tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0) / totalMix;
    const range = bm.monthlyPriceCrossfit;
    out.push({
      id: "arpu-weighted",
      label: "ARPU pondéré (€/mois TTC)",
      computedValue: arpu,
      computedFormula: "Σ tier.monthlyPrice × tier.mixPct",
      benchmarkRef: "monthlyPriceCrossfit",
      benchmarkRange: range,
      verdict: arpu < range.low ? "below" : arpu > range.high ? "above" : "in-range",
      comment: `Mix actuel: ${tiers.map((t) => (t.mixPct * 100).toFixed(0) + "%").join("/")}`,
    });
  }

  // CAC implicite Y1 = budget mkt Y1 / new members Y1
  const newMembersY1 = Math.max(1, p.subs.rampEndCount - p.subs.rampStartCount);
  const cacImplicit = (p.marketing.monthlyBudget * 12) / newMembersY1;
  out.push({
    id: "cac-implicit-y1",
    label: "CAC implicite Y1 (€/membre)",
    computedValue: cacImplicit,
    computedFormula: "marketing.monthlyBudget × 12 / (rampEnd - rampStart)",
    benchmarkRef: "cacFitness",
    benchmarkRange: bm.cacFitness,
    verdict:
      cacImplicit < bm.cacFitness.low
        ? "below"
        : cacImplicit > bm.cacFitness.high
        ? "above"
        : "in-range",
    comment: `Hyp: ${newMembersY1} new members Y1 acquis pour ${(p.marketing.monthlyBudget * 12).toLocaleString("fr-FR")}€`,
  });

  // Membres fin d'horizon vs box mature
  const lastYearTarget = p.subs.rampEndCount * (p.subs.growthRates ?? []).reduce((s, g) => s * (1 + g), 1);
  out.push({
    id: "members-end-horizon",
    label: "Membres fin d'horizon (estimation simple)",
    computedValue: lastYearTarget,
    computedFormula: "rampEnd × Π (1 + growthRates[i])",
    benchmarkRef: "membersMatureCrossfit",
    benchmarkRange: bm.membersMatureCrossfit,
    verdict:
      lastYearTarget < bm.membersMatureCrossfit.low
        ? "below"
        : lastYearTarget > bm.membersMatureCrossfit.high
        ? "above"
        : "in-range",
    comment: "Hors churn — borne haute du modèle. Box parisienne mature: 250-450.",
  });

  // Churn moyen pondéré
  const churn = p.subs.monthlyChurnPct ?? 0;
  out.push({
    id: "churn-monthly",
    label: "Churn mensuel global (%/mo)",
    computedValue: churn,
    computedFormula: "subs.monthlyChurnPct",
    benchmarkRef: "churnCrossfitCommunity",
    benchmarkRange: bm.churnCrossfitCommunity,
    verdict:
      churn < bm.churnCrossfitCommunity.low
        ? "below"
        : churn > bm.churnCrossfitCommunity.high
        ? "above"
        : "in-range",
    comment: churn === 0 ? "CHURN = 0 — kill VC selon vc-audit.ts" : "",
  });

  // IS rate
  out.push({
    id: "is-rate",
    label: "Taux IS (%)",
    computedValue: p.tax.isRate,
    computedFormula: "tax.isRate",
    benchmarkRef: "isRateFR",
    benchmarkRange: bm.isRateFR,
    verdict:
      p.tax.isRate < bm.isRateFR.low
        ? "below"
        : p.tax.isRate > bm.isRateFR.high
        ? "above"
        : "in-range",
    comment: "CGI: 15% jusque 42500€, puis 25%.",
  });

  return out;
}

/**
 * Construit le rapport complet d'audit param-par-param (livrable A).
 * Pour chaque paramètre business : valeur, source, benchmark, seuil, validation.
 * Permet de produire :
 *   - JSON exploitable par UI /param-audit (livrable C)
 *   - Markdown data-room pour partage investisseur
 *   - Gap-list (params sans source / sans benchmark / non validés)
 */

export type ParamAuditRow = {
  path: string;
  category: ParamInventoryEntry["category"];
  type: ParamInventoryEntry["type"];
  value: unknown;
  valueDisplay: string;
  // Sourcing
  sourceState: SourceState | "unmapped";
  sourceRef: string;
  rationale: string;
  criticality: ParamCriticality | "unknown";
  // Benchmark
  benchmarkRef: string | null;
  benchmarkRange: { low: number; high: number; source: string } | null;
  benchmarkVerdict: "in-range" | "below" | "above" | "n/a";
  // Seuil audit
  thresholdRef: string | null;
  thresholdValue: number | null;
  // Validation 4-eyes
  validationStatus: ValidationStatus;
  // Tests recommandés
  testsRecommended: string[];
  // Note libre fondateur
  fieldNote: string | null;
};

export type ParamAuditSummary = {
  totalParams: number;
  businessParams: number;
  byCategory: Record<string, number>;
  bySourceState: Record<SourceState | "unmapped", number>;
  byCriticality: Record<ParamCriticality | "unknown", number>;
  byValidation: Record<ValidationStatus, number>;
  benchmarkOutOfRange: number;
  // Compteurs clés "trous dans la raquette"
  gaps: {
    missingSource: number;        // state === "missing" ou "unmapped"
    criticalUnvalidated: number;  // criticality critical/high ET validationStatus !== "validated"
    benchmarkBreaches: number;    // verdict !== "in-range" et !== "n/a"
  };
};

export type ParamAuditReport = {
  scenarioLabel: string;
  generatedAt: string;
  summary: ParamAuditSummary;
  rows: ParamAuditRow[];
  aggregateBenchmarks: AggregateBenchmark[];
};

/**
 * Map benchmarkRef → (lookup dans le scénario) — utilisé pour résoudre la range
 * applicable depuis `params.sectorBenchmarks`.
 */
function getBenchmarkRange(
  p: ModelParams,
  ref: string | null | undefined
): { low: number; high: number; source: string } | null {
  if (!ref) return null;
  const bm = getSectorBenchmarks(p) as Record<string, { low: number; high: number; source: string }>;
  return bm[ref] ?? null;
}

function getThresholdValue(p: ModelParams, ref: string | null | undefined): number | null {
  if (!ref) return null;
  const t = getAuditThresholds(p) as Record<string, number | undefined>;
  const v = t[ref];
  return typeof v === "number" ? v : null;
}

function formatValue(v: unknown, type: ParamInventoryEntry["type"]): string {
  if (v === null || v === undefined) return "—";
  if (type === "number") {
    const n = v as number;
    if (Math.abs(n) >= 1000) return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    if (Math.abs(n) < 1 && n !== 0) return (n * 100).toFixed(2) + "%";
    return n.toString();
  }
  if (type === "number[]") return "[" + (v as number[]).map((x) => x.toString()).join(", ") + "]";
  if (type === "boolean") return v ? "true" : "false";
  if (type === "string") return String(v);
  if (Array.isArray(v)) return `Array(${v.length})`;
  return "Object";
}

/**
 * Vérifie si la valeur numérique est dans le range benchmark.
 * Pour les pourcentages stockés en ratio (0..1), la comparaison est directe.
 */
function judgeBenchmark(
  value: unknown,
  range: { low: number; high: number } | null
): ParamAuditRow["benchmarkVerdict"] {
  if (!range) return "n/a";
  if (typeof value !== "number") return "n/a";
  if (value < range.low) return "below";
  if (value > range.high) return "above";
  return "in-range";
}

export function buildParamAuditReport(
  p: ModelParams,
  scenarioLabel = "DEFAULT_PARAMS"
): ParamAuditReport {
  const all = flattenParams(p);
  const biz = businessParams(all);

  const rows: ParamAuditRow[] = biz.map((entry) => {
    const src = resolveSource(entry.path);
    const benchmarkRange = getBenchmarkRange(p, src?.benchmarkRef);
    const thresholdValue = getThresholdValue(p, src?.thresholdRef);
    const validation = p.fieldValidations?.[entry.path];
    const validationStatus = getValidationStatus(validation, entry.value);
    const fieldNote = p.fieldNotes?.[entry.path]?.note ?? null;

    return {
      path: entry.path,
      category: entry.category,
      type: entry.type,
      value: entry.value,
      valueDisplay: formatValue(entry.value, entry.type),
      sourceState: src?.state ?? "unmapped",
      sourceRef: src?.sourceRef ?? "Non documenté",
      rationale: src?.rationale ?? "",
      criticality: src?.criticality ?? "unknown",
      benchmarkRef: src?.benchmarkRef ?? null,
      benchmarkRange,
      benchmarkVerdict: judgeBenchmark(entry.value, benchmarkRange),
      thresholdRef: src?.thresholdRef ?? null,
      thresholdValue,
      validationStatus,
      testsRecommended: src?.testsRecommended ?? [],
      fieldNote,
    };
  });

  // Agrégats
  const byCategory: Record<string, number> = {};
  const bySourceState = {} as Record<SourceState | "unmapped", number>;
  const byCriticality = {} as Record<ParamCriticality | "unknown", number>;
  const byValidation = {} as Record<ValidationStatus, number>;
  let benchmarkOutOfRange = 0;
  let criticalUnvalidated = 0;
  let missingSource = 0;

  for (const r of rows) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    bySourceState[r.sourceState] = (bySourceState[r.sourceState] ?? 0) + 1;
    byCriticality[r.criticality] = (byCriticality[r.criticality] ?? 0) + 1;
    byValidation[r.validationStatus] = (byValidation[r.validationStatus] ?? 0) + 1;
    if (r.benchmarkVerdict === "below" || r.benchmarkVerdict === "above") benchmarkOutOfRange++;
    if (r.sourceState === "missing" || r.sourceState === "unmapped") missingSource++;
    if ((r.criticality === "critical" || r.criticality === "high") && r.validationStatus !== "validated") {
      criticalUnvalidated++;
    }
  }

  const summary: ParamAuditSummary = {
    totalParams: all.length,
    businessParams: rows.length,
    byCategory,
    bySourceState,
    byCriticality,
    byValidation,
    benchmarkOutOfRange,
    gaps: {
      missingSource,
      criticalUnvalidated,
      benchmarkBreaches: benchmarkOutOfRange,
    },
  };

  void countByCategory; // utilisé indirectement via byCategory

  return {
    scenarioLabel,
    generatedAt: new Date().toISOString(),
    summary,
    rows,
    aggregateBenchmarks: computeAggregateBenchmarks(p),
  };
}

/** Génère un Markdown lisible pour data-room investisseur. */
export function reportToMarkdown(report: ParamAuditReport): string {
  const { summary, rows, scenarioLabel, generatedAt, aggregateBenchmarks } = report;
  const lines: string[] = [];
  lines.push(`# Audit param-par-param — ${scenarioLabel}`);
  lines.push("");
  lines.push(`> Généré: ${generatedAt}`);
  lines.push("");
  lines.push("## Résumé");
  lines.push("");
  lines.push(`- Paramètres totaux (incl. métadonnées) : **${summary.totalParams}**`);
  lines.push(`- Paramètres business (à auditer) : **${summary.businessParams}**`);
  lines.push("");
  lines.push("### Trous dans la raquette");
  lines.push("");
  lines.push(`- Sans source documentée : **${summary.gaps.missingSource}**`);
  lines.push(`- Critiques/Hauts non validés 4-eyes : **${summary.gaps.criticalUnvalidated}**`);
  lines.push(`- Hors benchmark sectoriel : **${summary.gaps.benchmarkBreaches}**`);
  lines.push("");
  lines.push("### Répartition par catégorie");
  lines.push("");
  for (const [cat, n] of Object.entries(summary.byCategory).sort()) {
    lines.push(`- ${cat} : ${n}`);
  }
  lines.push("");
  lines.push("### État sourcing");
  lines.push("");
  for (const [state, n] of Object.entries(summary.bySourceState)) {
    lines.push(`- ${state} : ${n}`);
  }
  lines.push("");
  lines.push("### Criticité");
  lines.push("");
  for (const [c, n] of Object.entries(summary.byCriticality)) {
    lines.push(`- ${c} : ${n}`);
  }
  lines.push("");
  lines.push("### Validation 4-eyes");
  lines.push("");
  for (const [v, n] of Object.entries(summary.byValidation)) {
    lines.push(`- ${v} : ${n}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Benchmarks agrégés (métriques dérivées)");
  lines.push("");
  lines.push("| Métrique | Valeur | Formule | Benchmark | Range | Verdict | Commentaire |");
  lines.push("|----------|--------|---------|-----------|-------|---------|-------------|");
  for (const a of aggregateBenchmarks) {
    const val =
      Math.abs(a.computedValue) < 1 && a.computedValue !== 0
        ? (a.computedValue * 100).toFixed(2) + "%"
        : a.computedValue.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
    lines.push(
      `| ${a.label} | ${val} | \`${a.computedFormula}\` | ${a.benchmarkRef} | ${a.benchmarkRange.low}–${a.benchmarkRange.high} | ${a.verdict} | ${a.comment} |`
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Détail par paramètre");
  lines.push("");
  lines.push("| Path | Catégorie | Valeur | Criticité | Source | État | Benchmark | Verdict | Validation | Tests |");
  lines.push("|------|-----------|--------|-----------|--------|------|-----------|---------|------------|-------|");
  for (const r of rows) {
    const bench = r.benchmarkRange
      ? `${r.benchmarkRef}: ${r.benchmarkRange.low}–${r.benchmarkRange.high}`
      : "—";
    const tests = r.testsRecommended.length > 0 ? r.testsRecommended.join("; ") : "—";
    lines.push(
      `| \`${r.path}\` | ${r.category} | ${r.valueDisplay} | ${r.criticality} | ${r.sourceRef} | ${r.sourceState} | ${bench} | ${r.benchmarkVerdict} | ${r.validationStatus} | ${tests} |`
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Gap-list — paramètres à traiter en priorité");
  lines.push("");
  lines.push("### 1. Critiques sans validation 4-eyes");
  lines.push("");
  const critUnval = rows.filter(
    (r) => (r.criticality === "critical" || r.criticality === "high") && r.validationStatus !== "validated"
  );
  for (const r of critUnval) {
    lines.push(`- \`${r.path}\` = ${r.valueDisplay} — ${r.rationale || "(rationale manquant)"}`);
  }
  lines.push("");
  lines.push("### 2. Paramètres sans source");
  lines.push("");
  const noSrc = rows.filter((r) => r.sourceState === "missing" || r.sourceState === "unmapped");
  for (const r of noSrc) {
    lines.push(`- \`${r.path}\` = ${r.valueDisplay} (catégorie ${r.category}, criticité ${r.criticality})`);
  }
  lines.push("");
  lines.push("### 3. Hors benchmark sectoriel");
  lines.push("");
  const oor = rows.filter((r) => r.benchmarkVerdict === "below" || r.benchmarkVerdict === "above");
  for (const r of oor) {
    const bench = r.benchmarkRange!;
    lines.push(
      `- \`${r.path}\` = ${r.valueDisplay} ${r.benchmarkVerdict} range ${bench.low}–${bench.high} (${bench.source})`
    );
  }
  lines.push("");
  return lines.join("\n");
}
