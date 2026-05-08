"use client";
import { useState, useTransition } from "react";
import { Dices, Play } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useModelStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import {
  DEFAULT_DRIVERS,
  runMonteCarlo,
  type MCAggregate,
  type MCDistribution,
  type MCDriver,
} from "@/lib/monte-carlo";
import { fmtCurrency, fmtPct } from "@/lib/format";

// Groupes pour affichage UI structuré
const DRIVER_GROUPS: { title: string; ids: string[] }[] = [
  {
    title: "Demande / revenu",
    ids: ["subsGrowth", "rampEnd", "priceIndex", "churn", "mixPremiumShift", "conversionBilan"],
  },
  { title: "Capacité", ids: ["capacityPerClass", "parallelClasses"] },
  { title: "Coûts", ids: ["salaryIndex", "chargesPatro", "marketing", "rent"] },
  { title: "Fiscalité / financement", ids: ["isRate", "vatRate", "loanRate"] },
  { title: "Timing", ids: ["openingDelay"] },
];

export default function MonteCarloPage() {
  const params = useModelStore((s) => s.params);
  const [drivers, setDrivers] = useState<MCDriver[]>(DEFAULT_DRIVERS);
  const [n, setN] = useState(1000);
  const [seed, setSeed] = useState(42);
  const [distribution, setDistribution] = useState<MCDistribution>("uniform");
  const [enableCorrelation, setEnableCorrelation] = useState(true);
  const [maxOpeningDelay, setMaxOpeningDelay] = useState(6);
  const [result, setResult] = useState<MCAggregate | null>(null);
  const [pending, startTransition] = useTransition();
  const [duration, setDuration] = useState<number | null>(null);

  const totalEnabled = drivers.filter((d) => d.enabled).length;

  const runSim = () => {
    setResult(null);
    setDuration(null);
    startTransition(() => {
      const t0 = performance.now();
      const r = runMonteCarlo(params, {
        nSimulations: n,
        drivers,
        seed,
        distribution,
        enableCorrelation,
        maxOpeningDelayMonths: maxOpeningDelay,
      });
      const t1 = performance.now();
      setDuration(t1 - t0);
      setResult(r);
    });
  };

  const updateDriver = (id: string, patch: Partial<MCDriver>) => {
    setDrivers((cur) => cur.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Dices className="h-7 w-7 text-[#D32F2F]" /> Monte Carlo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Simule {n} scénarios avec drivers stochastiques. Distribution P10/P50/P90 + VaR/CVaR + pic besoin financement.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">N simulations</Label>
                <Input
                  type="number"
                  min={100}
                  max={10000}
                  step={100}
                  value={n}
                  onChange={(e) => setN(parseInt(e.target.value || "1000"))}
                />
              </div>
              <div>
                <Label className="text-xs">Seed</Label>
                <Input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value || "42"))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Distribution</Label>
                <Select value={distribution} onValueChange={(v) => setDistribution(v as MCDistribution)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uniform" className="text-xs">Uniforme</SelectItem>
                    <SelectItem value="normal" className="text-xs">Normale tronquée</SelectItem>
                    <SelectItem value="triangular" className="text-xs">Triangulaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Retard max (mois)</Label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={maxOpeningDelay}
                  onChange={(e) => setMaxOpeningDelay(parseInt(e.target.value || "6"))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded border">
              <Switch checked={enableCorrelation} onCheckedChange={setEnableCorrelation} />
              <div className="text-xs">
                <div className="font-medium">Corrélation inflation</div>
                <div className="text-[10px] text-muted-foreground">
                  Lie indexation prix ↔ salaires (ρ ≈ 0.6)
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">
                Drivers stochastiques ({totalEnabled} actifs)
              </Label>
              <div className="space-y-3 mt-2 max-h-[480px] overflow-y-auto pr-1">
                {DRIVER_GROUPS.map((g) => (
                  <div key={g.title}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      {g.title}
                    </div>
                    <div className="space-y-1.5">
                      {g.ids
                        .map((id) => drivers.find((d) => d.id === id))
                        .filter((d): d is MCDriver => d !== undefined)
                        .map((d) => (
                          <div key={d.id} className="flex items-center gap-2 p-1.5 rounded border">
                            <Switch
                              checked={d.enabled}
                              onCheckedChange={(v) => updateDriver(d.id, { enabled: v })}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium truncate">{d.label}</div>
                              <div className="text-[9px] text-muted-foreground">
                                ±{(d.rangePct * 100).toFixed(0)}%
                                {d.category && ` · ${d.category}`}
                              </div>
                            </div>
                            <Input
                              type="number"
                              step={0.05}
                              min={0}
                              max={2}
                              value={d.rangePct}
                              onChange={(e) =>
                                updateDriver(d.id, { rangePct: parseFloat(e.target.value || "0") })
                              }
                              className="h-7 text-xs w-14"
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={runSim} disabled={pending || totalEnabled === 0} className="w-full">
              <Play className="h-4 w-4" />
              {pending ? "Simulation en cours..." : "Lancer la simulation"}
            </Button>
            {duration !== null && (
              <p className="text-[11px] text-muted-foreground text-center">
                {n} simulations en {duration.toFixed(0)}ms ({(n / (duration / 1000)).toFixed(0)}/s)
              </p>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {!result ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                <Dices className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Configure puis clique « Lancer la simulation ».</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">EBITDA par FY — intervalles P10/P50/P90</CardTitle>
                </CardHeader>
                <CardContent>
                  <EbitdaPercentileChart result={result} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KpiCard
                  title="% break-even atteint"
                  value={fmtPct(result.pctBreakEven, 0)}
                  sub={`Médiane: ${result.breakEvenP50 !== null ? `M${result.breakEvenP50}` : "—"}`}
                />
                <KpiCard
                  title="% BE avant FY3"
                  value={fmtPct(result.pctBreakEvenBeforeFy3, 0)}
                  sub="Atteint dans 36 premiers mois"
                />
                <KpiCard
                  title="% tréso négative"
                  value={fmtPct(result.pctCashNegative, 0)}
                  sub={`Sur ${result.count} simulations`}
                  danger={result.pctCashNegative > 0.1}
                />
                <KpiCard
                  title="VaR 5% tréso min"
                  value={fmtCurrency(result.cashTroughVaR5, { compact: true })}
                  sub="Plancher avec 95% confiance"
                  danger={result.cashTroughVaR5 < 0}
                />
                <KpiCard
                  title="CVaR 5% tréso min"
                  value={fmtCurrency(result.cashTroughCVaR5, { compact: true })}
                  sub="Espérance pire 5%"
                  danger={result.cashTroughCVaR5 < 0}
                />
                <KpiCard
                  title="Pic besoin financ. P90"
                  value={fmtCurrency(result.cashPeakNeedP90, { compact: true })}
                  sub={`Médian: ${fmtCurrency(result.cashPeakNeedP50, { compact: true })}`}
                  danger={result.cashPeakNeedP90 > 0}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Marge EBITDA par FY (P10/P50/P90)</CardTitle>
                </CardHeader>
                <CardContent>
                  <MarginPercentileChart result={result} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Distribution EBITDA dernier FY ({result.fyLabels[result.fyLabels.length - 1]})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HistogramChart result={result} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Trésorerie finale</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="P10 (pessimist)" value={result.finalCashP10} />
                      <Stat label="P50 (médian)" value={result.finalCashP50} />
                      <Stat label="P90 (optimist)" value={result.finalCashP90} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">TRI 5 ans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      <StatPct label="P10" value={result.irrP10} />
                      <StatPct label="P50" value={result.irrP50} />
                      <StatPct label="P90" value={result.irrP90} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  danger,
}: {
  title: string;
  value: string;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <Card className={danger ? "border-red-300" : ""}>
      <CardContent className="pt-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className={"text-2xl font-heading font-bold " + (danger ? "text-red-700" : "")}>
          {value}
        </div>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"text-lg font-heading font-bold " + (value < 0 ? "text-red-700" : "")}>
        {fmtCurrency(value, { compact: true })}
      </div>
    </div>
  );
}

function StatPct({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"text-lg font-heading font-bold " + (value !== null && value < 0 ? "text-red-700" : "")}>
        {value !== null ? fmtPct(value, 1) : "—"}
      </div>
    </div>
  );
}

function EbitdaPercentileChart({ result }: { result: MCAggregate }) {
  const data = result.fyLabels.map((label, i) => ({
    label,
    P10: result.yearlyEbitdaP10[i],
    P50: result.yearlyEbitdaP50[i],
    P90: result.yearlyEbitdaP90[i],
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => fmtCurrency(v, { compact: true })} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v) => fmtCurrency(Number(v))}
          contentStyle={{ backgroundColor: "white", borderRadius: 6, border: "1px solid #e5e5e5", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="P10" stroke="#D32F2F" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="P50" stroke="#1a1a1a" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="P90" stroke="#16a34a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MarginPercentileChart({ result }: { result: MCAggregate }) {
  const data = result.fyLabels.map((label, i) => ({
    label,
    P10: result.yearlyEbitdaMarginP10[i],
    P50: result.yearlyEbitdaMarginP50[i],
    P90: result.yearlyEbitdaMarginP90[i],
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => fmtPct(v, 0)} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v) => fmtPct(Number(v), 1)}
          contentStyle={{ backgroundColor: "white", borderRadius: 6, border: "1px solid #e5e5e5", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="P10" stroke="#D32F2F" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="P50" stroke="#1a1a1a" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="P90" stroke="#16a34a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HistogramChart({ result }: { result: MCAggregate }) {
  const data = result.histogram.map((b, i) => ({
    label: fmtCurrency((b.min + b.max) / 2, { compact: true }),
    count: b.count,
    positive: (b.min + b.max) / 2 >= 0,
    idx: i,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} interval={1} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "white", borderRadius: 6, border: "1px solid #e5e5e5", fontSize: 12 }}
          formatter={(v) => [`${v} simulations`, "Nombre"]}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.idx} fill={d.positive ? "#16a34a" : "#D32F2F"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
