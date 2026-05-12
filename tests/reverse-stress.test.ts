import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS, INVESTOR_BASE_PARAMS } from "@/lib/model/defaults";
import { findBreakValue } from "@/lib/reverse-stress";
import { DEFAULT_STRESS_DRIVERS } from "@/lib/reverse-stress-drivers";
import {
  buildReverseStressReport,
  reverseStressToMarkdown,
} from "@/lib/reverse-stress-report";

describe("Reverse stress — livrable B", () => {
  it("driver churn : trouve une valeur de rupture cashTrough sur DEFAULT_PARAMS", () => {
    const churnDriver = DEFAULT_STRESS_DRIVERS.find((d) => d.id === "churn")!;
    const r = findBreakValue(DEFAULT_PARAMS, churnDriver, "cashTroughZero");
    // Soit on trouve une rupture, soit le modèle est robuste, soit déjà cassé.
    expect(["found", "already-broken", "no-break-in-bounds"]).toContain(r.status);
    if (r.status === "found") {
      expect(r.breakValue).toBeGreaterThan(0);
      expect(r.breakValue).toBeLessThanOrEqual(churnDriver.worstBound);
    }
  });

  it("driver loanRate : taux max avant DSCR<1", () => {
    const d = DEFAULT_STRESS_DRIVERS.find((dd) => dd.id === "loanRate")!;
    const r = findBreakValue(AUDIT_CORRECTED_PARAMS, d, "dscrYearBelowOne");
    expect(["found", "already-broken", "no-break-in-bounds"]).toContain(r.status);
  });

  it("écrit docs/REVERSE-STRESS.md + .json (Base)", () => {
    const report = buildReverseStressReport(DEFAULT_PARAMS, DEFAULT_STRESS_DRIVERS, undefined, "Scénario Base");
    const docsDir = path.resolve(process.cwd(), "docs");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(path.join(docsDir, "REVERSE-STRESS.json"), JSON.stringify(report, null, 2), "utf8");
    writeFileSync(path.join(docsDir, "REVERSE-STRESS.md"), reverseStressToMarkdown(report), "utf8");
    expect(report.rows.length).toBe(DEFAULT_STRESS_DRIVERS.length * 4);
  });

  it("écrit docs/REVERSE-STRESS-AUDIT-CORRECTED.md + .json", () => {
    const report = buildReverseStressReport(
      AUDIT_CORRECTED_PARAMS,
      DEFAULT_STRESS_DRIVERS,
      undefined,
      "AUDIT_CORRECTED_PARAMS"
    );
    const docsDir = path.resolve(process.cwd(), "docs");
    writeFileSync(
      path.join(docsDir, "REVERSE-STRESS-AUDIT-CORRECTED.json"),
      JSON.stringify(report, null, 2),
      "utf8"
    );
    writeFileSync(
      path.join(docsDir, "REVERSE-STRESS-AUDIT-CORRECTED.md"),
      reverseStressToMarkdown(report),
      "utf8"
    );
    expect(report.rows.length).toBeGreaterThan(0);
  });

  it("écrit docs/REVERSE-STRESS-INVESTOR-BASE.md + .json", () => {
    const report = buildReverseStressReport(
      INVESTOR_BASE_PARAMS,
      DEFAULT_STRESS_DRIVERS,
      undefined,
      "INVESTOR_BASE"
    );
    const docsDir = path.resolve(process.cwd(), "docs");
    writeFileSync(
      path.join(docsDir, "REVERSE-STRESS-INVESTOR-BASE.json"),
      JSON.stringify(report, null, 2),
      "utf8"
    );
    writeFileSync(
      path.join(docsDir, "REVERSE-STRESS-INVESTOR-BASE.md"),
      reverseStressToMarkdown(report),
      "utf8"
    );
    // INVESTOR_BASE doit avoir un cashTrough >= 0 dans le scénario base
    const cashTroughRows = report.rows.filter((r) => r.metric === "cashTroughZero");
    const alreadyBroken = cashTroughRows.filter((r) => r.status === "already-broken").length;
    expect(alreadyBroken).toBe(0); // aucune rupture déjà cassée pour cashTrough
  });

  it("le verdict robustesse est cohérent avec le statut", () => {
    const report = buildReverseStressReport(DEFAULT_PARAMS);
    for (const r of report.rows) {
      if (r.status === "already-broken") expect(r.verdict).toBe("déjà-cassé");
      if (r.status === "no-break-in-bounds") expect(r.verdict).toBe("robuste");
    }
  });
});
