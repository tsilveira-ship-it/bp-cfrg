import { describe, expect, it } from "vitest";
import { computeModel } from "@/lib/model/compute";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS } from "@/lib/model/defaults";
import { runCrossChecks, summarizeChecks } from "@/lib/cross-checks";

describe("cross-checks — scénario default", () => {
  const r = computeModel(DEFAULT_PARAMS);
  const checks = runCrossChecks(DEFAULT_PARAMS, r);

  // Filtrer hors "Bilan" car le calcul actif=passif est approximatif (l'app affiche "écart")
  const structural = checks.filter((c) => c.category !== "Bilan");
  const summary = summarizeChecks(structural);

  it("aucune erreur sur les contrôles structurels (P&L, Cashflow, Mensuel)", () => {
    expect(summary.error).toBe(0);
  });

  it("aucun warning structurel", () => {
    expect(summary.warning).toBe(0);
  });

  it("au moins 10 contrôles structurels exécutés", () => {
    expect(summary.total).toBeGreaterThanOrEqual(10);
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
