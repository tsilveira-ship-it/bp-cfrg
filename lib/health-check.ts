import type { ModelParams, ModelResult } from "./model/types";

export type Severity = "critical" | "warning" | "info" | "ok";

export type HealthIssue = {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  hint?: string;
  link?: { href: string; label: string };
  /** Champ(s) concerné(s) — chemin params (utile pour deep-link). */
  paths?: string[];
};

const PARAMS_LINK = { href: "/parameters", label: "Modifier les paramètres" };

export function runHealthCheck(p: ModelParams, result?: ModelResult): HealthIssue[] {
  const issues: HealthIssue[] = [];

  // 1. Mix abos = 100%
  const totalMix = p.subs.tiers.reduce((s, t) => s + t.mixPct, 0);
  if (Math.abs(totalMix - 1) > 0.001) {
    issues.push({
      id: "subs-mix",
      severity: Math.abs(totalMix - 1) > 0.05 ? "critical" : "warning",
      title: "Mix abonnements ≠ 100%",
      message: `Somme des mixPct = ${(totalMix * 100).toFixed(1)}% (attendu 100%). La revenue moyenne par abo est faussée.`,
      paths: p.subs.tiers.map((_, i) => `subs.tiers.${i}.mixPct`),
      link: PARAMS_LINK,
    });
  } else {
    issues.push({
      id: "subs-mix-ok",
      severity: "ok",
      title: "Mix abonnements = 100% ✓",
      message: `Réparti sur ${p.subs.tiers.length} tier(s).`,
    });
  }

  // 2. Charges patronales bornées
  const patro = p.salaries.chargesPatroPct;
  if (patro < 0 || patro > 1) {
    issues.push({
      id: "patro-out-of-range",
      severity: "critical",
      title: "Charges patronales hors plage [0%, 100%]",
      message: `chargesPatroPct = ${(patro * 100).toFixed(0)}%. Valeur typique cadre: 42%, non-cadre: 40%.`,
      paths: ["salaries.chargesPatroPct"],
      link: PARAMS_LINK,
    });
  }

  // 3. growthRates length cohérent
  const expectedGrowth = Math.max(0, (p.timeline?.horizonYears ?? 7) - 1);
  if ((p.subs.growthRates?.length ?? 0) !== expectedGrowth) {
    issues.push({
      id: "growth-length",
      severity: "warning",
      title: "Croissance abos: longueur incohérente",
      message: `${p.subs.growthRates?.length ?? 0} taux fournis pour ${expectedGrowth} attendus (horizonYears - 1).`,
      paths: ["subs.growthRates"],
      link: PARAMS_LINK,
    });
  }

  // 4. monthlyByFy loyer = horizonYears
  const yRent = p.rent.monthlyByFy?.length ?? 0;
  if (yRent !== p.timeline.horizonYears) {
    issues.push({
      id: "rent-length",
      severity: "warning",
      title: "Loyer: tableau monthlyByFy de mauvaise taille",
      message: `${yRent} valeurs pour ${p.timeline.horizonYears} années. Les FY excédentaires utiliseront la dernière valeur.`,
      paths: ["rent.monthlyByFy"],
      link: PARAMS_LINK,
    });
  }

  // 5. capex items: au moins un poste si capexItems défini
  if (p.capexItems && p.capexItems.length === 0) {
    issues.push({
      id: "capex-empty",
      severity: "warning",
      title: "CAPEX détaillé activé mais vide",
      message: "Tu as activé le mode détail mais aucun poste n'est défini. Le CAPEX total est nul.",
      paths: ["capexItems"],
      link: PARAMS_LINK,
    });
  }

  // 6. BFR cohérent vs CA: jours de CA dans une plage raisonnable
  const bfrCustom =
    p.bfr.daysReceivables !== undefined ||
    p.bfr.daysSupplierPayables !== undefined ||
    p.bfr.daysStock !== undefined;
  const bfrDaysNet = bfrCustom
    ? Math.max(
        0,
        (p.bfr.daysReceivables ?? 0) -
          (p.bfr.daysSupplierPayables ?? 0) +
          (p.bfr.daysStock ?? 0)
      )
    : p.bfr.daysOfRevenue;
  if (bfrDaysNet < 0 || bfrDaysNet > 90) {
    issues.push({
      id: "bfr-extreme",
      severity: bfrDaysNet < 0 || bfrDaysNet > 180 ? "critical" : "warning",
      title: "BFR extrême",
      message: `BFR net effectif = ${bfrDaysNet.toFixed(0)} jours de CA. Plage attendue: 0-90j pour activité service B2C.`,
      paths: ["bfr.daysOfRevenue", "bfr.daysReceivables", "bfr.daysSupplierPayables"],
      link: PARAMS_LINK,
    });
  }

  // 7. Taux IS bornes
  if (p.tax.enableIs && (p.tax.isRate < 0 || p.tax.isRate > 1)) {
    issues.push({
      id: "is-rate",
      severity: "critical",
      title: "Taux IS hors [0%, 100%]",
      message: `isRate = ${(p.tax.isRate * 100).toFixed(1)}%. Standard FR PME: 25%.`,
      paths: ["tax.isRate"],
      link: PARAMS_LINK,
    });
  }

  // 8. Tier price <= 0
  for (let i = 0; i < p.subs.tiers.length; i++) {
    const t = p.subs.tiers[i];
    if (t.monthlyPrice <= 0) {
      issues.push({
        id: `tier-price-${i}`,
        severity: "warning",
        title: `Prix tier "${t.name}" ≤ 0`,
        message: `Prix mensuel ${t.monthlyPrice}€. Risque de revenue null sur ce tier.`,
        paths: [`subs.tiers.${i}.monthlyPrice`],
        link: PARAMS_LINK,
      });
    }
  }

  // 9. Solde tréso négatif (depend du résultat)
  if (result) {
    if (result.cashTroughValue < 0) {
      const monthLabel = result.cashTroughMonth !== null
        ? result.monthLabels[result.cashTroughMonth] ?? `M${result.cashTroughMonth}`
        : "?";
      issues.push({
        id: "cash-trough",
        severity: "critical",
        title: "Trésorerie négative",
        message: `Le creux de tréso atteint ${formatEur(result.cashTroughValue)} en ${monthLabel}. Le BP n'est pas finançable.`,
        hint: "Renforce les apports, accélère la revenue ou réduis les CAPEX/OPEX.",
        link: { href: "/cashflow", label: "Voir trésorerie" },
      });
    } else if (result.cashTroughValue < 10000) {
      issues.push({
        id: "cash-thin",
        severity: "warning",
        title: "Buffer trésorerie tendu",
        message: `Creux de tréso = ${formatEur(result.cashTroughValue)}. Marge de sécurité < 10k€.`,
        link: { href: "/cashflow", label: "Voir trésorerie" },
      });
    }

    // 10. Aucun break-even avant la fin
    if (result.breakEvenMonth === null) {
      issues.push({
        id: "no-breakeven",
        severity: "warning",
        title: "Pas de break-even sur l'horizon",
        message: `EBITDA cumulé reste négatif jusqu'en ${result.fyLabels[result.fyLabels.length - 1]}.`,
        hint: "Allonge l'horizon ou révise les hypothèses growth/CAC.",
        link: { href: "/pnl", label: "Voir compte de résultat" },
      });
    }

    // 11. Capacité: utilise params.capacity si défini, sinon heuristique simple
    const lastFy = result.yearly[result.yearly.length - 1];
    const lastMonth = result.monthly[result.monthly.length - 1];
    if (lastMonth) {
      const subsCount = lastMonth.subsCount + lastMonth.legacyCount;
      const pools = p.salaries.freelancePools ?? [];
      const monthlyCoachHours = pools.reduce((s, pool) => {
        const h =
          pool.hoursPerWeekday !== undefined && pool.hoursPerWeekendDay !== undefined
            ? (pool.hoursPerWeekday * 5 + pool.hoursPerWeekendDay * 2) * 4.3
            : pool.monthlyHours;
        return s + h;
      }, 0);

      const cap = p.capacity;
      if (cap) {
        const slotsPerHour = cap.parallelClasses * cap.capacityPerClass;
        const sessionsSupply = monthlyCoachHours * slotsPerHour;
        const sessionsDemand = subsCount * cap.avgSessionsPerMonth;
        const saturation = sessionsSupply > 0 ? sessionsDemand / sessionsSupply : 0;
        if (saturation > 0.95) {
          issues.push({
            id: "capacity",
            severity: saturation > 1 ? "critical" : "warning",
            title: `Capacité ${(saturation * 100).toFixed(0)}% en fin d'horizon`,
            message: `${subsCount} membres × ${cap.avgSessionsPerMonth} sessions = ${Math.round(sessionsDemand)} sessions/mois demandées vs ${Math.round(sessionsSupply)} offertes (${cap.parallelClasses} cours × ${cap.capacityPerClass} pers × ${monthlyCoachHours.toFixed(0)}h coaching).`,
            hint: "Augmente parallelClasses, capacityPerClass, ou les heures freelance pools.",
            link: { href: "/capacity", label: "Voir capacité" },
          });
        }
      } else {
        // Heuristique fallback (12h/membre/mois)
        const hoursDemanded = subsCount * 12;
        const cadreCoachItems = p.salaries.items.filter((it) =>
          /coach|head/i.test(it.role)
        );
        const cadreHours = cadreCoachItems.reduce((s, it) => s + it.fte * 130, 0);
        const totalHoursAvailable = monthlyCoachHours + cadreHours;
        if (totalHoursAvailable > 0 && hoursDemanded > totalHoursAvailable * 0.95) {
          issues.push({
            id: "capacity",
            severity: hoursDemanded > totalHoursAvailable ? "critical" : "warning",
            title: "Capacité coaching saturée (heuristique)",
            message: `${subsCount} membres → ~${hoursDemanded}h/mois de demande vs ${totalHoursAvailable.toFixed(0)}h offertes.`,
            hint: "Active la capacité paramétrée sur /capacity pour un calcul précis.",
            link: { href: "/capacity", label: "Voir capacité" },
          });
        }
      }
    }

    // 12. Marge EBITDA finale très négative
    if (lastFy && lastFy.totalRevenue > 0 && lastFy.ebitdaMargin < -0.1) {
      issues.push({
        id: "ebitda-margin",
        severity: "warning",
        title: "Marge EBITDA finale très négative",
        message: `Marge EBITDA ${result.fyLabels[result.fyLabels.length - 1]} = ${(lastFy.ebitdaMargin * 100).toFixed(1)}%.`,
        link: { href: "/pnl", label: "Voir P&L" },
      });
    }
  }

  // 13. Taux d'emprunts cohérents
  for (const loan of p.financing.loans ?? []) {
    if (loan.annualRatePct < 0 || loan.annualRatePct > 30) {
      issues.push({
        id: `loan-${loan.id}`,
        severity: "warning",
        title: `Emprunt "${loan.name}": taux suspect`,
        message: `Taux ${loan.annualRatePct}% hors plage usuelle [0-15%].`,
        link: { href: "/financing", label: "Voir financement" },
      });
    }
  }
  for (const bond of p.financing.bonds ?? []) {
    if (bond.annualRatePct < 0 || bond.annualRatePct > 30) {
      issues.push({
        id: `bond-${bond.id}`,
        severity: "warning",
        title: `Obligation "${bond.name}": taux suspect`,
        message: `Taux ${bond.annualRatePct}% hors plage usuelle [0-15%].`,
        link: { href: "/financing", label: "Voir financement" },
      });
    }
  }

  return issues;
}

export function summarizeIssues(issues: HealthIssue[]) {
  const critical = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const ok = issues.filter((i) => i.severity === "ok").length;
  return {
    critical,
    warnings,
    ok,
    healthy: critical === 0 && warnings === 0,
  };
}

function formatEur(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}
