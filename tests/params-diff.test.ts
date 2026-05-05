import { describe, expect, it } from "vitest";
import { diffParams, summarizeDiff, filterDiff } from "@/lib/params-diff";
import { DEFAULT_PARAMS } from "@/lib/model/defaults";
import type { ModelParams } from "@/lib/model/types";

describe("diffParams", () => {
  it("retourne 0 entrée si scénarios identiques", () => {
    const d = diffParams(DEFAULT_PARAMS, DEFAULT_PARAMS);
    expect(d.length).toBe(0);
  });

  it("détecte une modification primitive", () => {
    const a = DEFAULT_PARAMS;
    const b: ModelParams = { ...a, openingCash: a.openingCash + 1000 };
    const d = diffParams(a, b);
    expect(d.length).toBeGreaterThan(0);
    expect(d.some((e) => e.path === "openingCash")).toBe(true);
  });

  it("détecte une modification dans un objet imbriqué", () => {
    const a = DEFAULT_PARAMS;
    const b: ModelParams = { ...a, tax: { ...a.tax, isRate: 0.30 } };
    const d = diffParams(a, b);
    expect(d.some((e) => e.path === "tax.isRate")).toBe(true);
  });

  it("détecte une modification dans un tableau", () => {
    const a = DEFAULT_PARAMS;
    const b: ModelParams = {
      ...a,
      subs: { ...a.subs, growthRates: a.subs.growthRates.map((g) => g + 0.1) },
    };
    const d = diffParams(a, b);
    expect(d.length).toBeGreaterThan(0);
  });

  it("filterDiff exclut fieldNotes par défaut", () => {
    const a = DEFAULT_PARAMS;
    const b: ModelParams = {
      ...a,
      fieldNotes: { "test.path": { note: "test", date: new Date().toISOString() } },
      openingCash: a.openingCash + 100,
    };
    const all = diffParams(a, b);
    const filtered = filterDiff(all);
    expect(all.some((e) => e.path.startsWith("fieldNotes"))).toBe(true);
    expect(filtered.some((e) => e.path.startsWith("fieldNotes"))).toBe(false);
    expect(filtered.some((e) => e.path === "openingCash")).toBe(true);
  });

  it("summarizeDiff group par top-level path", () => {
    const a = DEFAULT_PARAMS;
    const b: ModelParams = {
      ...a,
      openingCash: 1,
      tax: { ...a.tax, isRate: 0.30 },
      capex: { ...a.capex, equipment: a.capex.equipment + 1000 },
    };
    const d = diffParams(a, b);
    const s = summarizeDiff(d);
    expect(s.byTopLevel["openingCash"]).toBeGreaterThan(0);
    expect(s.byTopLevel["tax"]).toBeGreaterThan(0);
    expect(s.byTopLevel["capex"]).toBeGreaterThan(0);
  });
});
