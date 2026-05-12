import type { ModelParams } from "./model/types";
import {
  runReverseStress,
  type BreakResult,
  type StressMetricId,
  type StressDriver,
} from "./reverse-stress";
import { DEFAULT_STRESS_DRIVERS } from "./reverse-stress-drivers";

/**
 * Produit le rapport reverse-stress complet : pour chaque driver × métrique,
 * la valeur de rupture, la marge de sécurité, et un verdict robustesse.
 */

export type RobustnessVerdict = "robuste" | "moyen" | "fragile" | "déjà-cassé" | "n/a";

export type ReverseStressRow = BreakResult & {
  /** Marge relative en pourcent, signée selon direction. */
  marginPct: number;
  /** Verdict robustesse basé sur seuils sur marginPct. */
  verdict: RobustnessVerdict;
  /** Direction du driver, pour interpréter la marge dans le rapport. */
  direction: "higher-is-worse" | "lower-is-worse";
};

export type ReverseStressReport = {
  scenarioLabel: string;
  generatedAt: string;
  driverCount: number;
  metricCount: number;
  rows: ReverseStressRow[];
};

/**
 * Classement robustesse sur la marge relative à la rupture.
 * Seuils calibrés pour un BP investisseur : <10% = fragile (un choc terrain
 * standard tue le modèle), 10-30% = moyen, >30% = robuste.
 */
function judgeRobustness(margin: number, status: BreakResult["status"]): RobustnessVerdict {
  if (status === "already-broken") return "déjà-cassé";
  if (status === "no-break-in-bounds") return "robuste";
  if (!isFinite(margin)) return "n/a";
  const abs = Math.abs(margin);
  if (abs < 0.10) return "fragile";
  if (abs < 0.30) return "moyen";
  return "robuste";
}

export function buildReverseStressReport(
  base: ModelParams,
  drivers: StressDriver[] = DEFAULT_STRESS_DRIVERS,
  metrics: StressMetricId[] = ["cashTroughZero", "noBreakEven", "ebitdaLastNegative", "dscrYearBelowOne"],
  scenarioLabel = "DEFAULT_PARAMS"
): ReverseStressReport {
  const rawResults = runReverseStress(base, drivers, metrics);

  const driverDirMap = new Map<string, "higher-is-worse" | "lower-is-worse">();
  for (const d of drivers) driverDirMap.set(d.id, d.direction);

  const rows: ReverseStressRow[] = rawResults.map((r) => {
    const direction = driverDirMap.get(r.driverId) ?? "higher-is-worse";
    const marginPct = r.relativeMargin;
    return {
      ...r,
      marginPct,
      verdict: judgeRobustness(marginPct, r.status),
      direction,
    };
  });

  return {
    scenarioLabel,
    generatedAt: new Date().toISOString(),
    driverCount: drivers.length,
    metricCount: metrics.length,
    rows,
  };
}

function formatVal(v: number, unit: string, isPct: boolean): string {
  if (!isFinite(v)) return "—";
  if (isPct) return (v * 100).toFixed(2) + "%";
  if (Math.abs(v) >= 1000) return v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " " + unit;
  return v.toFixed(3) + " " + unit;
}

function formatMargin(m: number): string {
  if (!isFinite(m)) return "—";
  return (m * 100).toFixed(0) + "%";
}

const VERDICT_BADGE: Record<RobustnessVerdict, string> = {
  robuste: "🟢 robuste",
  moyen: "🟡 moyen",
  fragile: "🔴 fragile",
  "déjà-cassé": "💀 déjà cassé",
  "n/a": "—",
};

export function reverseStressToMarkdown(report: ReverseStressReport): string {
  const lines: string[] = [];
  lines.push(`# Reverse stress test — ${report.scenarioLabel}`);
  lines.push("");
  lines.push(`> Généré: ${report.generatedAt}`);
  lines.push(`> ${report.driverCount} drivers × ${report.metricCount} métriques = ${report.rows.length} bisections`);
  lines.push("");

  // Top fragilités
  const fragile = report.rows.filter((r) => r.verdict === "fragile" || r.verdict === "déjà-cassé");
  fragile.sort((a, b) => Math.abs(a.marginPct) - Math.abs(b.marginPct));
  lines.push("## Fragilités prioritaires (marge < 10%)");
  lines.push("");
  if (fragile.length === 0) {
    lines.push("_Aucune fragilité détectée selon la grille `robuste/moyen/fragile`._");
  } else {
    lines.push("| Driver | Métrique | Valeur actuelle | Valeur rupture | Marge | Verdict |");
    lines.push("|--------|----------|-----------------|----------------|-------|---------|");
    for (const r of fragile) {
      lines.push(
        `| ${r.driverLabel} | ${r.metricLabel} | ${formatVal(r.currentValue, r.unit, r.isPct)} | ${formatVal(r.breakValue, r.unit, r.isPct)} | ${formatMargin(r.marginPct)} | ${VERDICT_BADGE[r.verdict]} |`
      );
    }
  }
  lines.push("");

  // Robustesse complète
  lines.push("## Tableau complet — marge de sécurité par driver × métrique");
  lines.push("");
  // Pivot : drivers en lignes, métriques en colonnes
  const drivers = Array.from(new Set(report.rows.map((r) => r.driverId)));
  const metrics = Array.from(new Set(report.rows.map((r) => r.metric)));
  const driverLabels = new Map<string, string>();
  const metricLabels = new Map<string, string>();
  for (const r of report.rows) {
    driverLabels.set(r.driverId, r.driverLabel);
    metricLabels.set(r.metric, r.metricLabel);
  }

  lines.push("### Marge relative à la rupture (% ou ratio)");
  lines.push("");
  const header = ["Driver", ...metrics.map((m) => metricLabels.get(m)!)];
  lines.push("| " + header.join(" | ") + " |");
  lines.push("|" + header.map(() => "---").join("|") + "|");
  for (const did of drivers) {
    const row: string[] = [driverLabels.get(did)!];
    for (const m of metrics) {
      const r = report.rows.find((x) => x.driverId === did && x.metric === m);
      if (!r) {
        row.push("—");
      } else {
        row.push(`${formatMargin(r.marginPct)} ${VERDICT_BADGE[r.verdict]}`);
      }
    }
    lines.push("| " + row.join(" | ") + " |");
  }
  lines.push("");

  lines.push("### Détail valeurs rupture");
  lines.push("");
  lines.push("| Driver | Direction | Métrique | Courant | Rupture | Marge abs | Marge % | Statut | Iter |");
  lines.push("|--------|-----------|----------|---------|---------|-----------|---------|--------|------|");
  for (const r of report.rows) {
    lines.push(
      `| ${r.driverLabel} | ${r.direction} | ${r.metricLabel} | ${formatVal(r.currentValue, r.unit, r.isPct)} | ${formatVal(r.breakValue, r.unit, r.isPct)} | ${formatVal(r.absoluteMargin, r.unit, r.isPct)} | ${formatMargin(r.marginPct)} | ${r.status} | ${r.iterations} |`
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Interprétation pour data-room investisseur");
  lines.push("");
  lines.push("- **🟢 robuste** : marge > 30% — le BP supporte un choc significatif sans rupture.");
  lines.push("- **🟡 moyen** : marge 10–30% — vulnérable à un choc modéré, mitigation requise.");
  lines.push("- **🔴 fragile** : marge < 10% — un choc terrain standard tue le modèle. Action requise.");
  lines.push("- **💀 déjà cassé** : la métrique est déjà négative au scénario base — bug du BP à corriger immédiatement.");
  lines.push("- **no-break-in-bounds** : même en stress extrême la métrique tient — peut être un signal d'imprécision (vérifier worstBound).");
  lines.push("");

  return lines.join("\n");
}
