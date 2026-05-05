"use client";
import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  FileSpreadsheet,
  GitBranch,
  HeartPulse,
  Key,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { runHealthCheck, summarizeIssues } from "@/lib/health-check";
import { runCrossChecks, summarizeChecks } from "@/lib/cross-checks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { ExcelExportButton } from "@/components/excel-export-button";
import { fmtCurrency, fmtPct } from "@/lib/format";

const STEPS = [
  {
    id: 1,
    href: "/financial-highlights",
    icon: Sparkles,
    title: "Synthèse 1-page",
    desc: "Top 8 KPIs + 2 charts + paragraphe. Pour comprendre la story en 60 secondes.",
    duration: "1 min",
  },
  {
    id: 2,
    href: "/assumptions",
    icon: Key,
    title: "Top 10 hypothèses + toggles",
    desc: "Les 10 chiffres qui pèsent le plus + config modèle activée (IS, TVA, BFR détaillé...).",
    duration: "5 min",
  },
  {
    id: 3,
    href: "/cross-checks",
    icon: ShieldCheck,
    title: "Cross-checks comptables",
    desc: "Validation automatique cohérence P&L ↔ cashflow ↔ bilan. Confiance technique immédiate.",
    duration: "1 min",
  },
  {
    id: 4,
    href: "/health-check",
    icon: HeartPulse,
    title: "Health check 360°",
    desc: "Diagnostic complet: mix abos, BFR, capacité, taux IS, taux emprunts...",
    duration: "3 min",
  },
  {
    id: 5,
    href: "/pnl",
    icon: FileSpreadsheet,
    title: "Compte de résultat détaillé",
    desc: "P&L annuel avec drilldown CA, OPEX, salaires. Export Excel disponible.",
    duration: "5 min",
  },
  {
    id: 6,
    href: "/cashflow",
    icon: Wallet,
    title: "Trésorerie",
    desc: "Flux annuels + courbe mensuelle. Identifier le creux et la couverture.",
    duration: "3 min",
  },
  {
    id: 7,
    href: "/use-of-funds",
    icon: GitBranch,
    title: "Use of funds (Sankey)",
    desc: "Visualisation sources → catégories → postes. Justification levée.",
    duration: "2 min",
  },
  {
    id: 8,
    href: "/sensitivity",
    icon: TrendingUp,
    title: "Sensibilité aux drivers",
    desc: "Sliders ±20% sur growth/CAC/coûts. Voir ce qui casse le BP.",
    duration: "5 min",
  },
  {
    id: 9,
    href: "/monte-carlo",
    icon: Coins,
    title: "Monte Carlo (1000 simulations)",
    desc: "Distribution P10/P50/P90 sur EBITDA et tréso. Quantifie l'incertitude.",
    duration: "3 min",
  },
];

export default function AuditPackPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const health = useMemo(() => summarizeIssues(runHealthCheck(params, result)), [params, result]);
  const cross = useMemo(() => summarizeChecks(runCrossChecks(params, result)), [params, result]);
  const lastFy = result.yearly[result.yearly.length - 1];
  const totalRaised =
    (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0) +
    (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0) +
    (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);

  const totalDuration = STEPS.reduce((s, st) => s + parseInt(st.duration), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-[#D32F2F]" /> Audit Pack
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Parcours guidé pour analyste financier ou banquier — ~{totalDuration} minutes pour
            valider la cohérence et la plausibilité du BP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelExportButton />
          <ScenarioSwitcher />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              CA fin {lastFy.label}
            </div>
            <div className="text-2xl font-heading font-bold">
              {fmtCurrency(lastFy.totalRevenue, { compact: true })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              EBITDA {fmtCurrency(lastFy.ebitda, { compact: true })} ({fmtPct(lastFy.ebitdaMargin, 0)})
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Levée totale</div>
            <div className="text-2xl font-heading font-bold">
              {fmtCurrency(totalRaised, { compact: true })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tréso fin {fmtCurrency(lastFy.cashEnd, { compact: true })}
            </p>
          </CardContent>
        </Card>
        <Card className={cross.error > 0 ? "border-red-300" : cross.warning > 0 ? "border-amber-300" : "border-emerald-300"}>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Cohérence comptable
            </div>
            <div
              className={
                "text-2xl font-heading font-bold " +
                (cross.error > 0
                  ? "text-red-700"
                  : cross.warning > 0
                    ? "text-amber-700"
                    : "text-emerald-700")
              }
            >
              {cross.error > 0
                ? `${cross.error} erreur(s)`
                : cross.warning > 0
                  ? `${cross.warning} warning(s)`
                  : "100% OK"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {cross.ok}/{cross.total} contrôles passent
            </p>
          </CardContent>
        </Card>
        <Card className={health.critical > 0 ? "border-red-300" : ""}>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Diagnostic santé
            </div>
            <div
              className={
                "text-2xl font-heading font-bold " +
                (health.critical > 0 ? "text-red-700" : "text-emerald-700")
              }
            >
              {health.critical > 0 ? `${health.critical} critique(s)` : "Sain"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {health.warnings} warning(s), {health.ok} OK
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parcours d&apos;audit recommandé</CardTitle>
          <p className="text-xs text-muted-foreground">
            9 étapes ordonnées du général au détail. Chaque étape est cliquable.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className="flex items-center gap-3 p-3 rounded-md border hover:border-[#D32F2F]/40 hover:bg-[#D32F2F]/5 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-[#D32F2F]/10 flex items-center justify-center text-[#D32F2F] font-bold text-sm">
                    {s.id}
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{s.title}</div>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {s.duration}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Outils complémentaires
          </h3>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            <li>
              <Link href="/audit-log" className="text-[#D32F2F] hover:underline">
                /audit-log
              </Link>{" "}
              — historique des modifs entre versions Master
            </li>
            <li>
              <Link href="/variance" className="text-[#D32F2F] hover:underline">
                /variance
              </Link>{" "}
              — comparaison réel vs prévu (si en exploitation)
            </li>
            <li>
              <Link href="/waterfalls" className="text-[#D32F2F] hover:underline">
                /waterfalls
              </Link>{" "}
              — décomposition CA et EBITDA
            </li>
            <li>
              <Link href="/cap-table" className="text-[#D32F2F] hover:underline">
                /cap-table
              </Link>{" "}
              — actionnariat et dilutions
            </li>
            <li>
              <Link href="/backup" className="text-[#D32F2F] hover:underline">
                /backup
              </Link>{" "}
              — export JSON complet pour archivage
            </li>
            <li>
              <a
                href="https://github.com/tsilveira-ship-it/bp-cfrg"
                target="_blank"
                rel="noreferrer noopener"
                className="text-[#D32F2F] hover:underline"
              >
                Code source GitHub
              </a>{" "}
              — méthodologie open-source
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
