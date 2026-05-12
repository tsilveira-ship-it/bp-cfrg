import type { ModelParams } from "./model/types";
import { fmtCurrency, fmtPct, fmtNum } from "./format";

export type KeyHypothesis = {
  rank: number;
  category: string;
  label: string;
  value: string;
  rawValue: number;
  paths: string[];     // chemins params concernés
  rationale?: string;  // contexte rapide pour l'analyste
  noteKey?: string;    // si une note utilisateur existe (params.fieldNotes)
};

export function topKeyHypotheses(p: ModelParams, n = 10): KeyHypothesis[] {
  const tiers = p.subs.tiers ?? [];
  const avgPrice = tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
  const totalSalariesMonth =
    p.salaries.items.reduce((s, it) => s + it.monthlyGross * it.fte, 0) *
    (1 + p.salaries.chargesPatroPct);
  const freelanceMonth = (p.salaries.freelancePools ?? []).reduce(
    (s, pool) => s + pool.hourlyRate * (pool.monthlyHours ?? 0),
    0
  );
  const equipTrav = p.capex.equipment + p.capex.travaux;
  const equity = (p.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const loans = (p.financing.loans ?? []).reduce((s, x) => s + x.principal, 0);
  const bonds = (p.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);
  const totalRaised = equity + loans + bonds;
  // Driver #1 = acquisitions/mois cibles (cohort.acquisitionByFy). Remplace l'ancien
  // `rampEndCount` qui dépendait du mode NET legacy supprimé.
  const acqByFy = p.subs.cohortModel?.acquisitionByFy ?? [];
  const acqFy0 = acqByFy[0] ?? 0;
  const acqFy1 = acqByFy[1] ?? acqFy0;
  const growthFy0Fy1 = acqFy0 > 0 ? acqFy1 / acqFy0 - 1 : 0;
  const allHypotheses: KeyHypothesis[] = [
    {
      rank: 1,
      category: "Recettes",
      label: "Acquisitions / mois (Y1)",
      value: `${fmtNum(acqFy0)} acquis./mois`,
      rawValue: acqFy0,
      paths: ["subs.cohortModel.acquisitionByFy.0"],
      rationale: "Driver #1 du compte d'abos. Saisi dans le mode cohort. 1 abo signé par X leads × taux conversion funnel.",
    },
    {
      rank: 2,
      category: "Recettes",
      label: "Prix moyen abo (mix pondéré)",
      value: `${fmtCurrency(avgPrice, { compact: true })}/mois`,
      rawValue: avgPrice,
      paths: tiers.map((_, i) => `subs.tiers.${i}.monthlyPrice`),
      rationale: "Comparables CrossFit Paris 13/RG: 130-220€/mois selon formule.",
    },
    {
      rank: 3,
      category: "Recettes",
      label: `Croissance acquisitions Y1 → Y2`,
      value: fmtPct(growthFy0Fy1, 0),
      rawValue: growthFy0Fy1,
      paths: ["subs.cohortModel.acquisitionByFy.1"],
      rationale: "Acquisitions cibles passent de FY0 à FY1. 20-30% typique post-ouverture.",
    },
    {
      rank: 4,
      category: "Charges",
      label: "Masse salariale (cadres, mensuelle)",
      value: `${fmtCurrency(totalSalariesMonth, { compact: true })}/mois`,
      rawValue: totalSalariesMonth,
      paths: p.salaries.items.map((_, i) => `salaries.items.${i}.monthlyGross`),
      rationale: `${p.salaries.items.length} poste(s) salarié(s) × charges patronales ${fmtPct(p.salaries.chargesPatroPct, 0)}.`,
    },
    {
      rank: 5,
      category: "Charges",
      label: "Coachs freelance (mensuel)",
      value: `${fmtCurrency(freelanceMonth, { compact: true })}/mois`,
      rawValue: freelanceMonth,
      paths: (p.salaries.freelancePools ?? []).map((_, i) => `salaries.freelancePools.${i}.hourlyRate`),
      rationale: "Tarif coach freelance Paris: 35-50€/h selon spécialité.",
    },
    {
      rank: 6,
      category: "Charges",
      label: "Loyer M0 (€/mois)",
      value: fmtCurrency(p.rent.monthlyByFy[0] ?? 0, { compact: true }),
      rawValue: p.rent.monthlyByFy[0] ?? 0,
      paths: ["rent.monthlyByFy.0"],
      rationale: "Doit reposer sur lettre d'intention bailleur ou bail signé.",
    },
    {
      rank: 7,
      category: "Investissement",
      label: "CAPEX équipement + travaux",
      value: fmtCurrency(equipTrav, { compact: true }),
      rawValue: equipTrav,
      paths: ["capex.equipment", "capex.travaux"],
      rationale: "Devis d'équipement (racks, machines) et chiffrage maître d'œuvre/architecte.",
    },
    {
      rank: 8,
      category: "Financement",
      label: "Levée totale (equity + dette)",
      value: fmtCurrency(totalRaised, { compact: true }),
      rawValue: totalRaised,
      paths: ["financing.equity", "financing.loans", "financing.bonds"],
      rationale: `Equity ${fmtCurrency(equity, { compact: true })} + Loans ${fmtCurrency(loans, { compact: true })} + Bonds ${fmtCurrency(bonds, { compact: true })}.`,
    },
    {
      rank: 9,
      category: "Recettes",
      label: "Churn mensuel des nouveaux abos",
      value: fmtPct(p.subs.monthlyChurnPct ?? 0, 1),
      rawValue: p.subs.monthlyChurnPct ?? 0,
      paths: ["subs.monthlyChurnPct"],
      rationale: "Industrie fitness: 3-5%/mois. CrossFit communauté forte: 1.5-3%.",
    },
    {
      rank: 10,
      category: "Charges",
      label: "Marketing mensuel (budget fixe)",
      value: fmtCurrency(p.marketing.monthlyBudget, { compact: true }),
      rawValue: p.marketing.monthlyBudget,
      paths: ["marketing.monthlyBudget", "marketing.pctOfRevenue"],
      rationale: `+ ${fmtPct(p.marketing.pctOfRevenue)} du CA. CAC industrie: 80-150€/membre.`,
    },
  ];
  // Annotation: existence d'une note utilisateur sur le path principal
  const fieldNotes = p.fieldNotes ?? {};
  for (const h of allHypotheses) {
    const noteKey = h.paths.find((path) => fieldNotes[path]);
    if (noteKey) h.noteKey = noteKey;
  }
  return allHypotheses.slice(0, n);
}

export type ModelToggle = {
  key: string;
  label: string;
  on: boolean;
  hint?: string;
};

export function activeToggles(p: ModelParams): ModelToggle[] {
  return [
    { key: "is", label: "IS activé", on: p.tax.enableIs, hint: `Taux ${fmtPct(p.tax.isRate, 0)}` },
    {
      key: "da",
      label: "D&A activé",
      on: p.tax.enableDA,
      hint: `Équip ${p.tax.amortYearsEquipment ?? 5}y / Travaux ${p.tax.amortYearsTravaux ?? 10}y`,
    },
    {
      key: "carry",
      label: "Carry-forward déficits",
      on: p.tax.enableLossCarryForward !== false,
    },
    {
      key: "vat",
      label: "TVA modélisée",
      on: p.tax.enableVat === true,
      hint: p.tax.enableVat
        ? `${fmtPct(p.tax.vatRate ?? p.subs.vatRate, 0)} · ${fmtPct(p.tax.vatDeductibleOpexPct ?? 0.5, 0)} OPEX assujetti`
        : undefined,
    },
    {
      key: "is-quarterly",
      label: "IS trimestriel",
      on: p.tax.isPaymentSchedule === "quarterly",
    },
    {
      key: "bfr-detail",
      label: "BFR détaillé (jours)",
      on:
        p.bfr.daysReceivables !== undefined ||
        p.bfr.daysSupplierPayables !== undefined ||
        p.bfr.daysStock !== undefined,
      hint: `Receivables ${p.bfr.daysReceivables ?? "—"} / Payables ${p.bfr.daysSupplierPayables ?? "—"} / Stock ${p.bfr.daysStock ?? "—"}`,
    },
    {
      key: "capex-detail",
      label: "CAPEX détaillé par poste",
      on: !!p.capexItems && p.capexItems.length > 0,
      hint: p.capexItems ? `${p.capexItems.length} poste(s)` : undefined,
    },
    {
      key: "capacity",
      label: "Capacité paramétrée",
      on: !!p.capacity,
      hint: p.capacity
        ? `${p.capacity.parallelClasses} cours × ${p.capacity.capacityPerClass} (${p.capacity.capacityPerClassMin ?? "?"}-${p.capacity.capacityPerClassMax ?? "?"})`
        : undefined,
    },
  ];
}
