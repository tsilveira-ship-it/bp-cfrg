import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS } from "@/lib/model/defaults";
import { computeModel } from "@/lib/model/compute";

/**
 * Sanity check — vérifie l'état réel des métriques de rupture sur les deux
 * scénarios de référence. Sert à valider que le verdict reverse-stress
 * "already-broken" reflète bien la réalité du compute, pas un bug.
 */
describe("Baseline sanity — métriques de rupture sur scénarios de référence", () => {
  it("DEFAULT_PARAMS — diagnostic métriques", () => {
    const r = computeModel(DEFAULT_PARAMS);
    const last = r.yearly[r.yearly.length - 1];

    console.log("=== DEFAULT_PARAMS ===");
    console.log("  cashTrough:", r.cashTroughValue.toFixed(0), "€  (mois", r.cashTroughMonth, ")");
    console.log("  breakEvenMonth:", r.breakEvenMonth);
    console.log("  EBITDA last FY:", last?.ebitda?.toFixed(0), "€");
    console.log("  netIncome last FY:", last?.netIncome?.toFixed(0), "€");
    console.log("  cashEnd:", last?.cashEnd?.toFixed(0), "€");
    // DSCR
    for (let fy = 0; fy < r.yearly.length; fy++) {
      const months = r.monthly.slice(fy * 12, (fy + 1) * 12);
      const interest = months.reduce((s, m) => s + m.interestExpense, 0);
      const principal = months.reduce((s, m) => s + m.loanPrincipalRepay + m.bondPrincipalRepay, 0);
      const debtService = interest + principal;
      const ebitda = r.yearly[fy].ebitda;
      const dscr = debtService > 0 ? ebitda / debtService : Infinity;
      console.log(`  FY${fy} EBITDA=${ebitda.toFixed(0)} debt service=${debtService.toFixed(0)} DSCR=${isFinite(dscr) ? dscr.toFixed(2) : "∞"}`);
    }
    expect(r).toBeDefined();
  });

  it("AUDIT_CORRECTED_PARAMS — diagnostic métriques", () => {
    const r = computeModel(AUDIT_CORRECTED_PARAMS);
    const last = r.yearly[r.yearly.length - 1];

    console.log("=== AUDIT_CORRECTED_PARAMS ===");
    console.log("  cashTrough:", r.cashTroughValue.toFixed(0), "€  (mois", r.cashTroughMonth, ")");
    console.log("  breakEvenMonth:", r.breakEvenMonth);
    console.log("  EBITDA last FY:", last?.ebitda?.toFixed(0), "€");
    console.log("  netIncome last FY:", last?.netIncome?.toFixed(0), "€");
    console.log("  cashEnd:", last?.cashEnd?.toFixed(0), "€");
    for (let fy = 0; fy < r.yearly.length; fy++) {
      const months = r.monthly.slice(fy * 12, (fy + 1) * 12);
      const interest = months.reduce((s, m) => s + m.interestExpense, 0);
      const principal = months.reduce((s, m) => s + m.loanPrincipalRepay + m.bondPrincipalRepay, 0);
      const debtService = interest + principal;
      const ebitda = r.yearly[fy].ebitda;
      const dscr = debtService > 0 ? ebitda / debtService : Infinity;
      console.log(`  FY${fy} EBITDA=${ebitda.toFixed(0)} debt service=${debtService.toFixed(0)} DSCR=${isFinite(dscr) ? dscr.toFixed(2) : "∞"}`);
    }
    expect(r).toBeDefined();
  });
});
