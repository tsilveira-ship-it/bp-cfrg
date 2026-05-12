"use client";
import * as XLSX from "xlsx";
import type { ModelParams, ModelResult } from "./model/types";

export type Sheet = {
  name: string;
  rows: (string | number)[][];     // 2D, première ligne = en-têtes
};

export function downloadXlsx(sheets: Sheet[], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31)); // 31 char limit
  }
  XLSX.writeFile(wb, filename);
}

export function buildPnlSheet(r: ModelResult): Sheet {
  const head = ["Ligne", ...r.yearly.map((y) => y.label)];
  const rows: (string | number)[][] = [head];
  const add = (label: string, getter: (y: ModelResult["yearly"][number]) => number) =>
    rows.push([label, ...r.yearly.map(getter)]);

  add("CA total", (y) => y.totalRevenue);
  add("  ↳ Nouveaux abos", (y) => y.subsRevenue);
  add("  ↳ Legacy", (y) => y.legacyRevenue);
  add("  ↳ Prestations", (y) => y.prestationsRevenue);
  add("  ↳ Merchandising", (y) => y.merchRevenue);
  add("Salaires", (y) => -y.salaries);
  add("Loyer", (y) => -y.rent);
  add("Récurrent", (y) => -y.recurring);
  add("Marketing", (y) => -y.marketing);
  add("Provisions", (y) => -y.provisions);
  add("Ponctuels", (y) => -y.oneOff);
  add("Total OPEX", (y) => -y.totalOpex);
  add("EBITDA", (y) => y.ebitda);
  add("Marge EBITDA %", (y) => y.ebitdaMargin);
  add("D&A", (y) => -y.da);
  add("EBIT", (y) => y.ebit);
  add("Intérêts", (y) => -y.interestExpense);
  add("PBT", (y) => y.pbt);
  add("Déficit utilisé", (y) => -y.lossUsedThisYear);
  add("Base imposable après carry-forward", (y) => y.taxableIncomeAfterCarryForward);
  add("Solde déficits reportables (fin)", (y) => y.lossCarryForwardBalanceEnd);
  add("Impôts (charge)", (y) => -y.tax);
  add("Impôts cash", (y) => -y.taxCash);
  add("Résultat net", (y) => y.netIncome);
  return { name: "P&L", rows };
}

export function buildCashflowSheet(r: ModelResult): Sheet {
  const head = ["Flux", ...r.yearly.map((y) => y.label)];
  const rows: (string | number)[][] = [head];
  const add = (label: string, getter: (y: ModelResult["yearly"][number]) => number) =>
    rows.push([label, ...r.yearly.map(getter)]);

  add("EBITDA", (y) => y.ebitda);
  add("− Impôts cash", (y) => -y.taxCash);
  add("− TVA nette", (y) => -y.vatNetPayable);
  add("CFO", (y) => y.cfo);
  add("− CAPEX", (y) => -y.capex);
  add("CFI", (y) => y.cfi);
  add("CFF", (y) => y.cff);
  add("Variation tréso", (y) => y.netCashFlow);
  add("Tréso fin d'exercice", (y) => y.cashEnd);
  return { name: "Cashflow", rows };
}

export function buildMonthlySheet(r: ModelResult): Sheet {
  const head = [
    "Mois",
    "Label",
    "FY",
    "Subs count",
    "Legacy count",
    "CA",
    "Salaires",
    "Loyer",
    "Récurrent (entr.)",
    "Récurrent (frais op.)",
    "Marketing",
    "Provisions",
    "Ponctuels",
    "OPEX total",
    "EBITDA",
    "D&A",
    "EBIT",
    "Intérêts",
    "PBT",
    "Tax (P&L)",
    "Tax cash",
    "TVA collectée",
    "TVA déductible",
    "TVA cashout",
    "Résultat net",
    "CAPEX",
    "BFR change",
    "Loan principal repay",
    "Bond principal repay",
    "Apports (fundraise)",
    "CFO",
    "CFI",
    "CFF",
    "Variation tréso",
    "Solde tréso",
  ];
  const rows: (string | number)[][] = [head];
  for (const m of r.monthly) {
    rows.push([
      m.month,
      m.label,
      m.fy,
      m.subsCount,
      m.legacyCount,
      m.totalRevenue,
      m.salaries,
      m.rent,
      m.recurringEntretien,
      m.recurringFraisOp,
      m.marketing,
      m.provisions,
      m.oneOff,
      m.totalOpex,
      m.ebitda,
      m.da,
      m.ebit,
      m.interestExpense,
      m.pbt,
      m.tax,
      m.taxCash,
      m.vatCollected,
      m.vatDeductible,
      m.vatCashOut,
      m.netIncome,
      m.capex,
      m.bfrChange,
      m.loanPrincipalRepay,
      m.bondPrincipalRepay,
      m.fundraise,
      m.cfo,
      m.cfi,
      m.cff,
      m.netCashFlow,
      m.cashBalance,
    ]);
  }
  return { name: "Monthly", rows };
}

export function buildAssumptionsSheet(p: ModelParams): Sheet {
  const rows: (string | number)[][] = [["Catégorie", "Paramètre", "Valeur"]];
  rows.push(["Timeline", "Année de démarrage (Sept N)", p.timeline.startYear]);
  rows.push(["Timeline", "Horizon (années)", p.timeline.horizonYears]);
  // Acquisitions cibles par FY (cohort) — driver principal du compte d'abos
  const acqByFy = p.subs.cohortModel?.acquisitionByFy ?? [];
  acqByFy.forEach((v, i) => rows.push([`Subs cohort`, `Acquisitions/mois FY${i}`, v]));
  rows.push(["Subs", "Indexation prix p.a.", p.subs.priceIndexPa]);
  rows.push(["Subs", "Churn mensuel", p.subs.monthlyChurnPct ?? 0]);
  rows.push(["Subs", "TVA", p.subs.vatRate]);
  for (let i = 0; i < p.subs.tiers.length; i++) {
    const t = p.subs.tiers[i];
    rows.push([`Tier ${i + 1}`, `${t.name} prix`, t.monthlyPrice]);
    rows.push([`Tier ${i + 1}`, `${t.name} mix %`, t.mixPct]);
  }
  rows.push(["Legacy", "Membres au démarrage", p.legacy.startCount]);
  rows.push(["Legacy", "Prix moyen €/mois", p.legacy.avgMonthlyPrice]);
  rows.push(["Legacy", "Churn annuel", p.legacy.yearlyChurnAbs]);
  rows.push(["Salaires", "Charges patronales %", p.salaries.chargesPatroPct]);
  rows.push(["Salaires", "Indexation annuelle", p.salaries.annualIndexPa]);
  rows.push(["Salaires", "Nb postes salariés", p.salaries.items.length]);
  rows.push(["Salaires", "Nb pools freelance", (p.salaries.freelancePools ?? []).length]);
  rows.push(["Loyer", "Loyer M0 (€/mois)", p.rent.monthlyByFy[0] ?? 0]);
  rows.push(["Loyer", "Charges copro €/mois", p.rent.monthlyCoopro]);
  rows.push(["Loyer", "Taxes annuelles", p.rent.yearlyTaxes]);
  rows.push(["Marketing", "Budget mensuel €", p.marketing.monthlyBudget]);
  rows.push(["Marketing", "% du CA", p.marketing.pctOfRevenue]);
  rows.push(["CAPEX", "Équipement €", p.capex.equipment]);
  rows.push(["CAPEX", "Travaux €", p.capex.travaux]);
  rows.push(["CAPEX", "Juridique €", p.capex.juridique]);
  rows.push(["CAPEX", "Dépôts €", p.capex.depots]);
  rows.push([
    "Financement",
    "Total equity",
    (p.financing.equity ?? []).reduce((s, x) => s + x.amount, 0),
  ]);
  rows.push([
    "Financement",
    "Total emprunts",
    (p.financing.loans ?? []).reduce((s, x) => s + x.principal, 0),
  ]);
  rows.push([
    "Financement",
    "Total obligations",
    (p.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0),
  ]);
  rows.push(["Fiscalité", "IS activé", p.tax.enableIs ? 1 : 0]);
  rows.push(["Fiscalité", "Taux IS", p.tax.isRate]);
  rows.push(["Fiscalité", "D&A activé", p.tax.enableDA ? 1 : 0]);
  rows.push(["Fiscalité", "Carry-forward", p.tax.enableLossCarryForward !== false ? 1 : 0]);
  rows.push(["Fiscalité", "TVA modélisée", p.tax.enableVat ? 1 : 0]);
  rows.push(["Fiscalité", "IS schedule", p.tax.isPaymentSchedule ?? "monthly"]);
  rows.push(["BFR", "Jours de CA", p.bfr.daysOfRevenue]);
  rows.push(["Tréso", "Ouverture", p.openingCash]);
  return { name: "Hypothèses", rows };
}

export function exportFullScenario(p: ModelParams, r: ModelResult, scenarioLabel = "scenario") {
  const sheets: Sheet[] = [
    buildAssumptionsSheet(p),
    buildPnlSheet(r),
    buildCashflowSheet(r),
    buildMonthlySheet(r),
  ];
  const date = new Date().toISOString().slice(0, 10);
  downloadXlsx(sheets, `bp-cfrg-${scenarioLabel}-${date}.xlsx`);
}
