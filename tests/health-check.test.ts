import { describe, expect, it } from "vitest";
import { computeModel } from "@/lib/model/compute";
import { runHealthCheck, summarizeIssues } from "@/lib/health-check";
import { DEFAULT_PARAMS } from "@/lib/model/defaults";
import type { ModelParams } from "@/lib/model/types";

describe("health-check — scénario default", () => {
  const r = computeModel(DEFAULT_PARAMS);
  const issues = runHealthCheck(DEFAULT_PARAMS, r);

  it("retourne au moins un check", () => {
    expect(issues.length).toBeGreaterThan(0);
  });

  it("le mix abos est détecté à 100% (subs-mix-ok)", () => {
    const mixIssue = issues.find((i) => i.id === "subs-mix-ok");
    expect(mixIssue).toBeDefined();
    expect(mixIssue!.severity).toBe("ok");
  });

  it("retourne un summary cohérent", () => {
    const summary = summarizeIssues(issues);
    expect(summary.critical + summary.warnings + summary.ok).toBeLessThanOrEqual(issues.length);
  });
});

describe("health-check — détection mix abos cassé", () => {
  it("warning ou critical si mix ≠ 100%", () => {
    const broken: ModelParams = {
      ...DEFAULT_PARAMS,
      subs: {
        ...DEFAULT_PARAMS.subs,
        tiers: DEFAULT_PARAMS.subs.tiers.map((t) => ({ ...t, mixPct: 0.1 })),
      },
    };
    const r = computeModel(broken);
    const issues = runHealthCheck(broken, r);
    const mixIssue = issues.find((i) => i.id === "subs-mix");
    expect(mixIssue).toBeDefined();
    expect(["warning", "critical"]).toContain(mixIssue!.severity);
  });
});

describe("health-check — détection BFR extrême", () => {
  it("alerte si BFR > 90 jours", () => {
    const broken: ModelParams = {
      ...DEFAULT_PARAMS,
      bfr: { daysOfRevenue: 200 },
    };
    const r = computeModel(broken);
    const issues = runHealthCheck(broken, r);
    const bfr = issues.find((i) => i.id === "bfr-extreme");
    expect(bfr).toBeDefined();
  });
});

describe("health-check — détection trésorerie négative", () => {
  it("alerte critique si creux tréso < 0", () => {
    // Default scenario should have cash trough negative based on debug
    const r = computeModel(DEFAULT_PARAMS);
    const issues = runHealthCheck(DEFAULT_PARAMS, r);
    if (r.cashTroughValue < 0) {
      const cashIssue = issues.find((i) => i.id === "cash-trough");
      expect(cashIssue).toBeDefined();
      expect(cashIssue!.severity).toBe("critical");
    }
  });
});
