"use client";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Sparkles, TrendingUp, Wallet, AlertCircle, Target } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { getInvestorAssumptions } from "@/lib/model/defaults";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { fmtCurrency, fmtPct } from "@/lib/format";

export default function FinancialHighlightsPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const lastFy = result.yearly[result.yearly.length - 1];
  const firstFy = result.yearly[0];
  const totalCapex =
    params.capex.equipment + params.capex.travaux + params.capex.juridique + params.capex.depots;
  const totalRaised =
    (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0) +
    (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0) +
    (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);
  const totalEquity = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const cumulativeNetIncome = result.yearly.reduce((s, y) => s + y.netIncome, 0);
  const totalEbitda5y = result.yearly.reduce((s, y) => s + y.ebitda, 0);
  // Multiple investisseur = (EBITDA dernière FY × multiple sortie) / equity invested.
  // Le multiple de sortie est lu depuis params.investorAssumptions.exitMultipleEbitda
  // pour rester cohérent avec /investor (auparavant hardcoded 5x ici, ce qui divergeait
  // du slider /investor configuré par l'utilisateur).
  const exitMultipleEbitda = getInvestorAssumptions(params).exitMultipleEbitda!;
  const exitMultiple = totalEquity > 0 ? (lastFy.ebitda * exitMultipleEbitda) / totalEquity : 0;

  const breakEvenLabel =
    result.breakEvenMonth !== null
      ? result.monthLabels[result.breakEvenMonth] ?? `M${result.breakEvenMonth}`
      : "Non atteint";

  // Synthesis paragraph
  const cagr =
    firstFy.totalRevenue > 0
      ? Math.pow(lastFy.totalRevenue / firstFy.totalRevenue, 1 / Math.max(1, result.yearly.length - 1)) - 1
      : 0;
  const synthesis =
    `Le projet ${params.timeline.startYear} → ${params.timeline.startYear + params.timeline.horizonYears - 1} ` +
    `cible un CA de ${fmtCurrency(lastFy.totalRevenue, { compact: true })} en ${lastFy.label} ` +
    `(CAGR ${fmtPct(cagr, 0)}), porté par ${params.subs.rampEndCount} membres en ramp-up. ` +
    `EBITDA final ${fmtCurrency(lastFy.ebitda, { compact: true })} (marge ${fmtPct(lastFy.ebitdaMargin, 0)}), ` +
    `avec un break-even atteint ${result.breakEvenMonth !== null ? `en ${breakEvenLabel}` : "non sur l'horizon"}. ` +
    `Levée totale ${fmtCurrency(totalRaised, { compact: true })} (dont ${fmtCurrency(totalEquity, { compact: true })} equity), ` +
    `CAPEX initial ${fmtCurrency(totalCapex, { compact: true })}.`;

  const chartData = result.yearly.map((y) => ({
    label: y.label,
    CA: y.totalRevenue,
    EBITDA: y.ebitda,
  }));

  const onExport = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(printRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `cfrg-highlights-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      alert(`Export PNG échoué: ${e instanceof Error ? e.message : "erreur inconnue"}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-[#D32F2F]" /> Synthèse financière 1-page
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vue condensée pour pitch investisseur. Exporter en PNG pour insérer dans deck.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Export..." : "Exporter PNG"}
          </Button>
          <ScenarioSwitcher />
        </div>
      </header>

      {/* Page exportable */}
      <div
        ref={printRef}
        className="bg-white rounded-md border shadow-sm p-8 space-y-5 max-w-4xl mx-auto"
        style={{ minHeight: 800 }}
      >
        {/* Header de la page */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#D32F2F] font-bold">
              Business Plan
            </div>
            <h2 className="font-heading text-2xl font-bold uppercase tracking-tight">
              CrossFit Rive Gauche
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Synthèse financière — {result.fyLabels[0]} → {result.fyLabels[result.fyLabels.length - 1]}
            </p>
          </div>
          <div className="text-right text-[10px] text-muted-foreground">
            <div>Document généré le {new Date().toLocaleDateString("fr-FR")}</div>
            <div>Confidentiel</div>
          </div>
        </div>

        {/* Top 8 KPIs */}
        <div className="grid grid-cols-4 gap-3">
          <Kpi
            label="CA final"
            value={fmtCurrency(lastFy.totalRevenue, { compact: true })}
            sub={lastFy.label}
            icon={<TrendingUp className="h-4 w-4" />}
            accent
          />
          <Kpi
            label="EBITDA final"
            value={fmtCurrency(lastFy.ebitda, { compact: true })}
            sub={`Marge ${fmtPct(lastFy.ebitdaMargin, 0)}`}
            positive={lastFy.ebitda >= 0}
          />
          <Kpi
            label="Marge EBITDA"
            value={fmtPct(lastFy.ebitdaMargin, 0)}
            sub={`vs ${fmtPct(firstFy.ebitdaMargin, 0)} en ${firstFy.label}`}
          />
          <Kpi
            label="Break-even"
            value={result.breakEvenMonth !== null ? `M${result.breakEvenMonth}` : "—"}
            sub={breakEvenLabel}
          />
          <Kpi
            label="Levée totale"
            value={fmtCurrency(totalRaised, { compact: true })}
            sub={`dont ${fmtCurrency(totalEquity, { compact: true })} equity`}
            icon={<Wallet className="h-4 w-4" />}
          />
          <Kpi
            label="Tréso fin"
            value={fmtCurrency(lastFy.cashEnd, { compact: true })}
            positive={lastFy.cashEnd >= 0}
            sub={`creux ${fmtCurrency(result.cashTroughValue, { compact: true })}`}
          />
          <Kpi
            label="Multiple investisseur"
            value={`${exitMultiple.toFixed(1)}×`}
            sub={`EBITDA × ${exitMultipleEbitda} / equity`}
            icon={<Target className="h-4 w-4" />}
          />
          <Kpi
            label="EBITDA cumulé"
            value={fmtCurrency(totalEbitda5y, { compact: true })}
            sub={`sur ${result.yearly.length} ans`}
          />
        </div>

        {/* 2 graphiques */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded border p-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
              CA & EBITDA par année
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => fmtCurrency(v, { compact: true })} tick={{ fontSize: 9 }} />
                <Tooltip
                  formatter={(v) => fmtCurrency(Number(v))}
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                />
                <Bar dataKey="CA" fill="#D32F2F" radius={[3, 3, 0, 0]} />
                <Bar dataKey="EBITDA" fill="#1a1a1a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded border p-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
              Trésorerie cumulée
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={result.monthly.filter((_, i) => i % 3 === 0).map((m) => ({
                  label: m.label,
                  Trésorerie: m.cashBalance,
                }))}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D32F2F" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#D32F2F" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tickFormatter={(v) => fmtCurrency(v, { compact: true })} tick={{ fontSize: 9 }} />
                <Tooltip
                  formatter={(v) => fmtCurrency(Number(v))}
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                />
                <Area type="monotone" dataKey="Trésorerie" stroke="#D32F2F" fill="url(#cashGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Paragraphe synthèse */}
        <div className="rounded border p-4 bg-muted/20">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
            Synthèse
          </div>
          <p className="text-sm leading-relaxed">{synthesis}</p>
        </div>

        {/* Footer */}
        <div className="border-t pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <div>
            CAPEX initial {fmtCurrency(totalCapex, { compact: true })} · Cumul net income{" "}
            {fmtCurrency(cumulativeNetIncome, { compact: true })}
          </div>
          <div className="flex items-center gap-1">
            {result.cashTroughValue < 0 && (
              <>
                <AlertCircle className="h-3 w-3 text-red-600" />
                Tréso négative — buffer additionnel requis
              </>
            )}
          </div>
        </div>
      </div>

      <Card className="bg-muted/30 max-w-4xl mx-auto">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2">Conseils export</h3>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            <li>Le PNG est en pixelRatio 2× pour qualité retina (~2x plus large que l&apos;affichage).</li>
            <li>Pour un PDF, utilise le bouton ci-dessus puis insère le PNG dans Keynote/Slides.</li>
            <li>Pour version courte d&apos;email, exporte et joints en pièce jointe + lien <span className="font-mono">/share</span>.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  positive,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  positive?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded border p-3 " +
        (accent ? "bg-[#D32F2F]/5 border-[#D32F2F]/30" : "bg-card")
      }
    >
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
        {icon} {label}
      </div>
      <div
        className={
          "text-xl font-heading font-bold mt-0.5 " +
          (positive === false ? "text-red-700" : positive === true ? "text-emerald-700" : "")
        }
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
