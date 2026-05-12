import { describe, expect, it } from "vitest";
import { INVESTOR_BASE_PARAMS } from "@/lib/model/defaults";
import { computeModel } from "@/lib/model/compute";

/**
 * Sanity check INVESTOR_BASE — diagnostic complet pour itération.
 * Affiche revenue/opex/EBITDA/cash par FY pour ajustement paramètres.
 */
describe("INVESTOR_BASE — diagnostic viabilité", () => {
  it("dump full FY breakdown", () => {
    const r = computeModel(INVESTOR_BASE_PARAMS);
    const last = r.yearly[r.yearly.length - 1];
    console.log("=== INVESTOR_BASE ===");
    console.log("  cashTrough:", r.cashTroughValue.toFixed(0), "€  (mois", r.cashTroughMonth, ")");
    console.log("  breakEvenMonth:", r.breakEvenMonth);
    console.log("  EBITDA last FY:", last?.ebitda?.toFixed(0), "€  (margin",
      ((last?.ebitda ?? 0) / Math.max(1, last?.totalRevenue ?? 1) * 100).toFixed(1), "%)");
    console.log("  netIncome last FY:", last?.netIncome?.toFixed(0), "€");
    console.log("  cashEnd last FY:", last?.cashEnd?.toFixed(0), "€");
    console.log("\n  FY breakdown:");
    for (const y of r.yearly) {
      const months = r.monthly.slice(y.fy * 12, (y.fy + 1) * 12);
      const interest = months.reduce((s, m) => s + m.interestExpense, 0);
      const principal = months.reduce((s, m) => s + m.loanPrincipalRepay + m.bondPrincipalRepay, 0);
      const debtService = interest + principal;
      const dscr = debtService > 0 ? y.ebitda / debtService : Infinity;
      console.log(
        `  FY${y.fy}  rev=${y.totalRevenue.toFixed(0).padStart(7)}  opex=${y.totalOpex.toFixed(0).padStart(7)}  ebitda=${y.ebitda.toFixed(0).padStart(7)}  ds=${debtService.toFixed(0).padStart(6)}  dscr=${(isFinite(dscr) ? dscr.toFixed(2) : "∞").padStart(7)}  cashEnd=${y.cashEnd.toFixed(0).padStart(7)}`
      );
    }
    expect(r).toBeDefined();
  });
});
