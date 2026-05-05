"use client";
import { useMemo } from "react";
import Image from "next/image";
import { Printer, FileText } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { expandCapex } from "@/lib/model/types";
import { buildExecutiveSummary } from "@/lib/executive-summary";
import { activeToggles, topKeyHypotheses } from "@/lib/key-hypotheses";
import { evaluate, SECTOR_BENCHMARKS } from "@/lib/comparables";
import { runHealthCheck, summarizeIssues } from "@/lib/health-check";
import { runCrossChecks, summarizeChecks } from "@/lib/cross-checks";
import { Button } from "@/components/ui/button";
import { fmtCurrency, fmtPct, fmtNum } from "@/lib/format";

export default function FullBpPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const sections = useMemo(() => buildExecutiveSummary(params, result), [params, result]);
  const top = useMemo(() => topKeyHypotheses(params, 10), [params]);
  const toggles = useMemo(() => activeToggles(params), [params]);
  const items = useMemo(() => expandCapex(params), [params]);
  const health = useMemo(() => summarizeIssues(runHealthCheck(params, result)), [params, result]);
  const cross = useMemo(() => summarizeChecks(runCrossChecks(params, result)), [params, result]);
  const lastFy = result.yearly[result.yearly.length - 1];
  const firstFy = result.yearly[0];
  const totalEquity = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const totalLoans = (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0);
  const totalBonds = (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);
  const totalRaised = totalEquity + totalLoans + totalBonds;
  const totalCapex = items.reduce((s, it) => s + it.amount, 0);

  const tiers = params.subs.tiers ?? [];
  const avgPrice = tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);

  return (
    <div className="full-bp">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 18mm 16mm;
          }
          body {
            background: white !important;
          }
          .full-bp .page-break {
            break-after: page;
            page-break-after: always;
          }
          .full-bp section {
            break-inside: avoid;
          }
          .full-bp h2 {
            break-after: avoid;
          }
          .full-bp .no-print,
          .full-bp .no-print * {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-background border-b py-3 px-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#D32F2F]" />
          <span className="font-semibold">Business Plan complet — vue PDF</span>
          <span className="text-xs text-muted-foreground ml-2">
            Ctrl+P / Cmd+P → &laquo;&nbsp;Enregistrer au format PDF&nbsp;&raquo;
          </span>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimer / Sauver PDF
        </Button>
      </div>

      <div className="bg-white max-w-[210mm] mx-auto px-12 py-8 print:p-0 space-y-8 text-sm leading-relaxed">
        {/* PAGE 1: COVER */}
        <section className="page-break min-h-[260mm] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="h-16 w-16 bg-[#111] rounded p-2">
                <Image src="/logo-rg.svg" alt="CFRG" width={48} height={48} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[#D32F2F] font-bold">
                  Business Plan
                </div>
                <h1 className="font-heading text-4xl font-bold uppercase tracking-tight">
                  CrossFit Rive Gauche
                </h1>
              </div>
            </div>
          </div>

          <div className="text-center space-y-3 my-12">
            <div className="text-5xl font-heading font-bold tracking-tight">
              {result.fyLabels[0]} → {result.fyLabels[result.fyLabels.length - 1]}
            </div>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Projection {params.timeline.horizonYears} années — Ramp-up{" "}
              {params.subs.rampStartCount} → {params.subs.rampEndCount} membres — Levée{" "}
              {fmtCurrency(totalRaised, { compact: true })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="border p-3 rounded">
              <div className="font-semibold">CA cible {lastFy.label}</div>
              <div className="text-2xl font-heading font-bold">
                {fmtCurrency(lastFy.totalRevenue, { compact: true })}
              </div>
            </div>
            <div className="border p-3 rounded">
              <div className="font-semibold">EBITDA {lastFy.label}</div>
              <div className="text-2xl font-heading font-bold">
                {fmtCurrency(lastFy.ebitda, { compact: true })} ({fmtPct(lastFy.ebitdaMargin, 0)})
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground text-center pt-6 border-t">
            Document confidentiel · Généré le {new Date().toLocaleDateString("fr-FR")} ·
            Méthodologie open-source: github.com/tsilveira-ship-it/bp-cfrg
          </div>
        </section>

        {/* PAGE 2: TABLE OF CONTENTS */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            Table des matières
          </h2>
          <ol className="space-y-1.5 text-sm">
            <Toc n={1} title="Executive summary" />
            <Toc n={2} title="Top 10 hypothèses critiques" />
            <Toc n={3} title="Configuration du modèle" />
            <Toc n={4} title="Recettes" />
            <Toc n={5} title="Charges (OPEX)" />
            <Toc n={6} title="Investissement (CAPEX)" />
            <Toc n={7} title="Plan de financement" />
            <Toc n={8} title="Compte de résultat (P&L)" />
            <Toc n={9} title="Trésorerie" />
            <Toc n={10} title="Bilan" />
            <Toc n={11} title="Capacité opérationnelle" />
            <Toc n={12} title="Comparables marché" />
            <Toc n={13} title="Diagnostic santé & cohérence" />
          </ol>
        </section>

        {/* SECTION 1: Executive summary */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            1. Executive summary
          </h2>
          <div className="space-y-4">
            {sections.map((s, i) => (
              <div key={i}>
                <h3 className="font-heading text-base font-bold uppercase tracking-wide text-[#D32F2F] mb-1">
                  1.{i + 1}. {s.title}
                </h3>
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="text-sm mb-2">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: Top 10 hypothèses */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            2. Top 10 hypothèses critiques
          </h2>
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-2 w-8">#</th>
                <th className="text-left p-2">Hypothèse</th>
                <th className="text-right p-2">Valeur</th>
                <th className="text-left p-2">Source / contexte</th>
              </tr>
            </thead>
            <tbody>
              {top.map((h) => (
                <tr key={h.rank} className="border-t">
                  <td className="p-2 font-bold text-[#D32F2F]">{h.rank}</td>
                  <td className="p-2 font-medium">{h.label}</td>
                  <td className="p-2 text-right font-mono font-semibold">{h.value}</td>
                  <td className="p-2 text-muted-foreground italic">{h.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* SECTION 3: Configuration */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            3. Configuration du modèle
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {toggles.map((t) => (
              <div
                key={t.key}
                className={
                  "border p-2 rounded text-xs " +
                  (t.on ? "bg-emerald-50/30 border-emerald-300" : "bg-muted/20")
                }
              >
                <div className="flex justify-between font-medium">
                  <span>{t.label}</span>
                  <span className="font-mono">{t.on ? "ON" : "OFF"}</span>
                </div>
                {t.hint && <div className="text-[10px] text-muted-foreground mt-0.5">{t.hint}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: Recettes */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            4. Recettes
          </h2>
          <h3 className="font-semibold text-sm mt-4 mb-2">Tiers d&apos;abonnement (mix pondéré: {fmtCurrency(avgPrice)}/mois)</h3>
          <table className="w-full text-xs mb-4">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-1">Tier</th>
                <th className="text-right p-1">Prix mensuel TTC</th>
                <th className="text-right p-1">Mix</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{t.name}</td>
                  <td className="p-1 text-right font-mono">{fmtCurrency(t.monthlyPrice)}</td>
                  <td className="p-1 text-right">{fmtPct(t.mixPct, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <RevenueByYearTable yearly={result.yearly} />
        </section>

        {/* SECTION 5: Charges */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            5. Charges (OPEX)
          </h2>
          <OpexByYearTable yearly={result.yearly} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="border p-3 rounded">
              <div className="font-semibold">Salaires cadres</div>
              {params.salaries.items.map((it, i) => (
                <div key={i} className="flex justify-between mt-1">
                  <span>{it.role}</span>
                  <span className="font-mono">{fmtCurrency(it.monthlyGross)}/mois (brut)</span>
                </div>
              ))}
            </div>
            <div className="border p-3 rounded">
              <div className="font-semibold">Pools freelance</div>
              {(params.salaries.freelancePools ?? []).map((p, i) => (
                <div key={i} className="flex justify-between mt-1">
                  <span>{p.name}</span>
                  <span className="font-mono">{fmtCurrency(p.hourlyRate)}/h</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6: CAPEX */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            6. Investissement (CAPEX)
          </h2>
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-2">Poste</th>
                <th className="text-left p-2">Catégorie</th>
                <th className="text-right p-2">Montant</th>
                <th className="text-right p-2">Amort.</th>
                <th className="text-right p-2">% total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="p-2">{it.name}</td>
                  <td className="p-2 capitalize text-muted-foreground">{it.category}</td>
                  <td className="p-2 text-right font-mono">{fmtCurrency(it.amount)}</td>
                  <td className="p-2 text-right">{it.amortYears > 0 ? `${it.amortYears} ans` : "—"}</td>
                  <td className="p-2 text-right">
                    {fmtPct(totalCapex > 0 ? it.amount / totalCapex : 0, 0)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold border-t-2 bg-muted/30">
                <td className="p-2" colSpan={2}>
                  Total CAPEX
                </td>
                <td className="p-2 text-right font-mono">{fmtCurrency(totalCapex)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </section>

        {/* SECTION 7: Plan de financement */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            7. Plan de financement
          </h2>
          <h3 className="font-semibold text-sm mb-2">Sources</h3>
          <table className="w-full text-xs mb-4">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-1">Source</th>
                <th className="text-right p-1">Montant</th>
                <th className="text-right p-1">% levée</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-1">Fonds propres (equity)</td>
                <td className="p-1 text-right font-mono">{fmtCurrency(totalEquity)}</td>
                <td className="p-1 text-right">
                  {fmtPct(totalRaised > 0 ? totalEquity / totalRaised : 0, 0)}
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-1">Emprunts bancaires</td>
                <td className="p-1 text-right font-mono">{fmtCurrency(totalLoans)}</td>
                <td className="p-1 text-right">
                  {fmtPct(totalRaised > 0 ? totalLoans / totalRaised : 0, 0)}
                </td>
              </tr>
              <tr className="border-t">
                <td className="p-1">Obligations</td>
                <td className="p-1 text-right font-mono">{fmtCurrency(totalBonds)}</td>
                <td className="p-1 text-right">
                  {fmtPct(totalRaised > 0 ? totalBonds / totalRaised : 0, 0)}
                </td>
              </tr>
              <tr className="border-t-2 font-bold bg-muted/30">
                <td className="p-1">Total levée</td>
                <td className="p-1 text-right font-mono">{fmtCurrency(totalRaised)}</td>
                <td className="p-1 text-right">100%</td>
              </tr>
            </tbody>
          </table>
          <h3 className="font-semibold text-sm mb-2">Détail emprunts</h3>
          <table className="w-full text-xs mb-4">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-1">Nom</th>
                <th className="text-right p-1">Principal</th>
                <th className="text-right p-1">Taux</th>
                <th className="text-right p-1">Durée</th>
              </tr>
            </thead>
            <tbody>
              {(params.financing.loans ?? []).map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{l.name}</td>
                  <td className="p-1 text-right font-mono">{fmtCurrency(l.principal)}</td>
                  <td className="p-1 text-right">{l.annualRatePct}%</td>
                  <td className="p-1 text-right">{l.termMonths}mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* SECTION 8: P&L */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            8. Compte de résultat (P&amp;L)
          </h2>
          <PnlTable yearly={result.yearly} />
        </section>

        {/* SECTION 9: Cashflow */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            9. Trésorerie
          </h2>
          <CashflowTable yearly={result.yearly} />
          <div className="mt-4 text-xs">
            Trésorerie d&apos;ouverture: {fmtCurrency(params.openingCash)} ·
            Creux mensuel: {fmtCurrency(result.cashTroughValue, { compact: true })} ·
            Trésorerie finale: {fmtCurrency(lastFy.cashEnd, { compact: true })}
          </div>
        </section>

        {/* SECTION 11: Capacité */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            11. Capacité opérationnelle
          </h2>
          {params.capacity ? (
            <div className="space-y-2 text-sm">
              <p>
                Configuration: {params.capacity.parallelClasses} cours en parallèle ×{" "}
                {params.capacity.capacityPerClass} membres = {params.capacity.parallelClasses * params.capacity.capacityPerClass}{" "}
                slots/h. Range {params.capacity.capacityPerClassMin ?? "?"}–
                {params.capacity.capacityPerClassMax ?? "?"} membres/cours.
              </p>
              <p>Sessions/membre/mois: {params.capacity.avgSessionsPerMonth}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Capacité non paramétrée explicitement (utilise les défauts).
            </p>
          )}
        </section>

        {/* SECTION 12: Comparables */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            12. Comparables marché
          </h2>
          <ComparablesTable params={params} result={result} />
        </section>

        {/* SECTION 13: Diagnostic */}
        <section className="page-break">
          <h2 className="font-heading text-2xl font-bold uppercase border-b pb-2 mb-4">
            13. Diagnostic santé & cohérence
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border p-4 rounded">
              <div className="font-semibold">Health check</div>
              <ul className="text-xs mt-2 space-y-1">
                <li>Critiques: {health.critical}</li>
                <li>Warnings: {health.warnings}</li>
                <li>OK: {health.ok}</li>
              </ul>
            </div>
            <div className="border p-4 rounded">
              <div className="font-semibold">Cross-checks comptables</div>
              <ul className="text-xs mt-2 space-y-1">
                <li>OK: {cross.ok} / {cross.total}</li>
                <li>Warnings: {cross.warning}</li>
                <li>Erreurs: {cross.error}</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">
            Voir /health-check et /cross-checks pour le détail diagnostic.
          </p>
        </section>

        {/* Footer */}
        <section>
          <div className="border-t pt-3 text-[10px] text-muted-foreground text-center space-y-1">
            <div>
              Document confidentiel · CrossFit Rive Gauche · Reproduction interdite sans autorisation
            </div>
            <div>
              Méthodologie open-source: github.com/tsilveira-ship-it/bp-cfrg ·
              Auditer les formules: lib/model/compute.ts
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Toc({ n, title }: { n: number; title: string }) {
  return (
    <li className="flex justify-between border-b border-dotted pb-0.5">
      <span>
        <span className="font-bold text-[#D32F2F] mr-2">{n}.</span> {title}
      </span>
      <span className="text-muted-foreground">→</span>
    </li>
  );
}

function PnlTable({ yearly }: { yearly: ReturnType<typeof computeModel>["yearly"] }) {
  const rows: { label: string; getter: (y: typeof yearly[number]) => number; bold?: boolean; sub?: boolean }[] = [
    { label: "Chiffre d'affaires", getter: (y) => y.totalRevenue, bold: true },
    { label: "Salaires", getter: (y) => -y.salaries },
    { label: "Loyer", getter: (y) => -y.rent },
    { label: "Récurrent", getter: (y) => -y.recurring },
    { label: "Marketing", getter: (y) => -y.marketing },
    { label: "Provisions", getter: (y) => -y.provisions },
    { label: "Ponctuels", getter: (y) => -y.oneOff },
    { label: "Total OPEX", getter: (y) => -y.totalOpex, bold: true },
    { label: "EBITDA", getter: (y) => y.ebitda, bold: true },
    { label: "D&A", getter: (y) => -y.da },
    { label: "EBIT", getter: (y) => y.ebit, bold: true },
    { label: "Intérêts", getter: (y) => -y.interestExpense },
    { label: "PBT", getter: (y) => y.pbt },
    { label: "Impôts", getter: (y) => -y.tax },
    { label: "Résultat net", getter: (y) => y.netIncome, bold: true },
  ];
  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/30">
        <tr>
          <th className="text-left p-1">Ligne</th>
          {yearly.map((y) => (
            <th key={y.fy} className="text-right p-1">
              {y.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={"border-t " + (r.bold ? "font-semibold bg-muted/20" : "")}>
            <td className="p-1">{r.label}</td>
            {yearly.map((y, i) => (
              <td key={i} className="p-1 text-right font-mono">
                {fmtCurrency(r.getter(y), { compact: true })}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CashflowTable({ yearly }: { yearly: ReturnType<typeof computeModel>["yearly"] }) {
  const rows: { label: string; getter: (y: typeof yearly[number]) => number; bold?: boolean }[] = [
    { label: "EBITDA", getter: (y) => y.ebitda, bold: true },
    { label: "Impôts cash", getter: (y) => -y.taxCash },
    { label: "TVA nette", getter: (y) => -y.vatNetPayable },
    { label: "CFO", getter: (y) => y.cfo, bold: true },
    { label: "CAPEX", getter: (y) => -y.capex },
    { label: "CFI", getter: (y) => y.cfi, bold: true },
    { label: "CFF", getter: (y) => y.cff, bold: true },
    { label: "Variation tréso", getter: (y) => y.netCashFlow, bold: true },
    { label: "Tréso fin d'exercice", getter: (y) => y.cashEnd, bold: true },
  ];
  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/30">
        <tr>
          <th className="text-left p-1">Flux</th>
          {yearly.map((y) => (
            <th key={y.fy} className="text-right p-1">
              {y.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={"border-t " + (r.bold ? "font-semibold bg-muted/20" : "")}>
            <td className="p-1">{r.label}</td>
            {yearly.map((y, i) => (
              <td key={i} className="p-1 text-right font-mono">
                {fmtCurrency(r.getter(y), { compact: true })}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RevenueByYearTable({ yearly }: { yearly: ReturnType<typeof computeModel>["yearly"] }) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/30">
        <tr>
          <th className="text-left p-1">Source</th>
          {yearly.map((y) => (
            <th key={y.fy} className="text-right p-1">
              {y.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          { label: "Nouveaux abos", k: "subsRevenue" as const },
          { label: "Legacy", k: "legacyRevenue" as const },
          { label: "Prestations", k: "prestationsRevenue" as const },
          { label: "Merchandising", k: "merchRevenue" as const },
        ].map((row) => (
          <tr key={row.k} className="border-t">
            <td className="p-1">{row.label}</td>
            {yearly.map((y, i) => (
              <td key={i} className="p-1 text-right font-mono">
                {fmtCurrency(y[row.k] as number, { compact: true })}
              </td>
            ))}
          </tr>
        ))}
        <tr className="border-t-2 font-bold bg-muted/20">
          <td className="p-1">Total CA</td>
          {yearly.map((y, i) => (
            <td key={i} className="p-1 text-right font-mono">
              {fmtCurrency(y.totalRevenue, { compact: true })}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function OpexByYearTable({ yearly }: { yearly: ReturnType<typeof computeModel>["yearly"] }) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/30">
        <tr>
          <th className="text-left p-1">Catégorie</th>
          {yearly.map((y) => (
            <th key={y.fy} className="text-right p-1">
              {y.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          { label: "Salaires", k: "salaries" as const },
          { label: "Loyer", k: "rent" as const },
          { label: "Récurrent", k: "recurring" as const },
          { label: "Marketing", k: "marketing" as const },
          { label: "Provisions", k: "provisions" as const },
          { label: "Ponctuels", k: "oneOff" as const },
        ].map((row) => (
          <tr key={row.k} className="border-t">
            <td className="p-1">{row.label}</td>
            {yearly.map((y, i) => (
              <td key={i} className="p-1 text-right font-mono">
                {fmtCurrency(y[row.k] as number, { compact: true })}
              </td>
            ))}
          </tr>
        ))}
        <tr className="border-t-2 font-bold bg-muted/20">
          <td className="p-1">Total OPEX</td>
          {yearly.map((y, i) => (
            <td key={i} className="p-1 text-right font-mono">
              {fmtCurrency(y.totalOpex, { compact: true })}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function ComparablesTable({
  params,
  result,
}: {
  params: Parameters<typeof computeModel>[0];
  result: ReturnType<typeof computeModel>;
}) {
  const tiers = params.subs.tiers ?? [];
  const avgPrice = tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
  const lastFy = result.yearly[result.yearly.length - 1];
  const rows = [
    {
      metric: "Prix moyen abo",
      our: avgPrice,
      low: SECTOR_BENCHMARKS.monthlyPriceCrossfit.low,
      high: SECTOR_BENCHMARKS.monthlyPriceCrossfit.high,
      unit: "€" as const,
    },
    {
      metric: "Marge EBITDA finale",
      our: lastFy?.ebitdaMargin ?? 0,
      low: SECTOR_BENCHMARKS.ebitdaMarginCrossfit.low,
      high: SECTOR_BENCHMARKS.ebitdaMarginCrossfit.high,
      unit: "%" as const,
    },
    {
      metric: "Membres ramp-up",
      our: params.subs.rampEndCount,
      low: SECTOR_BENCHMARKS.membersMatureCrossfit.low,
      high: SECTOR_BENCHMARKS.membersMatureCrossfit.high,
      unit: "n" as const,
    },
    {
      metric: "Churn mensuel",
      our: params.subs.monthlyChurnPct ?? 0,
      low: SECTOR_BENCHMARKS.churnCrossfitCommunity.low,
      high: SECTOR_BENCHMARKS.churnCrossfitCommunity.high,
      unit: "%" as const,
    },
  ];
  const fmt = (v: number, u: "€" | "%" | "n") =>
    u === "€" ? fmtCurrency(v) : u === "%" ? fmtPct(v) : fmtNum(v);
  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/30">
        <tr>
          <th className="text-left p-1">Indicateur</th>
          <th className="text-right p-1">Notre BP</th>
          <th className="text-right p-1">Plage marché</th>
          <th className="text-left p-1">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const status = evaluate({
            metric: r.metric,
            category: "Marché",
            ourValue: r.our,
            unit: r.unit,
            benchmarkLow: r.low,
            benchmarkHigh: r.high,
            source: "",
          }).status;
          return (
            <tr key={i} className="border-t">
              <td className="p-1">{r.metric}</td>
              <td className="p-1 text-right font-mono">{fmt(r.our, r.unit)}</td>
              <td className="p-1 text-right font-mono text-muted-foreground">
                {fmt(r.low, r.unit)} – {fmt(r.high, r.unit)}
              </td>
              <td className="p-1">
                {status === "in-range" ? "✓ in-range" : status === "above" ? "▲ above" : "▼ below"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
