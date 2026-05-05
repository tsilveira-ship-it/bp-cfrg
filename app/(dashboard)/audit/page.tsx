"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS } from "@/lib/model/defaults";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";

const FINDINGS = [
  {
    severity: "high" as const,
    title: "Trésorerie négative FY25 et FY26",
    body: "Tréso fin d'année: -21k€ (FY25) et -66k€ (FY26). La levée de 400k€ est consommée intégralement et insuffisante pour couvrir les premiers mois. Ligne de découvert ou 2e tranche nécessaire.",
    fix: "Activer ligne de découvert 100k€ ou doubler la levée à 600k€",
  },
  {
    severity: "high" as const,
    title: "Pas d'IS modélisé sur FY27-FY29",
    body: "Résultat positif (≥272k€/an) sans aucune charge d'impôt. Sous-estime ~25% du résultat (≈68k€+/an manquant).",
    fix: "Activer IS dans Paramètres → Fiscalité",
  },
  {
    severity: "medium" as const,
    title: "Pas d'amortissements (D&A)",
    body: "CAPEX initial 276k€ (équipement, travaux) non amorti. Devrait générer ~25-35k€/an d'amortissement, impactant résultat fiscal.",
    fix: "Activer D&A — durée 5 ans linéaire",
  },
  {
    severity: "high" as const,
    title: "Croissance CA +41% FY26 non capacity-checkée",
    body: "Floor capacity = 362h coaching/mois pour ~420 abos avec illimités 2x/j. Tension capacité si tous illimités utilisent à fond.",
    fix: "Vérifier hours/member, ajuster mix illimités vs séances",
  },
  {
    severity: "medium" as const,
    title: "Marketing flat 32400€/an malgré ramp +41%",
    body: "CAC implicite = 32400€/376 nouveaux abos ≈ 86€. Aucun upscale prévu pour soutenir croissance.",
    fix: "Ajouter % CA additionnel en marketing (ex: 2%)",
  },
  {
    severity: "medium" as const,
    title: "Salaires flat FY26-FY29 (383k€)",
    body: "Aucune indexation inflation/SMIC sur 4 ans. Irréaliste.",
    fix: "Indexation 2%/an minimum dans Paramètres → Salaires",
  },
  {
    severity: "low" as const,
    title: "Tarifs fixes 5 ans",
    body: "Aucune hausse de prix vs inflation.",
    fix: "Indexation tarifs 2%/an",
  },
  {
    severity: "medium" as const,
    title: "BFR = 0",
    body: "Square commission + abos prélevés mensuellement → décalage encaissement non modélisé.",
    fix: "Ajouter ~15j de CA en BFR",
  },
  {
    severity: "low" as const,
    title: "Legacy Javelot churn linéaire non documenté",
    body: "Hypothèse -29k€/an gross sans courbe de churn validée.",
    fix: "Affiner via cohort analysis",
  },
  {
    severity: "low" as const,
    title: "Loyer FY26 +81% (18113€/mois) puis -31% FY27 (12500€)",
    body: "Discontinuité bail à vérifier. Risque clause non maîtrisée.",
    fix: "Confirmer avec bailleur",
  },
];

const ICONS = {
  high: <AlertTriangle className="h-5 w-5 text-red-600" />,
  medium: <AlertCircle className="h-5 w-5 text-amber-600" />,
  low: <Info className="h-5 w-5 text-blue-600" />,
};

const BADGES = {
  high: <Badge variant="destructive">Critique</Badge>,
  medium: <Badge className="bg-amber-500 hover:bg-amber-600">Modéré</Badge>,
  low: <Badge variant="secondary">Mineur</Badge>,
};

export default function AuditPage() {
  const params = useModelStore((s) => s.params);
  const baseResult = useMemo(() => computeModel(DEFAULT_PARAMS), []);
  const auditResult = useMemo(() => computeModel(AUDIT_CORRECTED_PARAMS), []);
  const baseLast = baseResult.yearly[baseResult.yearly.length - 1];
  const auditLast = auditResult.yearly[auditResult.yearly.length - 1];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit & risques</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Failles identifiées dans le BP source et impact des corrections
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Comparaison Base vs Audit corrigé</CardTitle>
          <CardDescription>{baseLast.label} — impact des corrections fiscales et opérationnelles</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicateur</TableHead>
                <TableHead className="text-right">Base (xlsx)</TableHead>
                <TableHead className="text-right">Audit corrigé</TableHead>
                <TableHead className="text-right">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { label: `CA ${baseLast.label}`, b: baseLast.totalRevenue, a: auditLast.totalRevenue },
                { label: `EBITDA ${baseLast.label}`, b: baseLast.ebitda, a: auditLast.ebitda },
                { label: `Marge EBITDA ${baseLast.label}`, b: baseLast.ebitdaMargin, a: auditLast.ebitdaMargin, isPct: true },
                { label: `Résultat net ${baseLast.label}`, b: baseLast.netIncome, a: auditLast.netIncome },
                { label: "Trésorerie min.", b: baseResult.cashTroughValue, a: auditResult.cashTroughValue },
                { label: `Trésorerie fin ${baseLast.label}`, b: baseLast.cashEnd, a: auditLast.cashEnd },
              ].map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right">{r.isPct ? fmtPct(r.b) : fmtCurrency(r.b, { compact: true })}</TableCell>
                  <TableCell className="text-right">{r.isPct ? fmtPct(r.a) : fmtCurrency(r.a, { compact: true })}</TableCell>
                  <TableCell className={"text-right font-medium " + (r.a - r.b >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {r.isPct ? fmtPct(r.a - r.b) : fmtCurrency(r.a - r.b, { compact: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings ({FINDINGS.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {FINDINGS.map((f, i) => (
            <div key={i} className="flex gap-3 p-4 border rounded-md">
              <div className="mt-0.5">{ICONS[f.severity]}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{f.title}</h4>
                  {BADGES[f.severity]}
                </div>
                <p className="text-sm text-muted-foreground">{f.body}</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-medium">Correction:</span>
                  <span>{f.fix}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
