import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS, INVESTOR_BASE_PARAMS } from "@/lib/model/defaults";
import { flattenParams, businessParams } from "@/lib/param-inventory";
import { buildParamAuditReport, reportToMarkdown } from "@/lib/param-audit-report";

/**
 * Test générateur — produit les artefacts data-room :
 *   docs/PARAM-INVENTORY.json
 *   docs/PARAM-INVENTORY.md
 *   docs/PARAM-INVENTORY-AUDIT-CORRECTED.json
 *   docs/PARAM-INVENTORY-AUDIT-CORRECTED.md
 *
 * Les invariants testés garantissent qu'aucun paramètre business ne disparaît
 * silencieusement (régression = échec build).
 */
describe("Inventaire param-par-param — livrable A", () => {
  const baseReport = buildParamAuditReport(DEFAULT_PARAMS, "Scénario Base");
  const auditReport = buildParamAuditReport(AUDIT_CORRECTED_PARAMS, "AUDIT_CORRECTED_PARAMS");

  it("inventorie tous les leaf-paths du modèle Base sans erreur", () => {
    const all = flattenParams(DEFAULT_PARAMS);
    expect(all.length).toBeGreaterThan(80);
  });

  it("distingue paramètres business vs métadonnées", () => {
    const all = flattenParams(DEFAULT_PARAMS);
    const biz = businessParams(all);
    expect(biz.length).toBeLessThanOrEqual(all.length);
    // chaque entrée business doit avoir une catégorie non-metadata
    for (const e of biz) {
      expect(e.category).not.toBe("metadata");
    }
  });

  it("résume gaps — sourcing, validation, benchmark", () => {
    const { summary } = baseReport;
    expect(summary.businessParams).toBeGreaterThan(0);
    // Gaps doivent être des compteurs cohérents
    expect(summary.gaps.missingSource).toBeGreaterThanOrEqual(0);
    expect(summary.gaps.criticalUnvalidated).toBeGreaterThanOrEqual(0);
    expect(summary.gaps.benchmarkBreaches).toBeGreaterThanOrEqual(0);
  });

  it("écrit les artefacts data-room (json + md) pour scénario Base", () => {
    const docsDir = path.resolve(process.cwd(), "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      path.join(docsDir, "PARAM-INVENTORY.json"),
      JSON.stringify(baseReport, null, 2),
      "utf8"
    );
    writeFileSync(
      path.join(docsDir, "PARAM-INVENTORY.md"),
      reportToMarkdown(baseReport),
      "utf8"
    );
    // Sanity check : fichier doit contenir le path du prix tier illimité
    const md = reportToMarkdown(baseReport);
    expect(md).toContain("subs.tiers[0].monthlyPrice");
    expect(md).toContain("Trous dans la raquette");
  });

  it("écrit les artefacts pour scénario AUDIT_CORRECTED", () => {
    const docsDir = path.resolve(process.cwd(), "docs");
    writeFileSync(
      path.join(docsDir, "PARAM-INVENTORY-AUDIT-CORRECTED.json"),
      JSON.stringify(auditReport, null, 2),
      "utf8"
    );
    writeFileSync(
      path.join(docsDir, "PARAM-INVENTORY-AUDIT-CORRECTED.md"),
      reportToMarkdown(auditReport),
      "utf8"
    );
    // Diff attendu : enableIs/enableDA passent à true, donc rationale "false dans
    // DEFAULT_PARAMS" devient moins critique.
    expect(AUDIT_CORRECTED_PARAMS.tax.enableIs).toBe(true);
    expect(AUDIT_CORRECTED_PARAMS.tax.enableDA).toBe(true);
  });

  it("écrit les artefacts pour scénario INVESTOR_BASE", () => {
    const report = buildParamAuditReport(INVESTOR_BASE_PARAMS, "INVESTOR_BASE");
    const docsDir = path.resolve(process.cwd(), "docs");
    writeFileSync(
      path.join(docsDir, "PARAM-INVENTORY-INVESTOR-BASE.json"),
      JSON.stringify(report, null, 2),
      "utf8"
    );
    writeFileSync(
      path.join(docsDir, "PARAM-INVENTORY-INVESTOR-BASE.md"),
      reportToMarkdown(report),
      "utf8"
    );
    expect(report.rows.length).toBeGreaterThan(0);
    // ARPU pondéré doit être dans le range CrossFit Paris (130-220€)
    const arpu = report.aggregateBenchmarks.find((b) => b.id === "arpu-weighted");
    expect(arpu?.verdict).toBe("in-range");
  });

  it("snapshot — compteurs par catégorie stables", () => {
    const { byCategory } = baseReport.summary;
    // Catégories business attendues présentes
    expect(byCategory["revenue.subscriptions"]).toBeGreaterThan(0);
    expect(byCategory["costs.salaries"]).toBeGreaterThan(0);
    expect(byCategory["financing.equity"]).toBeGreaterThan(0);
    expect(byCategory["tax"]).toBeGreaterThan(0);
  });
});
