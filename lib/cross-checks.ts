import type { ModelParams, ModelResult, MonthlyComputed, YearlyComputed } from "./model/types";

export type CheckSeverity = "ok" | "warning" | "error";

export type CrossCheck = {
  id: string;
  category: "P&L" | "Cashflow" | "Bilan" | "Mensuel" | "Cohérence";
  label: string;
  severity: CheckSeverity;
  expected: number;
  actual: number;
  delta: number;
  pctDelta: number;
  scope?: string; // ex: "FY26"
};

const TOLERANCE_ABS = 1; // € — arrondis float
const TOLERANCE_PCT = 0.001; // 0.1%

function makeCheck(
  id: string,
  category: CrossCheck["category"],
  label: string,
  expected: number,
  actual: number,
  scope?: string
): CrossCheck {
  const delta = actual - expected;
  const pctDelta = expected !== 0 ? Math.abs(delta) / Math.abs(expected) : 0;
  const severity: CheckSeverity =
    Math.abs(delta) <= TOLERANCE_ABS || pctDelta <= TOLERANCE_PCT
      ? "ok"
      : pctDelta < 0.01
        ? "warning"
        : "error";
  return { id, category, label, severity, expected, actual, delta, pctDelta, scope };
}

export function runCrossChecks(p: ModelParams, r: ModelResult): CrossCheck[] {
  const checks: CrossCheck[] = [];

  for (const y of r.yearly) {
    const fy = y.label;

    // P&L cohérence
    checks.push(
      makeCheck(
        `pnl-rev-sum-${fy}`,
        "P&L",
        "CA = abos + legacy + prestations + merch",
        y.subsRevenue + y.legacyRevenue + y.prestationsRevenue + y.merchRevenue,
        y.totalRevenue,
        fy
      )
    );
    checks.push(
      makeCheck(
        `pnl-opex-sum-${fy}`,
        "P&L",
        "OPEX = salaires + loyer + récurrent + marketing + provisions + ponctuels",
        y.salaries + y.rent + y.recurring + y.marketing + y.provisions + y.oneOff,
        y.totalOpex,
        fy
      )
    );
    checks.push(
      makeCheck(
        `pnl-ebitda-${fy}`,
        "P&L",
        "EBITDA = CA − OPEX",
        y.totalRevenue - y.totalOpex,
        y.ebitda,
        fy
      )
    );
    checks.push(
      makeCheck(`pnl-ebit-${fy}`, "P&L", "EBIT = EBITDA − D&A", y.ebitda - y.da, y.ebit, fy)
    );
    checks.push(
      makeCheck(
        `pnl-pbt-${fy}`,
        "P&L",
        "PBT = EBIT − intérêts",
        y.ebit - y.interestExpense,
        y.pbt,
        fy
      )
    );
    checks.push(
      makeCheck(
        `pnl-net-${fy}`,
        "P&L",
        "Résultat net = PBT − impôts (charge)",
        y.pbt - y.tax,
        y.netIncome,
        fy
      )
    );

    // Cashflow cohérence
    checks.push(
      makeCheck(
        `cf-net-${fy}`,
        "Cashflow",
        "Variation tréso = CFO + CFI + CFF",
        y.cfo + y.cfi + y.cff,
        y.netCashFlow,
        fy
      )
    );

    // Mensuel → annuel
    const monthsOfFy = r.monthly.filter((m) => m.fy === y.fy);
    if (monthsOfFy.length > 0) {
      const sumMonthly = (k: keyof MonthlyComputed) =>
        monthsOfFy.reduce((s, m) => s + (m[k] as number), 0);
      checks.push(
        makeCheck(
          `m2y-rev-${fy}`,
          "Mensuel",
          "Σ revenue mensuel = revenue annuel",
          sumMonthly("totalRevenue"),
          y.totalRevenue,
          fy
        )
      );
      checks.push(
        makeCheck(
          `m2y-opex-${fy}`,
          "Mensuel",
          "Σ OPEX mensuel = OPEX annuel",
          sumMonthly("totalOpex"),
          y.totalOpex,
          fy
        )
      );
      checks.push(
        makeCheck(
          `m2y-ebitda-${fy}`,
          "Mensuel",
          "Σ EBITDA mensuel = EBITDA annuel",
          sumMonthly("ebitda"),
          y.ebitda,
          fy
        )
      );
      const lastMonth = monthsOfFy[monthsOfFy.length - 1];
      checks.push(
        makeCheck(
          `m2y-cash-${fy}`,
          "Mensuel",
          "Tréso fin FY = solde dernier mois",
          lastMonth.cashBalance,
          y.cashEnd,
          fy
        )
      );
    }
  }

  // Variation tréso cumulée = cashEnd - openingCash
  const lastFy = r.yearly[r.yearly.length - 1];
  if (lastFy) {
    const sumNetCash = r.yearly.reduce((s, y) => s + y.netCashFlow, 0);
    checks.push(
      makeCheck(
        "cf-cumul-cash",
        "Cashflow",
        "Σ ΔTréso = tréso fin − ouverture",
        lastFy.cashEnd - p.openingCash,
        sumNetCash,
        "horizon"
      )
    );
  }

  // Bilan: actif = passif (calc rapide)
  // On reproduit le calcul de /balance-sheet
  const totalCapex =
    p.capex.equipment + p.capex.travaux + p.capex.juridique + p.capex.depots;
  const yEquip = p.tax.amortYearsEquipment ?? p.tax.daYears ?? 5;
  const yTrav = p.tax.amortYearsTravaux ?? 10;
  for (let fy = 0; fy < r.yearly.length; fy++) {
    const y = r.yearly[fy];
    const monthsToEnd = (fy + 1) * 12;
    const cumAmortEquip = p.tax.enableDA
      ? Math.min(p.capex.equipment, (p.capex.equipment / Math.max(1, yEquip * 12)) * monthsToEnd)
      : 0;
    const cumAmortTrav = p.tax.enableDA
      ? Math.min(p.capex.travaux, (p.capex.travaux / Math.max(1, yTrav * 12)) * monthsToEnd)
      : 0;
    const immoBrute = totalCapex;
    const immoNette = immoBrute - cumAmortEquip - cumAmortTrav;
    const tresorerie = y.cashEnd;
    const bfr = (y.totalRevenue / 12) * (p.bfr.daysOfRevenue / 30);
    const totalActif = immoNette + tresorerie + bfr;

    const equityRaised = (p.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
    const cumNetIncome = r.yearly.slice(0, fy + 1).reduce((s, x) => s + x.netIncome, 0);
    const capitauxPropres = equityRaised + cumNetIncome;

    const slice = r.monthly.slice(0, monthsToEnd);
    const bondPrincipalRepaid = slice.reduce((s, m) => s + m.bondPrincipalRepay, 0);
    const loanPrincipalRepaid = slice.reduce((s, m) => s + m.loanPrincipalRepay, 0);
    const dette =
      Math.max(
        0,
        (p.financing.bonds ?? []).reduce((s, b) => s + b.principal, 0) -
          bondPrincipalRepaid +
          (p.financing.loans ?? []).reduce((s, l) => s + l.principal, 0) -
          loanPrincipalRepaid
      );
    const totalPassif = capitauxPropres + dette;
    checks.push(
      makeCheck(
        `bs-balance-${y.label}`,
        "Bilan",
        "Total Actif = Total Passif",
        totalActif,
        totalPassif,
        y.label
      )
    );
  }

  return checks;
}

export function summarizeChecks(checks: CrossCheck[]): {
  ok: number;
  warning: number;
  error: number;
  total: number;
} {
  return {
    ok: checks.filter((c) => c.severity === "ok").length,
    warning: checks.filter((c) => c.severity === "warning").length,
    error: checks.filter((c) => c.severity === "error").length,
    total: checks.length,
  };
}

export function _unused(_y: YearlyComputed) {
  // pour retenir le type import
}
