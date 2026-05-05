"use client";
import { useModelStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { fmtCurrency, fmtPct, fmtNum } from "@/lib/format";
import { effectiveMonthlyHours } from "@/lib/model/types";
import { Pencil, ExternalLink, MessageSquareText } from "lucide-react";

type AssumptionRow = {
  category: string;
  param: string;
  value: string;
  page: string;
  rationale?: string;
};

export default function AssumptionsPage() {
  const params = useModelStore((s) => s.params);

  const rows: AssumptionRow[] = [
    // Timeline
    {
      category: "Timeline",
      param: "Démarrage projet",
      value: `Sept ${params.timeline.startYear}`,
      page: "/parameters",
      rationale: "Premier mois du modèle. Premier mois de l'année fiscale (FY).",
    },
    {
      category: "Timeline",
      param: "Horizon",
      value: `${params.timeline.horizonYears} ans`,
      page: "/parameters",
      rationale: "Durée de la projection. 5-7 ans typique pour BP investisseur.",
    },

    // Subscriptions
    {
      category: "Recettes — Abos",
      param: "TVA",
      value: fmtPct(params.subs.vatRate ?? 0.20, 0),
      page: "/parameters",
      rationale: "Taux de TVA appliqué. Modèle CA = HT = TTC ÷ (1+TVA).",
    },
    {
      category: "Recettes — Abos",
      param: "Nb tiers d'abonnement",
      value: `${params.subs.tiers.length} tiers`,
      page: "/parameters",
      rationale: "Différents niveaux de prix (illimité 2/j, illimité 1/j, 12, 8, 4 séances).",
    },
    {
      category: "Recettes — Abos",
      param: "Prix moyen TTC",
      value: fmtCurrency(
        params.subs.tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0)
      ),
      page: "/parameters",
      rationale: "Prix mensuel pondéré par mix produit.",
    },
    {
      category: "Recettes — Abos",
      param: "Ramp-up FY1",
      value: `${fmtNum(params.subs.rampStartCount)} → ${fmtNum(params.subs.rampEndCount)}`,
      page: "/parameters",
      rationale: "Acquisition linéaire de nouveaux membres sur les 12 premiers mois.",
    },
    {
      category: "Recettes — Abos",
      param: "Indexation tarifs / an",
      value: fmtPct(params.subs.priceIndexPa),
      page: "/parameters",
      rationale: "Hausse annuelle composée des prix TTC.",
    },
    {
      category: "Recettes — Abos",
      param: "Croissance moyenne post-ramp",
      value: fmtPct(
        (params.subs.growthRates ?? []).reduce((s, x) => s + x, 0) /
          Math.max(1, (params.subs.growthRates ?? []).length)
      ),
      page: "/parameters",
      rationale: "Moyenne des taux de croissance annuels FY+1 → FY final.",
    },

    // Legacy
    {
      category: "Recettes — Legacy",
      param: "Membres legacy départ",
      value: `${fmtNum(params.legacy.startCount)}`,
      page: "/parameters",
      rationale: "Anciens membres Javelot migrés au démarrage.",
    },
    {
      category: "Recettes — Legacy",
      param: "Prix moyen legacy",
      value: fmtCurrency(params.legacy.avgMonthlyPrice),
      page: "/parameters",
    },
    {
      category: "Recettes — Legacy",
      param: "Churn annuel legacy",
      value: `${params.legacy.yearlyChurnAbs} membres/an`,
      page: "/parameters",
      rationale: "Pertes linéaires d'anciens membres par an.",
    },

    // Salaires
    {
      category: "Charges — Personnel",
      param: "Postes cadres",
      value: `${params.salaries.items.length} (${params.salaries.items
        .reduce((s, x) => s + x.fte, 0)
        .toFixed(1)} FTE)`,
      page: "/salaries",
    },
    {
      category: "Charges — Personnel",
      param: "Pools freelance",
      value: `${(params.salaries.freelancePools ?? []).length} pools`,
      page: "/salaries",
    },
    {
      category: "Charges — Personnel",
      param: "Coût mensuel freelance",
      value: fmtCurrency(
        (params.salaries.freelancePools ?? []).reduce(
          (s, p) => s + p.hourlyRate * effectiveMonthlyHours(p),
          0
        )
      ),
      page: "/salaries",
      rationale: "Heures négatives = déductions (heures incluses dans cadres).",
    },
    {
      category: "Charges — Personnel",
      param: "Indexation annuelle salaires",
      value: fmtPct(params.salaries.annualIndexPa),
      page: "/salaries",
    },

    // Rent
    {
      category: "Charges — Locaux",
      param: "Loyer FY1",
      value: `${fmtCurrency(params.rent.monthlyByFy[0])}/mo`,
      page: "/parameters",
      rationale: "Premier exercice. Souvent réduit (négociation franchise).",
    },
    {
      category: "Charges — Locaux",
      param: "Taxes annuelles",
      value: fmtCurrency(params.rent.yearlyTaxes),
      page: "/parameters",
      rationale: "Foncière, CET, taxe d'apprentissage, TEOM, etc. Payé en Août.",
    },
    {
      category: "Charges — Locaux",
      param: "Charges copropriété",
      value: `${fmtCurrency(params.rent.monthlyCoopro)}/mo`,
      page: "/parameters",
    },

    // Marketing
    {
      category: "Charges — Marketing",
      param: "Budget mensuel fixe",
      value: fmtCurrency(params.marketing.monthlyBudget),
      page: "/parameters",
    },
    {
      category: "Charges — Marketing",
      param: "% CA additionnel",
      value: fmtPct(params.marketing.pctOfRevenue),
      page: "/parameters",
      rationale: "Marketing variable scalé sur le CA. À activer pour soutenir croissance.",
    },

    // Investissement
    {
      category: "Investissement",
      param: "CAPEX équipement",
      value: fmtCurrency(params.capex.equipment),
      page: "/parameters",
    },
    {
      category: "Investissement",
      param: "CAPEX travaux",
      value: fmtCurrency(params.capex.travaux),
      page: "/parameters",
    },
    {
      category: "Investissement",
      param: "Juridique + dépôts",
      value: fmtCurrency(params.capex.juridique + params.capex.depots),
      page: "/parameters",
      rationale: "Frais juridiques + dépôts de garantie. Non amortissables.",
    },

    // Financement
    {
      category: "Financement",
      param: "Apports / equity total",
      value: fmtCurrency(
        (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0)
      ),
      page: "/financing",
    },
    {
      category: "Financement",
      param: "Emprunts bancaires total",
      value: fmtCurrency(
        (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0)
      ),
      page: "/financing",
    },
    {
      category: "Financement",
      param: "Obligations total",
      value: fmtCurrency(
        (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0)
      ),
      page: "/financing",
    },

    // Fiscalité
    {
      category: "Fiscalité",
      param: "Taux IS",
      value: params.tax.enableIs ? fmtPct(params.tax.isRate) : "Désactivé",
      page: "/parameters",
      rationale: "25% standard PME France. Désactiver pour modèle simplifié.",
    },
    {
      category: "Fiscalité",
      param: "Amortissements",
      value: params.tax.enableDA
        ? `Équip ${params.tax.amortYearsEquipment}y / Travaux ${params.tax.amortYearsTravaux}y`
        : "Désactivé",
      page: "/parameters",
    },
    {
      category: "Fiscalité",
      param: "BFR",
      value: `${params.bfr.daysOfRevenue} jours de CA`,
      page: "/parameters",
      rationale: "Décalage encaissements (Square paie ~3 jours) vs décaissements.",
    },
  ];

  // Group by category
  const grouped = rows.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, AssumptionRow[]>);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hypothèses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Liste exhaustive des paramètres clés du business plan, par catégorie
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      {(() => {
        const fieldNotes = params.fieldNotes ?? {};
        const entries = Object.entries(fieldNotes).sort((a, b) =>
          (b[1].date ?? "").localeCompare(a[1].date ?? "")
        );
        if (entries.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-amber-600" /> Notes par champ
                <span className="text-xs text-muted-foreground font-normal">
                  ({entries.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Champ (path)</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Édité le</TableHead>
                    <TableHead className="text-right">Modifier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(([path, note]) => (
                    <TableRow key={path}>
                      <TableCell className="font-mono text-xs">{path}</TableCell>
                      <TableCell className="text-xs whitespace-pre-wrap max-w-md">
                        {note.note}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {note.author ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {note.date ? new Date(note.date).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href="/parameters"
                          className="inline-flex items-center gap-1 text-xs text-[#D32F2F] hover:underline"
                        >
                          <Pencil className="h-3 w-3" />
                          /parameters
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })()}

      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">{cat}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paramètre</TableHead>
                  <TableHead>Valeur actuelle</TableHead>
                  <TableHead>Justification / source</TableHead>
                  <TableHead className="text-right">Modifier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.param}</TableCell>
                    <TableCell className="font-mono text-sm">{r.value}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.rationale ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={r.page}
                        className="inline-flex items-center gap-1 text-xs text-[#D32F2F] hover:underline"
                      >
                        <Pencil className="h-3 w-3" />
                        {r.page}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2">À documenter (manquant)</h3>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            <li>Sources des prix abos (concurrence locale: CrossFit Reebok, Train Yard, ...)</li>
            <li>Lettre d&apos;intention / bail signé (loyer + charges)</li>
            <li>Devis travaux et équipement (CAPEX justifiés)</li>
            <li>Cohort retention historique Javelot (proxy churn legacy)</li>
            <li>CAC observé Javelot (proxy efficacité marketing)</li>
            <li>Étude de marché secteur fitness Paris 13/Rive Gauche</li>
            <li>Hypothèses heures coaching disponibles vs membres actifs (capacity check)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
