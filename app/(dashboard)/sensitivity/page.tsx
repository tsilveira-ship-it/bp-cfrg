"use client";
import { useState, useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import type { ModelParams } from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { SynthesisCard } from "@/components/synthesis-card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { InfoLabel } from "@/components/info-label";
import {
  TrendingDown,
  TrendingUp,
  Zap,
  AlertTriangle,
  Activity,
  CloudRain,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import {
  TORNADO_DRIVERS,
  runTornado,
  type TornadoMetric,
  type TornadoBar,
} from "@/lib/tornado";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Sliders = {
  caMultiplier: number;
  salaryMultiplier: number;
  rentMultiplier: number;
  marketingMultiplier: number;
  churnMultiplier: number;
  priceIndexMultiplier: number;
  capacityMultiplier: number;
  isMultiplier: number;
  openingDelayMonths: number;
  loanRateMultiplier: number;
};

const DEFAULT_SLIDERS: Sliders = {
  caMultiplier: 1,
  salaryMultiplier: 1,
  rentMultiplier: 1,
  marketingMultiplier: 1,
  churnMultiplier: 1,
  priceIndexMultiplier: 1,
  capacityMultiplier: 1,
  isMultiplier: 1,
  openingDelayMonths: 0,
  loanRateMultiplier: 1,
};

function applySliders(p: ModelParams, s: Sliders): ModelParams {
  const out: ModelParams = {
    ...p,
    subs: {
      ...p.subs,
      rampStartCount: p.subs.rampStartCount * s.caMultiplier,
      rampEndCount: p.subs.rampEndCount * s.caMultiplier,
      priceIndexPa: p.subs.priceIndexPa * s.priceIndexMultiplier,
      monthlyChurnPct:
        p.subs.monthlyChurnPct !== undefined
          ? Math.max(0, Math.min(0.5, p.subs.monthlyChurnPct * s.churnMultiplier))
          : p.subs.monthlyChurnPct,
    },
    salaries: {
      ...p.salaries,
      items: p.salaries.items.map((it) => ({
        ...it,
        monthlyGross: it.monthlyGross * s.salaryMultiplier,
        fy26Bump: it.fy26Bump !== undefined ? it.fy26Bump * s.salaryMultiplier : undefined,
      })),
      freelancePools: (p.salaries.freelancePools ?? []).map((pool) => ({
        ...pool,
        hourlyRate: pool.hourlyRate * s.salaryMultiplier,
      })),
    },
    rent: {
      ...p.rent,
      monthlyByFy: p.rent.monthlyByFy.map((v) => v * s.rentMultiplier),
    },
    marketing: {
      ...p.marketing,
      monthlyBudget: p.marketing.monthlyBudget * s.marketingMultiplier,
    },
    tax: {
      ...p.tax,
      isRate: Math.max(0, Math.min(0.5, p.tax.isRate * s.isMultiplier)),
    },
    capacity: p.capacity
      ? {
          ...p.capacity,
          capacityPerClass: Math.max(1, p.capacity.capacityPerClass * s.capacityMultiplier),
        }
      : p.capacity,
    financing: {
      ...p.financing,
      loans: Array.isArray(p.financing.loans)
        ? p.financing.loans.map((l) => ({
            ...l,
            annualRatePct: Math.max(0, Math.min(25, l.annualRatePct * s.loanRateMultiplier)),
          }))
        : p.financing.loans,
      bonds: Array.isArray(p.financing.bonds)
        ? p.financing.bonds.map((b) => ({
            ...b,
            annualRatePct: Math.max(0, Math.min(25, b.annualRatePct * s.loanRateMultiplier)),
          }))
        : p.financing.bonds,
    },
  };

  if (s.openingDelayMonths > 0) {
    const lostFraction = Math.max(0, Math.min(1, s.openingDelayMonths / 12));
    out.subs = {
      ...out.subs,
      rampStartCount: out.subs.rampStartCount * (1 - lostFraction),
      rampEndCount: out.subs.rampEndCount * (1 - lostFraction * 0.5),
    };
    out.marketing = {
      ...out.marketing,
      monthlyBudget: out.marketing.monthlyBudget * (1 - lostFraction),
    };
  }

  return out;
}

export default function SensitivityPage() {
  const params = useModelStore((s) => s.params);
  const [sliders, setSliders] = useState<Sliders>(DEFAULT_SLIDERS);
  const [tornadoMetric, setTornadoMetric] = useState<TornadoMetric>("ebitdaLastFy");
  const [tornadoShockPct, setTornadoShockPct] = useState(0.1);

  const baseResult = useMemo(() => computeModel(params), [params]);
  const sensResult = useMemo(() => computeModel(applySliders(params, sliders)), [params, sliders]);
  const tornadoBars = useMemo(
    () =>
      runTornado(params, TORNADO_DRIVERS, {
        shockPct: tornadoShockPct,
        metric: tornadoMetric,
      }),
    [params, tornadoShockPct, tornadoMetric]
  );

  const baseLast = baseResult.yearly[baseResult.yearly.length - 1];
  const sensLast = sensResult.yearly[sensResult.yearly.length - 1];

  const applyStress = (kind: "pessimist" | "base" | "optimist" | "recession" | "forceMajeure" | "refinancing") => {
    switch (kind) {
      case "pessimist":
        setSliders({
          ...DEFAULT_SLIDERS,
          caMultiplier: 0.8,
          salaryMultiplier: 1.1,
          rentMultiplier: 1.05,
          churnMultiplier: 1.3,
        });
        toast.warning("Pessimiste : -20% CA, +10% salaires, +5% loyer, churn +30%");
        break;
      case "optimist":
        setSliders({
          ...DEFAULT_SLIDERS,
          caMultiplier: 1.2,
          marketingMultiplier: 1.1,
          churnMultiplier: 0.85,
        });
        toast.success("Optimiste : +20% CA, +10% marketing, churn -15%");
        break;
      case "recession":
        setSliders({
          ...DEFAULT_SLIDERS,
          caMultiplier: 0.75,
          salaryMultiplier: 1.05,
          priceIndexMultiplier: 0,
          churnMultiplier: 1.5,
          loanRateMultiplier: 1.4,
          marketingMultiplier: 0.7,
        });
        toast.warning("Récession : -25% CA, churn +50%, taux +40%, prix gelés, marketing -30%");
        break;
      case "forceMajeure":
        setSliders({
          ...DEFAULT_SLIDERS,
          caMultiplier: 0.5,
          churnMultiplier: 1.8,
          marketingMultiplier: 0.5,
        });
        toast.error("Force majeure : -50% CA temporaire, churn ×1.8 (lockdown / sinistre)");
        break;
      case "refinancing":
        setSliders({
          ...DEFAULT_SLIDERS,
          loanRateMultiplier: 1.7,
          openingDelayMonths: 3,
          caMultiplier: 0.95,
        });
        toast.warning("Refinancement difficile : taux ×1.7, retard 3 mois, -5% CA");
        break;
      case "base":
        setSliders(DEFAULT_SLIDERS);
        break;
    }
  };

  const setSlider = <K extends keyof Sliders>(k: K, v: Sliders[K]) =>
    setSliders((prev) => ({ ...prev, [k]: v }));

  const tornadoMetricLabel: Record<TornadoMetric, string> = {
    ebitdaLastFy: `EBITDA ${baseLast.label}`,
    ebitdaMarginLastFy: `Marge EBITDA ${baseLast.label}`,
    cashTrough: "Trésorerie min",
    cashEndLastFy: `Trésorerie fin ${baseLast.label}`,
    breakEvenMonth: "Mois break-even",
    netIncomeLastFy: `Résultat net ${baseLast.label}`,
    irr5y: "TRI 5 ans",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sensibilité & Stress test</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Faire varier les drivers et mesurer l&apos;impact sur EBITDA, marge, trésorerie
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <SynthesisCard />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Scénarios pré-réglés</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => applyStress("pessimist")} className="text-red-700">
                <TrendingDown className="h-3.5 w-3.5 mr-1.5" /> Pessimiste
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyStress("base")}>
                <Zap className="h-3.5 w-3.5 mr-1.5" /> Base
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyStress("optimist")} className="text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Optimiste
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyStress("recession")} className="text-orange-700">
                <Activity className="h-3.5 w-3.5 mr-1.5" /> Récession
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyStress("forceMajeure")} className="text-red-800">
                <CloudRain className="h-3.5 w-3.5 mr-1.5" /> Force majeure
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyStress("refinancing")} className="text-amber-700">
                <Banknote className="h-3.5 w-3.5 mr-1.5" /> Refi difficile
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Drivers (multiplicateurs ±)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Curseurs appliquent un coefficient sur les valeurs actuelles. 1.0 = aucun changement.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <SliderRow label="CA / Acquisition membres" value={sliders.caMultiplier} onChange={(v) => setSlider("caMultiplier", v)} min={0.5} max={1.5} step={0.05} color="#10b981" />
          <SliderRow label="Masse salariale" value={sliders.salaryMultiplier} onChange={(v) => setSlider("salaryMultiplier", v)} min={0.7} max={1.3} step={0.05} color="#D32F2F" />
          <SliderRow label="Loyer" value={sliders.rentMultiplier} onChange={(v) => setSlider("rentMultiplier", v)} min={0.8} max={1.3} step={0.05} color="#F59E0B" />
          <SliderRow label="Marketing" value={sliders.marketingMultiplier} onChange={(v) => setSlider("marketingMultiplier", v)} min={0.5} max={2} step={0.05} color="#3b82f6" />
          <SliderRow label="Churn mensuel" value={sliders.churnMultiplier} onChange={(v) => setSlider("churnMultiplier", v)} min={0.5} max={2} step={0.05} color="#dc2626" />
          <SliderRow label="Indexation prix abos" value={sliders.priceIndexMultiplier} onChange={(v) => setSlider("priceIndexMultiplier", v)} min={0} max={2} step={0.05} color="#10b981" />
          <SliderRow label="Capacité par cours" value={sliders.capacityMultiplier} onChange={(v) => setSlider("capacityMultiplier", v)} min={0.7} max={1.3} step={0.05} color="#8b5cf6" />
          <SliderRow label="Taux IS" value={sliders.isMultiplier} onChange={(v) => setSlider("isMultiplier", v)} min={0.5} max={1.5} step={0.05} color="#6b7280" />
          <SliderRow label="Taux d'intérêt emprunts" value={sliders.loanRateMultiplier} onChange={(v) => setSlider("loanRateMultiplier", v)} min={0.5} max={2} step={0.05} color="#ef4444" />
          <DelayRow value={sliders.openingDelayMonths} onChange={(v) => setSlider("openingDelayMonths", v)} />
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ImpactKpi label={`CA ${sensLast.label}`} base={baseLast.totalRevenue} sens={sensLast.totalRevenue} />
        <ImpactKpi label={`EBITDA ${sensLast.label}`} base={baseLast.ebitda} sens={sensLast.ebitda} warningIfNegative />
        <ImpactKpi label="Trésorerie min" base={baseResult.cashTroughValue} sens={sensResult.cashTroughValue} warningIfNegative />
        <ImpactKpi label={`Tréso fin ${sensLast.label}`} base={baseLast.cashEnd} sens={sensLast.cashEnd} warningIfNegative />
      </section>

      {sensResult.cashTroughValue < 0 && (
        <Card className="border-red-300 bg-red-50/50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-red-900">Stress test: trésorerie négative</div>
              <div className="text-red-700 mt-1">
                Avec ces hypothèses, point bas = {fmtCurrency(sensResult.cashTroughValue)} en{" "}
                {sensResult.cashTroughMonth !== null ? sensResult.monthly[sensResult.cashTroughMonth].label : "—"}.
                Le BP ne tient pas en stress test.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Tornado chart — décomposition de l&apos;impact par driver</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Chaque driver isolément à ±{fmtPct(tornadoShockPct, 0)} (one-at-a-time). Trié par amplitude. Drivers en haut = leviers principaux.
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={tornadoMetric} onValueChange={(v) => setTornadoMetric(v as TornadoMetric)}>
                <SelectTrigger className="w-[220px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(tornadoMetricLabel) as TornadoMetric[]).map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {tornadoMetricLabel[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(tornadoShockPct)} onValueChange={(v) => setTornadoShockPct(parseFloat(v ?? "0.1"))}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.05" className="text-xs">±5%</SelectItem>
                  <SelectItem value="0.1" className="text-xs">±10%</SelectItem>
                  <SelectItem value="0.2" className="text-xs">±20%</SelectItem>
                  <SelectItem value="0.3" className="text-xs">±30%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TornadoChart bars={tornadoBars} metric={tornadoMetric} />
        </CardContent>
      </Card>
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  color: string;
}) {
  const pct = ((value - 1) * 100).toFixed(0);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{label}</label>
        <span
          className="text-sm font-mono font-bold"
          style={{ color: value > 1 ? "#10b981" : value < 1 ? color : "#666" }}
        >
          {value.toFixed(2)}× ({Number(pct) >= 0 ? "+" : ""}{pct}%)
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}

function DelayRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">Retard d&apos;ouverture</label>
        <span className="text-sm font-mono font-bold" style={{ color: value > 0 ? "#dc2626" : "#666" }}>
          {value} mois
        </span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={12}
        step={1}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}

function ImpactKpi({
  label,
  base,
  sens,
  warningIfNegative,
}: {
  label: string;
  base: number;
  sens: number;
  warningIfNegative?: boolean;
}) {
  const delta = sens - base;
  const pct = base !== 0 ? delta / Math.abs(base) : 0;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          <InfoLabel label={label} />
        </div>
        <div className={"text-xl font-bold mt-1 " + (warningIfNegative && sens < 0 ? "text-red-600" : "")}>
          {fmtCurrency(sens, { compact: true })}
        </div>
        <div className={"text-xs mt-1 font-medium " + (delta >= 0 ? "text-emerald-600" : "text-red-600")}>
          {delta >= 0 ? "+" : ""}
          {fmtCurrency(delta, { compact: true })} ({delta >= 0 ? "+" : ""}
          {fmtPct(pct, 1)})
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          base: {fmtCurrency(base, { compact: true })}
        </div>
      </CardContent>
    </Card>
  );
}

function TornadoChart({ bars, metric }: { bars: TornadoBar[]; metric: TornadoMetric }) {
  if (bars.length === 0) {
    return <p className="text-sm text-muted-foreground py-12 text-center">Aucun driver actif.</p>;
  }
  const isPct = metric === "ebitdaMarginLastFy" || metric === "irr5y";
  const isMonth = metric === "breakEvenMonth";
  const fmt = (v: number) => (isPct ? fmtPct(v, 1) : isMonth ? `M${Math.round(v)}` : fmtCurrency(v, { compact: true }));

  // Convert bars to chart data: lowDelta as negative bar, highDelta as positive bar
  const data = bars.map((b) => ({
    label: b.label,
    low: b.lowDelta,
    high: b.highDelta,
    range: b.range,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, bars.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }} stackOffset="sign">
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
        <XAxis
          type="number"
          tickFormatter={fmt}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(v) => fmt(Number(v))}
          contentStyle={{ backgroundColor: "white", borderRadius: 6, border: "1px solid #e5e5e5", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="low" stackId="t" name={`Choc -X%`} radius={[3, 0, 0, 3]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.low < 0 ? "#D32F2F" : "#16a34a"} />
          ))}
        </Bar>
        <Bar dataKey="high" stackId="t" name={`Choc +X%`} radius={[0, 3, 3, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.high > 0 ? "#16a34a" : "#D32F2F"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
