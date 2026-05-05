"use client";
import { useMemo, useState } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { WaterfallChart, type WaterfallStep } from "@/components/waterfall-chart";
import { fmtCurrency } from "@/lib/format";

export default function WaterfallsPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  const fyOptions = result.yearly.map((y) => y.label);
  const [selectedFy, setSelectedFy] = useState<string>(fyOptions[fyOptions.length - 1] ?? "");

  const fy = result.yearly.find((y) => y.label === selectedFy) ?? result.yearly[result.yearly.length - 1];
  const prevFy = fy && fy.fy > 0 ? result.yearly[fy.fy - 1] : null;

  const revenueSteps: WaterfallStep[] = fy
    ? [
        { label: "Nouveaux abos", value: fy.subsRevenue },
        { label: "Legacy", value: fy.legacyRevenue },
        { label: "Prestations", value: fy.prestationsRevenue },
        { label: "Merch", value: fy.merchRevenue },
        { label: "CA total", value: fy.totalRevenue, type: "total" },
      ]
    : [];

  const ebitdaSteps: WaterfallStep[] = fy
    ? [
        { label: "CA", value: fy.totalRevenue },
        { label: "Salaires", value: -fy.salaries },
        { label: "Loyer", value: -fy.rent },
        { label: "Récurrent", value: -fy.recurring },
        { label: "Marketing", value: -fy.marketing },
        { label: "Provisions", value: -fy.provisions },
        { label: "Ponctuels", value: -fy.oneOff },
        { label: "EBITDA", value: fy.ebitda, type: "total" },
      ]
    : [];

  const yoySteps: WaterfallStep[] = fy && prevFy
    ? [
        { label: `EBITDA ${prevFy.label}`, value: prevFy.ebitda, type: "subtotal" },
        { label: "Δ Nouveaux abos", value: fy.subsRevenue - prevFy.subsRevenue },
        { label: "Δ Legacy", value: fy.legacyRevenue - prevFy.legacyRevenue },
        { label: "Δ Prestations", value: fy.prestationsRevenue - prevFy.prestationsRevenue },
        { label: "Δ Merch", value: fy.merchRevenue - prevFy.merchRevenue },
        { label: "Δ Salaires", value: -(fy.salaries - prevFy.salaries) },
        { label: "Δ Loyer", value: -(fy.rent - prevFy.rent) },
        { label: "Δ Récurrent", value: -(fy.recurring - prevFy.recurring) },
        { label: "Δ Marketing", value: -(fy.marketing - prevFy.marketing) },
        { label: "Δ Provisions/Ponctuels", value: -((fy.provisions + fy.oneOff) - (prevFy.provisions + prevFy.oneOff)) },
        { label: `EBITDA ${fy.label}`, value: fy.ebitda, type: "total" },
      ]
    : [];

  const cfTotalSteps: WaterfallStep[] = fy
    ? [
        { label: "EBITDA", value: fy.ebitda },
        { label: "− Impôts cash", value: -fy.taxCash },
        { label: "− TVA nette", value: -fy.vatNetPayable },
        { label: "± BFR", value: fy.cfo - fy.ebitda + fy.taxCash + fy.vatNetPayable },
        { label: "− CAPEX", value: -fy.capex },
        { label: "+ Apports cash", value: Math.max(0, fy.cff + fy.interestExpense) },
        { label: "− Service dette", value: Math.min(0, fy.cff + fy.interestExpense) - fy.interestExpense },
        { label: "Var. tréso", value: fy.netCashFlow, type: "total" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Waterfall charts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Décomposition visuelle du CA, EBITDA et trésorerie. Sélectionne un FY pour voir les contributions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedFy}
            onChange={(e) => setSelectedFy(e.target.value)}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            {fyOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ScenarioSwitcher />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Décomposition CA — {fy?.label} ({fy && fmtCurrency(fy.totalRevenue, { compact: true })})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WaterfallChart steps={revenueSteps} height={300} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Décomposition EBITDA — {fy?.label} ({fy && fmtCurrency(fy.ebitda, { compact: true })})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WaterfallChart steps={ebitdaSteps} height={340} />
        </CardContent>
      </Card>

      {prevFy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Variation EBITDA {prevFy.label} → {fy.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WaterfallChart steps={yoySteps} height={360} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Variation de trésorerie — {fy?.label} ({fy && fmtCurrency(fy.netCashFlow, { compact: true })})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WaterfallChart steps={cfTotalSteps} height={340} />
        </CardContent>
      </Card>
    </div>
  );
}
