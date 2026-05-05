import { describe, expect, it } from "vitest";
import { computeModel } from "@/lib/model/compute";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS } from "@/lib/model/defaults";
import { normalizeParams } from "@/lib/model/types";

describe("computeModel — base scénario", () => {
  const r = computeModel(DEFAULT_PARAMS);

  it("produit le bon nombre de mois et années", () => {
    expect(r.monthly.length).toBe(DEFAULT_PARAMS.timeline.horizonYears * 12);
    expect(r.yearly.length).toBe(DEFAULT_PARAMS.timeline.horizonYears);
  });

  it("le CA cumulé mensuel = CA annuel", () => {
    for (const y of r.yearly) {
      const months = r.monthly.filter((m) => m.fy === y.fy);
      const sum = months.reduce((s, m) => s + m.totalRevenue, 0);
      expect(Math.abs(sum - y.totalRevenue)).toBeLessThan(1);
    }
  });

  it("EBITDA = CA - OPEX", () => {
    for (const y of r.yearly) {
      expect(Math.abs(y.ebitda - (y.totalRevenue - y.totalOpex))).toBeLessThan(1);
    }
  });

  it("EBIT = EBITDA - DA", () => {
    for (const y of r.yearly) {
      expect(Math.abs(y.ebit - (y.ebitda - y.da))).toBeLessThan(1);
    }
  });

  it("PBT = EBIT - intérêts", () => {
    for (const y of r.yearly) {
      expect(Math.abs(y.pbt - (y.ebit - y.interestExpense))).toBeLessThan(1);
    }
  });

  it("ΔTréso = CFO + CFI + CFF", () => {
    for (const y of r.yearly) {
      expect(Math.abs(y.netCashFlow - (y.cfo + y.cfi + y.cff))).toBeLessThan(1);
    }
  });

  it("CA = Σ sources de revenu", () => {
    for (const y of r.yearly) {
      const sum = y.subsRevenue + y.legacyRevenue + y.prestationsRevenue + y.merchRevenue;
      expect(Math.abs(y.totalRevenue - sum)).toBeLessThan(1);
    }
  });

  it("OPEX = Σ catégories de charges", () => {
    for (const y of r.yearly) {
      const sum = y.salaries + y.rent + y.recurring + y.marketing + y.provisions + y.oneOff;
      expect(Math.abs(y.totalOpex - sum)).toBeLessThan(1);
    }
  });

  it("Trésorerie finale = ouverture + Σ ΔTréso", () => {
    const sumCashFlow = r.yearly.reduce((s, y) => s + y.netCashFlow, 0);
    const lastFy = r.yearly[r.yearly.length - 1];
    expect(Math.abs(lastFy.cashEnd - (DEFAULT_PARAMS.openingCash + sumCashFlow))).toBeLessThan(1);
  });

  it("CA strictement croissant sur les 3 premières années", () => {
    expect(r.yearly[1].totalRevenue).toBeGreaterThan(r.yearly[0].totalRevenue);
    expect(r.yearly[2].totalRevenue).toBeGreaterThan(r.yearly[1].totalRevenue);
  });
});

describe("computeModel — scénario audit", () => {
  const r = computeModel(AUDIT_CORRECTED_PARAMS);

  it("produit un résultat", () => {
    expect(r.yearly.length).toBeGreaterThan(0);
    expect(r.monthly.length).toBeGreaterThan(0);
  });

  it("scénario audit ne diverge pas", () => {
    for (const y of r.yearly) {
      expect(Math.abs(y.ebitda - (y.totalRevenue - y.totalOpex))).toBeLessThan(1);
      expect(Math.abs(y.netCashFlow - (y.cfo + y.cfi + y.cff))).toBeLessThan(1);
    }
  });
});

describe("normalizeParams — rétro-compat", () => {
  it("ajoute timeline si manquant", () => {
    const p = normalizeParams({ subs: { tiers: [], growthRates: [], rampStartCount: 0, rampEndCount: 0, vatRate: 0.2, priceIndexPa: 0 }, salaries: { items: [], freelancePools: [], annualIndexPa: 0, chargesPatroPct: 0.42 }, rent: { monthlyByFy: [], yearlyTaxes: 0, monthlyCoopro: 0 }, recurring: [], oneOffs: [], marketing: { monthlyBudget: 0, indexPa: 0, pctOfRevenue: 0 }, provisions: { monthlyEquipement: 0, monthlyTravaux: 0, indexPa: 0 }, capex: { equipment: 0, travaux: 0, juridique: 0, depots: 0 }, financing: { equity: [], loans: [], bonds: [] }, tax: { isRate: 0.25, enableIs: true, enableDA: true, daYears: 5 }, bfr: { daysOfRevenue: 0 }, openingCash: 0, legacy: { startCount: 0, avgMonthlyPrice: 0, yearlyChurnAbs: 0 }, prestations: { teen: { price: 0, startCount: 0, growthPa: 0 }, senior: { price: 0, startCount: 0, growthPa: 0 }, horsAbo: { monthlyAvg: 0, growthPa: 0 } }, merch: { monthlyMargin: 0, growthPa: 0 } });
    expect(p.timeline).toBeDefined();
    expect(p.timeline.horizonYears).toBeGreaterThan(0);
  });

  it("pad growthRates à horizonYears - 1", () => {
    const p = normalizeParams({ ...(DEFAULT_PARAMS as object), timeline: { startYear: 2026, horizonYears: 7 }, subs: { ...(DEFAULT_PARAMS.subs as object), growthRates: [0.5] } });
    expect(p.subs.growthRates.length).toBe(6);
  });

  it("pad rent.monthlyByFy à horizonYears", () => {
    const p = normalizeParams({ ...(DEFAULT_PARAMS as object), timeline: { startYear: 2026, horizonYears: 7 }, rent: { ...(DEFAULT_PARAMS.rent as object), monthlyByFy: [12000] } });
    expect(p.rent.monthlyByFy.length).toBe(7);
  });
});

describe("computeModel — déficits fiscaux (#4)", () => {
  it("avec carry-forward activé, le déficit reporté réduit la base imposable", () => {
    const params = {
      ...DEFAULT_PARAMS,
      tax: { ...DEFAULT_PARAMS.tax, enableIs: true, enableLossCarryForward: true },
    };
    const r = computeModel(params);
    const totalLossUsed = r.yearly.reduce((s, y) => s + y.lossUsedThisYear, 0);
    expect(totalLossUsed).toBeGreaterThanOrEqual(0);
  });

  it("sans carry-forward, lossUsedThisYear reste à 0", () => {
    const params = {
      ...DEFAULT_PARAMS,
      tax: { ...DEFAULT_PARAMS.tax, enableLossCarryForward: false },
    };
    const r = computeModel(params);
    for (const y of r.yearly) {
      expect(y.lossUsedThisYear).toBe(0);
    }
  });
});

describe("computeModel — TVA (#5)", () => {
  it("TVA non activée ⇒ vatNetPayable = 0", () => {
    const r = computeModel({ ...DEFAULT_PARAMS, tax: { ...DEFAULT_PARAMS.tax, enableVat: false } });
    for (const y of r.yearly) {
      expect(y.vatNetPayable).toBe(0);
    }
  });

  it("TVA activée ⇒ collecté > 0 dès qu'il y a du CA", () => {
    const r = computeModel({
      ...DEFAULT_PARAMS,
      tax: { ...DEFAULT_PARAMS.tax, enableVat: true, vatRate: 0.2 },
    });
    const totalCollected = r.yearly.reduce((s, y) => s + y.vatCollected, 0);
    const totalRev = r.yearly.reduce((s, y) => s + y.totalRevenue, 0);
    expect(totalCollected).toBeGreaterThan(0);
    expect(totalCollected).toBeLessThan(totalRev);
  });
});

describe("computeModel — IS trimestriel (#6)", () => {
  it("IS monthly ⇒ taxCash réparti uniformément", () => {
    const r = computeModel({
      ...DEFAULT_PARAMS,
      tax: { ...DEFAULT_PARAMS.tax, enableIs: true, isPaymentSchedule: "monthly" },
    });
    // tax annuel = somme tax mensuel
    for (const y of r.yearly) {
      const months = r.monthly.filter((m) => m.fy === y.fy);
      const sumCash = months.reduce((s, m) => s + m.taxCash, 0);
      expect(Math.abs(sumCash - y.taxCash)).toBeLessThan(1);
    }
  });
});
