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
import { fmtCurrency, fmtPct } from "@/lib/format";
import { TrendingDown, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Sliders = {
  caMultiplier: number;
  salaryMultiplier: number;
  rentMultiplier: number;
  marketingMultiplier: number;
};

const DEFAULT_SLIDERS: Sliders = {
  caMultiplier: 1,
  salaryMultiplier: 1,
  rentMultiplier: 1,
  marketingMultiplier: 1,
};

function applySliders(p: ModelParams, s: Sliders): ModelParams {
  return {
    ...p,
    subs: {
      ...p.subs,
      rampStartCount: p.subs.rampStartCount * s.caMultiplier,
      rampEndCount: p.subs.rampEndCount * s.caMultiplier,
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
  };
}

export default function SensitivityPage() {
  const params = useModelStore((s) => s.params);
  const [sliders, setSliders] = useState<Sliders>(DEFAULT_SLIDERS);

  const baseResult = useMemo(() => computeModel(params), [params]);
  const sensResult = useMemo(() => computeModel(applySliders(params, sliders)), [params, sliders]);

  const baseLast = baseResult.yearly[baseResult.yearly.length - 1];
  const sensLast = sensResult.yearly[sensResult.yearly.length - 1];

  const applyStress = (kind: "pessimist" | "base" | "optimist") => {
    if (kind === "pessimist") {
      setSliders({ caMultiplier: 0.8, salaryMultiplier: 1.1, rentMultiplier: 1.05, marketingMultiplier: 1 });
      toast.warning("Scénario pessimiste appliqué (-20% CA, +10% salaires, +5% loyer)");
    } else if (kind === "optimist") {
      setSliders({ caMultiplier: 1.2, salaryMultiplier: 1, rentMultiplier: 1, marketingMultiplier: 1.1 });
      toast.success("Scénario optimiste appliqué (+20% CA)");
    } else {
      setSliders(DEFAULT_SLIDERS);
    }
  };

  const setSlider = (k: keyof Sliders, v: number) =>
    setSliders((prev) => ({ ...prev, [k]: v }));

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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyStress("pessimist")}
                className="text-red-700"
              >
                <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                Pessimiste
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyStress("base")}>
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Base
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyStress("optimist")}
                className="text-emerald-700"
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                Optimiste
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Drivers (multipliers ±)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Curseurs appliquent un coefficient sur les valeurs actuelles. 1.0 = aucun changement.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <SliderRow
            label="CA / Acquisition membres"
            value={sliders.caMultiplier}
            onChange={(v) => setSlider("caMultiplier", v)}
            min={0.5}
            max={1.5}
            step={0.05}
            color="#10b981"
          />
          <SliderRow
            label="Masse salariale"
            value={sliders.salaryMultiplier}
            onChange={(v) => setSlider("salaryMultiplier", v)}
            min={0.7}
            max={1.3}
            step={0.05}
            color="#D32F2F"
          />
          <SliderRow
            label="Loyer"
            value={sliders.rentMultiplier}
            onChange={(v) => setSlider("rentMultiplier", v)}
            min={0.8}
            max={1.3}
            step={0.05}
            color="#F59E0B"
          />
          <SliderRow
            label="Marketing"
            value={sliders.marketingMultiplier}
            onChange={(v) => setSlider("marketingMultiplier", v)}
            min={0.5}
            max={2}
            step={0.05}
            color="#3b82f6"
          />
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ImpactKpi
          label={`CA ${sensLast.label}`}
          base={baseLast.totalRevenue}
          sens={sensLast.totalRevenue}
        />
        <ImpactKpi
          label={`EBITDA ${sensLast.label}`}
          base={baseLast.ebitda}
          sens={sensLast.ebitda}
          warningIfNegative
        />
        <ImpactKpi
          label="Trésorerie min"
          base={baseResult.cashTroughValue}
          sens={sensResult.cashTroughValue}
          warningIfNegative
        />
        <ImpactKpi
          label={`Tréso fin ${sensLast.label}`}
          base={baseLast.cashEnd}
          sens={sensLast.cashEnd}
          warningIfNegative
        />
      </section>

      {sensResult.cashTroughValue < 0 && (
        <Card className="border-red-300 bg-red-50/50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-red-900">
                Stress test: trésorerie négative
              </div>
              <div className="text-red-700 mt-1">
                Avec ces hypothèses, point bas = {fmtCurrency(sensResult.cashTroughValue)} en{" "}
                {sensResult.cashTroughMonth !== null
                  ? sensResult.monthly[sensResult.cashTroughMonth].label
                  : "—"}
                . Le BP ne tient pas en stress test.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div
          className={
            "text-xl font-bold mt-1 " + (warningIfNegative && sens < 0 ? "text-red-600" : "")
          }
        >
          {fmtCurrency(sens, { compact: true })}
        </div>
        <div
          className={
            "text-xs mt-1 font-medium " +
            (delta >= 0 ? "text-emerald-600" : "text-red-600")
          }
        >
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
