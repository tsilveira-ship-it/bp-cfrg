import { describe, expect, it } from "vitest";
import { computeModel } from "@/lib/model/compute";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS } from "@/lib/model/defaults";
import { runCrossChecks, summarizeChecks } from "@/lib/cross-checks";
import type { ModelParams } from "@/lib/model/types";

/**
 * Reproductions du bug Master V13 — bilan ne balance pas avec certaines configs.
 * Chacune isole une cause potentielle pour aider à pinpointer + valider le fix.
 */

function runBilan(p: ModelParams) {
  const r = computeModel(p);
  const checks = runCrossChecks(p, r).filter((c) => c.category === "Bilan");
  return { r, checks, summary: summarizeChecks(checks), deltas: checks.map((c) => c.delta) };
}

describe("bilan equilibre — détection des causes de désequilibre", () => {
  it("baseline DEFAULT_PARAMS → bilan OK", () => {
    const { summary } = runBilan(DEFAULT_PARAMS);
    expect(summary.error).toBe(0);
  });

  it("AUDIT_CORRECTED (IS + DA activés) → bilan OK ou détecter δ", () => {
    const { summary, deltas } = runBilan(AUDIT_CORRECTED_PARAMS);
    if (summary.error > 0) {
      console.log("AUDIT_CORRECTED deltas:", deltas);
    }
    expect(summary.error).toBe(0);
  });

  it("scenario MASTER V13 simulé (TVA + IS + DA + BFR detailed) → doit balancer", () => {
    const p: ModelParams = {
      ...DEFAULT_PARAMS,
      tax: {
        ...DEFAULT_PARAMS.tax,
        enableIs: true,
        enableDA: true,
        enableVat: true,
        isPaymentSchedule: "quarterly",
        amortYearsEquipment: 5,
        amortYearsTravaux: 10,
      },
      bfr: {
        daysOfRevenue: 0,
        daysReceivables: 3,
        daysSupplierPayables: 30,
        daysStock: 5,
      },
      salaries: {
        ...DEFAULT_PARAMS.salaries,
        annualIndexPa: 0.02,
        chargesPatroPct: 0.42,
      },
    };
    const { summary, deltas, checks } = runBilan(p);
    if (summary.error > 0) {
      console.log("MASTER V13 deltas (passif − actif):");
      checks.forEach((c) => console.log(`  ${c.scope}: ${(c.delta / 1000).toFixed(1)}k€`));
    }
    expect(summary.error).toBe(0);
  });

  it("TVA seule activée → impact bilan isolé", () => {
    const p: ModelParams = {
      ...DEFAULT_PARAMS,
      tax: { ...DEFAULT_PARAMS.tax, enableVat: true },
    };
    const { summary, deltas } = runBilan(p);
    if (summary.error > 0) {
      console.log("TVA only deltas:", deltas.map((d) => `${(d / 1000).toFixed(1)}k€`));
    }
    expect(summary.error).toBe(0);
  });

  it("IS quarterly seul → impact bilan isolé", () => {
    const p: ModelParams = {
      ...DEFAULT_PARAMS,
      tax: {
        ...DEFAULT_PARAMS.tax,
        enableIs: true,
        isPaymentSchedule: "quarterly",
      },
    };
    const { summary, deltas } = runBilan(p);
    if (summary.error > 0) {
      console.log("IS quarterly deltas:", deltas.map((d) => `${(d / 1000).toFixed(1)}k€`));
    }
    expect(summary.error).toBe(0);
  });

  it("BFR détaillé seul → impact bilan isolé", () => {
    const p: ModelParams = {
      ...DEFAULT_PARAMS,
      bfr: {
        daysOfRevenue: 0,
        daysReceivables: 3,
        daysSupplierPayables: 30,
        daysStock: 5,
      },
    };
    const { summary, deltas } = runBilan(p);
    if (summary.error > 0) {
      console.log("BFR detailed deltas:", deltas.map((d) => `${(d / 1000).toFixed(1)}k€`));
    }
    expect(summary.error).toBe(0);
  });

  it("DA activée seule → impact bilan isolé", () => {
    const p: ModelParams = {
      ...DEFAULT_PARAMS,
      tax: { ...DEFAULT_PARAMS.tax, enableDA: true, enableIs: true },
    };
    const { summary, deltas } = runBilan(p);
    if (summary.error > 0) {
      console.log("DA+IS deltas:", deltas.map((d) => `${(d / 1000).toFixed(1)}k€`));
    }
    expect(summary.error).toBe(0);
  });
});
