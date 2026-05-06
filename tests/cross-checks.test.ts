import { describe, expect, it } from "vitest";
import { computeModel } from "@/lib/model/compute";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS } from "@/lib/model/defaults";
import { runCrossChecks, summarizeChecks } from "@/lib/cross-checks";

describe("cross-checks — scénario default", () => {
  const r = computeModel(DEFAULT_PARAMS);
  const checks = runCrossChecks(DEFAULT_PARAMS, r);

  const structural = checks.filter((c) => c.category !== "Bilan");
  const structuralSummary = summarizeChecks(structural);

  it("aucune erreur sur les contrôles structurels (P&L, Cashflow, Mensuel)", () => {
    expect(structuralSummary.error).toBe(0);
  });

  it("aucun warning structurel", () => {
    expect(structuralSummary.warning).toBe(0);
  });

  it("au moins 10 contrôles structurels exécutés", () => {
    expect(structuralSummary.total).toBeGreaterThanOrEqual(10);
  });

  // Tests bilan — devraient être OK après fix split loans/bonds + capitalized + vatPayable
  const bilanChecks = checks.filter((c) => c.category === "Bilan");
  const bilanSummary = summarizeChecks(bilanChecks);

  it("bilan: contrôles exécutés pour chaque FY", () => {
    expect(bilanSummary.total).toBeGreaterThan(0);
  });

  it("bilan: aucune erreur (équilibre Actif = Passif)", () => {
    expect(bilanSummary.error).toBe(0);
  });
});

describe("cross-checks — scénario audit", () => {
  const r = computeModel(AUDIT_CORRECTED_PARAMS);
  const checks = runCrossChecks(AUDIT_CORRECTED_PARAMS, r);
  const structural = checks.filter((c) => c.category !== "Bilan");
  const summary = summarizeChecks(structural);

  it("aucune erreur de cohérence structurelle", () => {
    expect(summary.error).toBe(0);
  });
});
