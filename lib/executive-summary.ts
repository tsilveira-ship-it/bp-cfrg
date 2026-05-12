import type { ModelParams, ModelResult } from "./model/types";
import { fmtCurrency, fmtPct } from "./format";

export type ExecSection = {
  title: string;
  paragraphs: string[];
};

export function buildExecutiveSummary(p: ModelParams, r: ModelResult): ExecSection[] {
  const firstFy = r.yearly[0];
  const lastFy = r.yearly[r.yearly.length - 1];
  const totalEquity = (p.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const totalLoans = (p.financing.loans ?? []).reduce((s, x) => s + x.principal, 0);
  const totalBonds = (p.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);
  const totalRaised = totalEquity + totalLoans + totalBonds;
  const totalCapex =
    p.capex.equipment + p.capex.travaux + p.capex.juridique + p.capex.depots;
  const cagrCA =
    firstFy.totalRevenue > 0
      ? Math.pow(lastFy.totalRevenue / firstFy.totalRevenue, 1 / Math.max(1, r.yearly.length - 1)) - 1
      : 0;
  const tiers = p.subs.tiers ?? [];
  const avgPrice = tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
  const breakEvenLabel =
    r.breakEvenMonth !== null
      ? r.monthLabels[r.breakEvenMonth] ?? `M${r.breakEvenMonth}`
      : null;
  const cumulativeNetIncome = r.yearly.reduce((s, y) => s + y.netIncome, 0);
  const cumulativeEbitda = r.yearly.reduce((s, y) => s + y.ebitda, 0);
  const lastSubsCount = r.monthly[r.monthly.length - 1]?.subsCount ?? 0;

  return [
    {
      title: "Contexte & projet",
      paragraphs: [
        `CrossFit Rive Gauche (CFRG) est un projet de box CrossFit/Hyrox/sandbox basé à Paris, ` +
          `avec ouverture prévue en septembre ${p.timeline.startYear}. Le business plan projette ` +
          `${p.timeline.horizonYears} années d'exploitation jusqu'en ${lastFy.label}.`,
        `Le modèle économique repose sur ${tiers.length} tier(s) d'abonnement (prix moyen pondéré ` +
          `${fmtCurrency(avgPrice)}/mois TTC) avec une cible de ${Math.round(lastSubsCount)} ` +
          `membres en fin d'horizon, alimentée par un funnel commercial dimensionné (leads → ` +
          `appels freelance → bilans → abonnements). Complété par des prestations (cours teen, ` +
          `senior, hors-abo) et du merchandising.`,
      ],
    },
    {
      title: "Trajectoire financière",
      paragraphs: [
        `Le CA cible ${fmtCurrency(lastFy.totalRevenue, { compact: true })} en ${lastFy.label} ` +
          `(${fmtPct(cagrCA, 0)} CAGR sur l'horizon), porté par ${lastSubsCount} membres en fin ` +
          `de période. L'EBITDA atteint ${fmtCurrency(lastFy.ebitda, { compact: true })} ` +
          `(marge ${fmtPct(lastFy.ebitdaMargin, 0)}), soit ${fmtCurrency(cumulativeEbitda, { compact: true })} ` +
          `cumulés sur la période.`,
        breakEvenLabel
          ? `Break-even atteint en ${breakEvenLabel}, après une phase d'investissement initial de ` +
            `${fmtCurrency(totalCapex, { compact: true })}. Le résultat net cumulé sur l'horizon ` +
            `s'élève à ${fmtCurrency(cumulativeNetIncome, { compact: true })}.`
          : `Le break-even EBITDA n'est pas atteint sur l'horizon. La maturité du modèle ` +
            `nécessite probablement une projection plus longue ou une accélération du ramp-up.`,
      ],
    },
    {
      title: "Plan de financement",
      paragraphs: [
        `Levée totale: ${fmtCurrency(totalRaised, { compact: true })}, structurée en ${fmtCurrency(totalEquity, { compact: true })} ` +
          `de fonds propres (${fmtPct(totalRaised > 0 ? totalEquity / totalRaised : 0, 0)}), ` +
          `${fmtCurrency(totalLoans, { compact: true })} d'emprunts bancaires ` +
          `(${fmtPct(totalRaised > 0 ? totalLoans / totalRaised : 0, 0)}) et ` +
          `${fmtCurrency(totalBonds, { compact: true })} d'obligations ` +
          `(${fmtPct(totalRaised > 0 ? totalBonds / totalRaised : 0, 0)}).`,
        `Les emplois se répartissent entre ${fmtCurrency(totalCapex, { compact: true })} ` +
          `de CAPEX (équipement, travaux, dépôts juridiques) et ${fmtCurrency(totalRaised - totalCapex, { compact: true })} ` +
          `de buffer trésorerie pour couvrir la phase de ramp-up et le BFR. ` +
          `Trésorerie minimale (creux): ${fmtCurrency(r.cashTroughValue, { compact: true })}, ` +
          `tréso finale: ${fmtCurrency(lastFy.cashEnd, { compact: true })}.`,
      ],
    },
    {
      title: "Hypothèses critiques",
      paragraphs: [
        `Le BP cible ${Math.round(lastSubsCount)} membres en fin d'horizon (référence: 250-450 pour boxes ` +
          `Paris matures), un churn mensuel de ${fmtPct(p.subs.monthlyChurnPct ?? 0, 1)} ` +
          `(industrie fitness 3-5%, CrossFit communauté 1.5-3%), et une indexation prix de ${fmtPct(p.subs.priceIndexPa, 0)}/an.`,
        `Côté coûts: loyer ${fmtCurrency(p.rent.monthlyByFy[0] ?? 0, { compact: true })}/mois en M0 ` +
          `(à valider sur lettre d'intention/bail), masse salariale avec charges patronales ` +
          `${fmtPct(p.salaries.chargesPatroPct, 0)}, marketing ${fmtCurrency(p.marketing.monthlyBudget, { compact: true })}/mois ` +
          `+ ${fmtPct(p.marketing.pctOfRevenue, 0)} du CA.`,
      ],
    },
    {
      title: "Modèle & toggles activés",
      paragraphs: [
        `Configuration fiscale: ${p.tax.enableIs ? "IS activé à " + fmtPct(p.tax.isRate, 0) : "IS désactivé"}, ` +
          `${p.tax.enableDA ? "amortissements activés" : "amortissements désactivés"}, ` +
          `${p.tax.enableLossCarryForward !== false ? "carry-forward des déficits activé" : "carry-forward désactivé"}, ` +
          `${p.tax.enableVat ? "TVA modélisée" : "TVA non modélisée (P&L en TTC)"}, ` +
          `IS ${p.tax.isPaymentSchedule === "quarterly" ? "trimestriel" : "lissé mensuel"}.`,
        `Le moteur de calcul est open-source (github.com/tsilveira-ship-it/bp-cfrg), avec ` +
          `validation automatique de cohérence sur 12+ contrôles (P&L↔cashflow↔bilan, ` +
          `mensuel↔annuel). Le scénario peut être exporté en Excel ou JSON pour audit indépendant.`,
      ],
    },
    {
      title: "Risques & sensibilités",
      paragraphs: [
        r.cashTroughValue < 0
          ? `🚨 Trésorerie négative: le creux atteint ${fmtCurrency(r.cashTroughValue, { compact: true })}. ` +
            `Le BP n'est pas finançable en l'état — renforcer apports, accélérer revenue ou réduire CAPEX.`
          : `Le buffer trésorerie est positif sur tout l'horizon (creux ${fmtCurrency(r.cashTroughValue, { compact: true })}). ` +
            `Le BP est finançable avec la structure actuelle.`,
        `Les drivers les plus sensibles (à tester via /sensitivity) sont : nombre de membres en ramp-up, ` +
          `prix moyen de l'abonnement, churn, et masse salariale. Une variation de ±20% sur ces ` +
          `drivers peut faire basculer le break-even.`,
      ],
    },
  ];
}
