"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RevenueEbitdaChart,
  CashFlowChart,
  MonthlyEbitdaChart,
  RevenueBreakdownChart,
  CostBreakdownChart,
} from "@/components/charts";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { SynthesisCard } from "@/components/synthesis-card";
import { fmtCurrency, fmtPct } from "@/lib/format";
import {
  TrendingUp,
  Wallet,
  Coins,
  Calendar,
  AlertTriangle,
} from "lucide-react";

export default function DashboardPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  const yearly = result.yearly;
  const last = yearly[yearly.length - 1];
  const first = yearly[0];

  const yearlyChartData = yearly.map((y) => ({
    label: y.label,
    CA: y.totalRevenue,
    EBITDA: y.ebitda,
  }));

  const cashChartData = result.monthly.map((m) => ({
    label: m.label,
    Trésorerie: m.cashBalance,
  }));

  const monthlyEbitdaData = result.monthly.map((m) => ({
    label: m.label,
    "EBITDA mensuel": m.ebitda,
  }));

  const breakdownData = yearly.map((y) => ({
    label: y.label,
    "Nouveaux abos": y.subsRevenue,
    Legacy: y.legacyRevenue,
    Prestations: y.prestationsRevenue,
    Merchandising: y.merchRevenue,
  }));

  const costBreakdownData = yearly.map((y) => ({
    label: y.label,
    Salaires: y.salaries,
    Loyer: y.rent,
    Récurrent: y.recurring,
    Marketing: y.marketing,
    Provisions: y.provisions,
    Ponctuels: y.oneOff,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Business Plan CFRG — {first.label} → {last.label} ({result.horizonYears} ans)
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <SynthesisCard />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={`CA ${last.label}`}
          value={fmtCurrency(last.totalRevenue, { compact: true })}
          subValue={`vs ${fmtCurrency(first.totalRevenue, { compact: true })} ${first.label}`}
          trend={(last.totalRevenue - first.totalRevenue) / first.totalRevenue}
          intent="positive"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title={`EBITDA ${last.label}`}
          value={fmtCurrency(last.ebitda, { compact: true })}
          subValue={`Marge ${fmtPct(last.ebitdaMargin)}`}
          intent={last.ebitda > 0 ? "positive" : "negative"}
          icon={<Coins className="h-4 w-4" />}
        />
        <KpiCard
          title="Trésorerie min."
          value={fmtCurrency(result.cashTroughValue, { compact: true })}
          subValue={
            result.cashTroughMonth !== null
              ? result.monthly[result.cashTroughMonth].label
              : "—"
          }
          intent={result.cashTroughValue < 0 ? "negative" : "positive"}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          title="Break-even"
          value={
            result.breakEvenMonth !== null
              ? result.monthly[result.breakEvenMonth].label
              : "Non atteint"
          }
          subValue="EBITDA cumulé > 0"
          intent={result.breakEvenMonth !== null ? "positive" : "warning"}
          icon={<Calendar className="h-4 w-4" />}
        />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {yearly.map((y) => (
          <Card key={y.fy}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{y.label}</span>
                {y.growthPct > 0 && (
                  <span className="text-xs text-emerald-600 font-normal">
                    +{fmtPct(y.growthPct, 0)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CA</span>
                <span className="font-medium">{fmtCurrency(y.totalRevenue, { compact: true })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">EBITDA</span>
                <span className={y.ebitda >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                  {fmtCurrency(y.ebitda, { compact: true })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Marge</span>
                <span>{fmtPct(y.ebitdaMargin)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t mt-1">
                <span className="text-muted-foreground">Tréso fin</span>
                <span className={y.cashEnd < 0 ? "text-red-600 font-medium" : ""}>
                  {fmtCurrency(y.cashEnd, { compact: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {result.cashTroughValue < 0 && (
        <Card className="border-red-300 bg-red-50/50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-red-900">Trésorerie négative détectée</div>
              <div className="text-red-700 mt-1">
                Point bas: {fmtCurrency(result.cashTroughValue)} en{" "}
                {result.cashTroughMonth !== null
                  ? result.monthly[result.cashTroughMonth].label
                  : "—"}
                . Considérer ligne de découvert, 2e tranche levée, ou réduction CAPEX initial.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CA & EBITDA annuels</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueEbitdaChart data={yearlyChartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trésorerie cumulée (mensuel)</CardTitle>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={cashChartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>EBITDA mensuel</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyEbitdaChart data={monthlyEbitdaData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Décomposition CA</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueBreakdownChart data={breakdownData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Décomposition charges opérationnelles</CardTitle>
          </CardHeader>
          <CardContent>
            <CostBreakdownChart data={costBreakdownData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
