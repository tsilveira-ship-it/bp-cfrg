"use client";
import { useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import type { ActualEntry, MonthlyComputed } from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency, fmtPct } from "@/lib/format";

const VARIANCE_THRESHOLD = 0.10; // 10%

const METRICS: { key: keyof ActualEntry; label: string; forecastKey: keyof MonthlyComputed }[] = [
  { key: "revenue", label: "CA", forecastKey: "totalRevenue" },
  { key: "salaries", label: "Salaires", forecastKey: "salaries" },
  { key: "rent", label: "Loyer", forecastKey: "rent" },
  { key: "marketing", label: "Marketing", forecastKey: "marketing" },
  { key: "cashEnd", label: "Tréso fin de mois", forecastKey: "cashBalance" },
];

function monthIsoFromMonthlyIndex(startYear: number, m: number): string {
  // Sept de startYear = M0 → "YYYY-09"
  // Jan-Aug fall in next calendar year (matches buildTimeline)
  const monthIdx = m % 12;
  const fyIdx = Math.floor(m / 12);
  const calYear = startYear + fyIdx + (monthIdx >= 4 ? 1 : 0);
  const monthInYear = monthIdx < 4 ? 9 + monthIdx : monthIdx - 3; // Sept=9 ... Aug=8
  return `${calYear}-${String(monthInYear).padStart(2, "0")}`;
}

export default function VariancePage() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const result = useMemo(() => computeModel(params), [params]);

  const actuals = useMemo(() => params.actuals ?? [], [params.actuals]);
  const actualsByIso: Record<string, ActualEntry> = {};
  for (const a of actuals) actualsByIso[a.monthIso] = a;

  const upsertActual = (monthIso: string, patch: Partial<ActualEntry>) => {
    setParams((p) => {
      const list = (p.actuals ?? []).slice();
      const idx = list.findIndex((a) => a.monthIso === monthIso);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...patch };
      } else {
        list.push({ monthIso, ...patch });
      }
      return { ...p, actuals: list };
    });
  };

  const removeActual = (monthIso: string) => {
    setParams((p) => ({
      ...p,
      actuals: (p.actuals ?? []).filter((a) => a.monthIso !== monthIso),
    }));
  };

  const startYear = result.startYear;
  // Show months up to last actual or first 24 months
  const lastActualIso = actuals.length > 0
    ? actuals.map((a) => a.monthIso).sort().slice(-1)[0]
    : null;
  const horizonShown = Math.min(result.monthly.length, 24);

  // Summary: count of months with at least one actual + % avec écart >10%
  const monthsWithActual = actuals.length;
  const breaches = useMemo(() => {
    let n = 0;
    for (const a of actuals) {
      const m = result.monthly.find((mm) => monthIsoFromMonthlyIndex(startYear, mm.month) === a.monthIso);
      if (!m) continue;
      for (const metric of METRICS) {
        const fc = m[metric.forecastKey] as number;
        const ac = a[metric.key] as number | undefined;
        if (ac === undefined || fc === 0) continue;
        const diff = Math.abs((ac - fc) / fc);
        if (diff > VARIANCE_THRESHOLD) n++;
      }
    }
    return n;
  }, [actuals, result.monthly, startYear]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Variance — Réel vs Prévu</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Saisis les chiffres réels mensuels et compare au forecast. Alerte si écart absolu &gt; 10%.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Mois saisis</div>
            <div className="text-3xl font-heading font-bold">{monthsWithActual}</div>
          </CardContent>
        </Card>
        <Card className={breaches > 0 ? "border-amber-300 bg-amber-50/30" : ""}>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Alertes (écart &gt; 10%)</div>
            <div className={"text-3xl font-heading font-bold " + (breaches > 0 ? "text-amber-700" : "text-emerald-700")}>
              {breaches}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Dernier mois saisi</div>
            <div className="text-base font-medium">{lastActualIso ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saisie mensuelle (24 premiers mois)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Renseigne au moins le CA pour activer la comparaison. Les autres métriques sont optionnelles.
            Source typique : Square / Stripe / compta cabinet.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Mois</TableHead>
                <TableHead className="text-right">CA forecast</TableHead>
                <TableHead className="text-right">CA réel</TableHead>
                <TableHead className="text-right">Δ %</TableHead>
                {METRICS.slice(1).map((m) => (
                  <TableHead key={m.key} className="text-right">
                    {m.label} réel
                  </TableHead>
                ))}
                <TableHead className="text-right">—</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.monthly.slice(0, horizonShown).map((m) => {
                const monthIso = monthIsoFromMonthlyIndex(startYear, m.month);
                const a = actualsByIso[monthIso];
                const revFc = m.totalRevenue;
                const revAc = a?.revenue;
                const delta = revAc !== undefined && revFc > 0 ? (revAc - revFc) / revFc : null;
                const breach = delta !== null && Math.abs(delta) > VARIANCE_THRESHOLD;
                return (
                  <TableRow
                    key={m.month}
                    className={breach ? "bg-amber-50/40" : ""}
                  >
                    <TableCell className="text-xs font-mono">
                      <div>{m.label}</div>
                      <div className="text-muted-foreground text-[10px]">{monthIso}</div>
                    </TableCell>
                    <TableCell className="text-right text-xs">{fmtCurrency(revFc, { compact: true })}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={revAc ?? ""}
                        placeholder="—"
                        onChange={(e) => {
                          const v = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          upsertActual(monthIso, { revenue: v });
                        }}
                        className="h-8 text-xs text-right w-28"
                      />
                    </TableCell>
                    <TableCell
                      className={
                        "text-right text-xs " +
                        (delta === null
                          ? "text-muted-foreground"
                          : breach
                            ? "text-amber-700 font-semibold"
                            : "text-emerald-700")
                      }
                    >
                      {delta === null ? "—" : fmtPct(delta)}
                    </TableCell>
                    {METRICS.slice(1).map((metric) => {
                      const v = a?.[metric.key] as number | undefined;
                      return (
                        <TableCell key={metric.key} className="text-right">
                          <Input
                            type="number"
                            value={v ?? ""}
                            placeholder="—"
                            onChange={(e) => {
                              const num = e.target.value === "" ? undefined : parseFloat(e.target.value);
                              upsertActual(monthIso, { [metric.key]: num } as Partial<ActualEntry>);
                            }}
                            className="h-8 text-xs text-right w-24"
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      {a && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeActual(monthIso)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2">Roadmap</h3>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            <li>Import CSV (Square / Stripe / Pennylane / cabinet)</li>
            <li>Auto-pull via Square API ou webhook Stripe (intégrations natives)</li>
            <li>Vue annuelle agrégée + waterfall écart vs forecast</li>
            <li>Notifications email/Slack si écart &gt; X%</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
