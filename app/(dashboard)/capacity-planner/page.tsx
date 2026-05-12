"use client";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Plus,
  Trash2,
  TrendingDown,
  UserCheck,
  UsersRound,
  Wand2,
} from "lucide-react";
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
import { computeModel } from "@/lib/model/compute";
import {
  autoScheduleParallelMatrix,
  avgSessionsByPersona,
  avgSessionsWeighted,
  buildDemandHeatmapFromPersonas,
  compareCdiVsFreelance,
  computeAllocatedHours,
  computeMonthlyCapacityFromMatrix,
  computeMonthlyCapacitySlots,
  computeMonthlyHours,
  computeSaturationHeatmap,
  computeWeeklyHours,
  defaultDemandHeatmap,
  defaultParallelMatrix,
  defaultPersonas,
  DEFAULT_AREAS,
  DEFAULT_PRODUCTIVE_RATIO,
  DEFAULT_SCHEDULE,
  DISCIPLINES,
  effectiveCapacityWithNoShow,
  findBreakEvenHours,
  freelanceCostFromAllocations,
  HEATMAP_DAYS,
  HEATMAP_HOURS,
  hoursToFte,
  HOURS_PER_FTE_THEORETICAL,
  marginalClassEconomics,
  recommendCapacityStrategy,
  type CdiHypothesis,
  type FreelanceHypothesis,
} from "@/lib/capacity-planner";
import { SATURATION_THRESHOLDS } from "@/lib/thresholds";
import type {
  ClassDiscipline,
  CoachAllocation,
  GymArea,
  ModelParams,
  ModelResult,
  Persona,
  WeeklySchedule,
} from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Switch } from "@/components/ui/switch";

function rid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function CapacityPlannerPage() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const result = useMemo(() => computeModel(params), [params]);

  const horizonYears = params.timeline.horizonYears;
  const fyLabels = result.fyLabels;
  const cap = params.capacity;

  const areas = cap?.areas ?? DEFAULT_AREAS;
  const schedule = cap?.weeklySchedule ?? DEFAULT_SCHEDULE;
  const scaleByFy = cap?.scaleByFy ?? new Array(horizonYears).fill(1);
  const allocations = cap?.coachAllocations ?? [];
  const avgSessionsPerMonth = cap?.avgSessionsPerMonth ?? 8;

  const [activeFy, setActiveFy] = useState(0);

  const enable = () => {
    setParams((p) => ({
      ...p,
      capacity: {
        ...(p.capacity ?? {}),
        parallelClasses: p.capacity?.parallelClasses ?? 2,
        capacityPerClass: p.capacity?.capacityPerClass ?? 14,
        capacityPerClassMin: p.capacity?.capacityPerClassMin ?? 12,
        capacityPerClassMax: p.capacity?.capacityPerClassMax ?? 16,
        avgSessionsPerMonth: p.capacity?.avgSessionsPerMonth ?? 8,
        areas: DEFAULT_AREAS,
        weeklySchedule: DEFAULT_SCHEDULE,
        scaleByFy: new Array(p.timeline.horizonYears).fill(1).map((_, i) =>
          // ramping default: 0.5 / 0.7 / 1 / 1.1 / 1.2 / 1.2 / 1.2
          i === 0 ? 0.5 : i === 1 ? 0.7 : i === 2 ? 1 : 1.1 + (i - 3) * 0.05
        ),
        coachAllocations: [],
      },
    }));
  };

  const updateCapacity = (patch: Partial<NonNullable<typeof params.capacity>>) => {
    setParams((p) => ({
      ...p,
      capacity: { ...(p.capacity ?? {} as never), ...patch },
    }));
  };

  // Helpers Areas
  const setAreas = (next: GymArea[]) => updateCapacity({ areas: next });
  const updateArea = (id: string, p: Partial<GymArea>) =>
    setAreas(areas.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const addArea = () =>
    setAreas([
      ...areas,
      { id: rid("area"), name: `Espace ${String.fromCharCode(65 + areas.length)}`, capacity: 12 },
    ]);
  const removeArea = (id: string) => setAreas(areas.filter((a) => a.id !== id));

  // Helpers Schedule
  const updateSchedule = (p: Partial<WeeklySchedule>) =>
    updateCapacity({ weeklySchedule: { ...schedule, ...p } });

  // Helpers Scale
  const updateScale = (fy: number, value: number) => {
    const next = [...scaleByFy];
    next[fy] = value;
    while (next.length < horizonYears) next.push(1);
    updateCapacity({ scaleByFy: next });
  };

  // Helpers Allocations
  const setAllocs = (next: CoachAllocation[]) => updateCapacity({ coachAllocations: next });
  const addAllocation = (kind: "cadre" | "freelance", coachId: string, fy: number) => {
    setAllocs([
      ...allocations,
      { id: rid("alloc"), fy, coachKind: kind, coachId, hoursPerMonth: 0 },
    ]);
  };
  const updateAllocation = (id: string, p: Partial<CoachAllocation>) =>
    setAllocs(allocations.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const removeAllocation = (id: string) => setAllocs(allocations.filter((a) => a.id !== id));

  // Auto-fill: créer une allocation de 0h pour chaque cadre coach + freelance pool sur le FY actif
  const autoSetupForFy = () => {
    const cadreCoaches = params.salaries.items.filter((it) => /coach|head/i.test(it.role));
    const pools = params.salaries.freelancePools ?? [];
    const newAllocs: CoachAllocation[] = [];
    for (const c of cadreCoaches) {
      if (!allocations.some((a) => a.fy === activeFy && a.coachId === c.id && a.coachKind === "cadre")) {
        newAllocs.push({
          id: rid("alloc"),
          fy: activeFy,
          coachKind: "cadre",
          coachId: c.id,
          hoursPerMonth: 130,
        });
      }
    }
    for (const p of pools) {
      if (!allocations.some((a) => a.fy === activeFy && a.coachId === p.id && a.coachKind === "freelance")) {
        newAllocs.push({
          id: rid("alloc"),
          fy: activeFy,
          coachKind: "freelance",
          coachId: p.id,
          hoursPerMonth: 0,
        });
      }
    }
    if (newAllocs.length > 0) setAllocs([...allocations, ...newAllocs]);
  };

  // Synchronisation: ajuste le `monthlyHours` des freelance pools selon le gap demand - cadres
  const syncFreelancePools = () => {
    setParams((p) => {
      const pools = p.salaries.freelancePools ?? [];
      const next = pools.map((pool) => {
        // Pour ce pool, somme des heures alloc sur tous les FY divisé par horizonYears (moyenne)
        const sumHours = (p.capacity?.coachAllocations ?? [])
          .filter((a) => a.coachKind === "freelance" && a.coachId === pool.id)
          .reduce((s, a) => s + a.hoursPerMonth, 0);
        const avgHours = sumHours / Math.max(1, horizonYears);
        return { ...pool, monthlyHours: Math.round(avgHours), hoursPerWeekday: undefined, hoursPerWeekendDay: undefined };
      });
      return { ...p, salaries: { ...p.salaries, freelancePools: next } };
    });
  };

  if (!cap?.areas) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-7 w-7 text-[#D32F2F]" /> Capacity planner
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Planificateur visuel : espaces × planning hebdo × allocation coachs.
          </p>
        </header>
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-sm">Le planificateur détaillé n&apos;est pas encore initialisé pour ce scénario.</p>
            <Button onClick={enable}>
              <Wand2 className="h-4 w-4" /> Activer avec les défauts (2 espaces 14/12, planning 5×WD + 3×WE)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculs par FY
  const perFy = fyLabels.map((label, fy) => {
    const scale = scaleByFy[fy] ?? 1;
    const weeklyHours = computeWeeklyHours(areas, schedule, scale);
    const monthlyHours = computeMonthlyHours(areas, schedule, scale);
    const monthlySlots = computeMonthlyCapacitySlots(areas, schedule, scale);
    const alloc = computeAllocatedHours(allocations, fy);
    const gapHours = monthlyHours - alloc.total;
    const flCost = freelanceCostFromAllocations(params, allocations, fy);
    // Demande membres (depuis result mensuel)
    const monthsOfFy = result.monthly.filter((m) => m.fy === fy);
    const avgMembers = monthsOfFy.length > 0
      ? monthsOfFy.reduce((s, m) => s + m.subsCount + m.legacyCount, 0) / monthsOfFy.length
      : 0;
    const demandedSlots = avgMembers * avgSessionsPerMonth;
    const saturation = monthlySlots > 0 ? demandedSlots / monthlySlots : 0;
    return {
      fy,
      label,
      scale,
      weeklyHours,
      monthlyHours,
      monthlySlots,
      cadreHours: alloc.cadre,
      freelanceHours: alloc.freelance,
      totalAllocHours: alloc.total,
      gapHours,
      avgMembers: Math.round(avgMembers),
      demandedSlots: Math.round(demandedSlots),
      saturation,
      freelanceCost: flCost,
    };
  });

  const cadreCoaches = params.salaries.items.filter((it) => /coach|head/i.test(it.role));
  const pools = params.salaries.freelancePools ?? [];
  const allocsThisFy = allocations.filter((a) => a.fy === activeFy);
  const fyData = perFy[activeFy];

  // Données graphiques
  const chartData = perFy.map((d) => ({
    label: d.label,
    "Heures demandées": Math.round(d.monthlyHours),
    "Heures cadres": Math.round(d.cadreHours),
    "Heures freelance": Math.round(d.freelanceHours),
  }));
  const satData = perFy.map((d) => ({
    label: d.label,
    "Saturation %": Math.round(d.saturation * 100),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-7 w-7 text-[#D32F2F]" /> Capacity planner
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Planificateur visuel : 2+ espaces × planning hebdo × allocation coachs cadres et freelance,
            avec scaling FY pour suivre la montée en charge.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      {/* Section 1: Espaces */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Espaces d&apos;entraînement</CardTitle>
          <p className="text-xs text-muted-foreground">
            Chaque espace a sa capacité propre. La capacité totale du planning = Σ (espace × cours dans cet espace).
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {areas.map((a) => (
            <div key={a.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-2 items-end p-2 border rounded">
              <div>
                <Label className="text-xs">Nom</Label>
                <Input value={a.name} onChange={(e) => updateArea(a.id, { name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Capacité (places/cours)</Label>
                <Input
                  type="number"
                  value={a.capacity}
                  onChange={(e) => updateArea(a.id, { capacity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeArea(a.id)}
                disabled={areas.length <= 1}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addArea}>
            <Plus className="h-3.5 w-3.5" /> Ajouter un espace
          </Button>
        </CardContent>
      </Card>

      {/* Section 2: Planning hebdomadaire */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Planning hebdomadaire (par espace)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Nombre de cours par jour, par espace. Le planning de base est multiplié par le scaling FY pour
            modéliser la montée en charge.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Cours / jour ouvré (par espace)</Label>
              <Input
                type="number"
                value={schedule.weekdayClassesPerArea}
                onChange={(e) =>
                  updateSchedule({ weekdayClassesPerArea: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Ex: 5 cours/jour × 5 jours × {areas.length} espaces = {5 * schedule.weekdayClassesPerArea * areas.length} cours/sem.
              </p>
            </div>
            <div>
              <Label className="text-xs">Cours / jour weekend (par espace)</Label>
              <Input
                type="number"
                value={schedule.weekendClassesPerArea}
                onChange={(e) =>
                  updateSchedule({ weekendClassesPerArea: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Ex: 3 cours/jour × 2 jours × {areas.length} espaces = {2 * schedule.weekendClassesPerArea * areas.length} cours/sem.
              </p>
            </div>
            <div>
              <Label className="text-xs">Durée d&apos;un cours (heures)</Label>
              <Input
                type="number"
                step={0.25}
                value={schedule.hoursPerClass}
                onChange={(e) =>
                  updateSchedule({ hoursPerClass: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">CrossFit standard: 1h.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Cours / sem (full ramp)" value={Math.round(computeWeeklyHours(areas, schedule, 1) / schedule.hoursPerClass)} />
            <Stat label="Heures coach / sem" value={Math.round(computeWeeklyHours(areas, schedule, 1))} suffix="h" />
            <Stat label="Heures coach / mois" value={Math.round(computeMonthlyHours(areas, schedule, 1))} suffix="h" />
            <Stat label="Slots places / mois" value={Math.round(computeMonthlyCapacitySlots(areas, schedule, 1))} />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Évolution par FY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Scaling par FY</CardTitle>
          <p className="text-xs text-muted-foreground">
            Multiplicateur appliqué au planning de base, par année. Permet de modéliser le ramp-up
            (peu de cours en M0, plein en année 3, etc.).
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            {fyLabels.map((label, fy) => {
              // Calcul recos auto-saturation 70% / 80% pour ce FY
              const memEnd = result.monthly[fy * 12 + 11]?.subsCount ?? 0;
              const baseCap = computeMonthlyCapacitySlots(areas, schedule, 1);
              const demand = memEnd * avgSessionsPerMonth;
              const reco70 = baseCap > 0 ? demand / (0.70 * baseCap) : 0;
              const reco80 = baseCap > 0 ? demand / (0.80 * baseCap) : 0;
              const reco = scaleByFy[fy] ?? 1;
              const sat = baseCap > 0 ? demand / (baseCap * reco) : 0;
              return (
                <div key={fy} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    step={0.05}
                    value={reco}
                    onChange={(e) => updateScale(fy, parseFloat(e.target.value) || 0)}
                  />
                  <div className="text-[9px] text-muted-foreground leading-tight space-y-0.5">
                    <div>
                      Sat actuelle:{" "}
                      <span
                        className={
                          sat > 1
                            ? "text-red-600 font-semibold"
                            : sat >= 0.7
                              ? "text-emerald-600 font-semibold"
                              : ""
                        }
                      >
                        {(sat * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="text-emerald-700 hover:underline tabular-nums"
                        onClick={() => updateScale(fy, Math.round(reco70 * 100) / 100)}
                        title="Auto-set scale pour 70% sat"
                      >
                        70%: {reco70.toFixed(2)}
                      </button>
                      <span className="text-muted-foreground/50">·</span>
                      <button
                        type="button"
                        className="text-amber-700 hover:underline tabular-nums"
                        onClick={() => updateScale(fy, Math.round(reco80 * 100) / 100)}
                        title="Auto-set scale pour 80% sat"
                      >
                        80%: {reco80.toFixed(2)}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            <strong>Sat actuelle</strong> = membres × 8 sessions / capacité base × scale.
            Cliquer sur <code className="text-emerald-700">70%</code> ou{" "}
            <code className="text-amber-700">80%</code> pour appliquer le scale recommandé.
          </p>
        </CardContent>
      </Card>

      {/* Bundle 1 — Heatmap saturation projetée + manuelle */}
      <SaturationHeatmapSection
        params={params}
        result={result}
        scale={scaleByFy[activeFy] ?? 1}
        areas={areas}
        schedule={schedule}
        avgSessionsPerMonth={avgSessionsPerMonth}
        activeFy={activeFy}
        setActiveFy={setActiveFy}
        fyLabels={fyLabels}
        onApplyScale={(fy, v) => updateScale(fy, v)}
        onUpdateHeatmap={(matrix) => updateCapacity({ demandHeatmap: matrix })}
        onUpdateTarget={(t) => updateCapacity({ targetSaturationPct: t })}
        onUpdateParallelMatrix={(matrix) => updateCapacity({ parallelByCellMatrix: matrix })}
      />

      <SessionsByTenureSection params={params} updateCapacity={updateCapacity} />

      <PersonasSection params={params} updateCapacity={updateCapacity} />

      <DisciplinesSection params={params} updateCapacity={updateCapacity} />

      <MarginalEconomicsSection params={params} updateCapacity={updateCapacity} result={result} />


      {/* KPIs par FY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demande &amp; capacité par FY</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-2">FY</th>
                  <th className="text-right p-2">Scale</th>
                  <th className="text-right p-2">Heures coach/mois</th>
                  <th className="text-right p-2">Slots places/mois</th>
                  <th className="text-right p-2">Membres avg</th>
                  <th className="text-right p-2">Demande slots</th>
                  <th className="text-right p-2">Saturation</th>
                  <th className="text-right p-2">Heures cadres alloc</th>
                  <th className="text-right p-2">Heures freelance alloc</th>
                  <th className="text-right p-2">Gap</th>
                  <th className="text-right p-2">Coût freelance/mois</th>
                </tr>
              </thead>
              <tbody>
                {perFy.map((d) => (
                  <tr
                    key={d.fy}
                    className={
                      "border-t " +
                      (d.fy === activeFy ? "bg-[#D32F2F]/5" : "") +
                      (d.gapHours > 0 ? " " : "")
                    }
                  >
                    <td className="p-2 font-mono">
                      <button
                        onClick={() => setActiveFy(d.fy)}
                        className={
                          "underline-offset-2 " +
                          (d.fy === activeFy
                            ? "font-bold text-[#D32F2F]"
                            : "hover:underline")
                        }
                      >
                        {d.label}
                      </button>
                    </td>
                    <td className="p-2 text-right">{d.scale.toFixed(2)}×</td>
                    <td className="p-2 text-right font-mono">{Math.round(d.monthlyHours)}h</td>
                    <td className="p-2 text-right font-mono">{Math.round(d.monthlySlots)}</td>
                    <td className="p-2 text-right">{d.avgMembers}</td>
                    <td className="p-2 text-right">{d.demandedSlots}</td>
                    <td
                      className={
                        "p-2 text-right font-semibold " +
                        (d.saturation > 1
                          ? "text-red-700"
                          : d.saturation > 0.85
                            ? "text-amber-700"
                            : "text-emerald-700")
                      }
                    >
                      {Math.round(d.saturation * 100)}%
                    </td>
                    <td className="p-2 text-right">{Math.round(d.cadreHours)}h</td>
                    <td className="p-2 text-right">{Math.round(d.freelanceHours)}h</td>
                    <td
                      className={
                        "p-2 text-right font-semibold " +
                        (Math.abs(d.gapHours) < 1
                          ? "text-emerald-700"
                          : "text-amber-700")
                      }
                    >
                      {Math.round(d.gapHours)}h
                    </td>
                    <td className="p-2 text-right font-mono">
                      {Math.round(d.freelanceCost).toLocaleString("fr-FR")}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Heures coach par FY</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Heures cadres" fill="#1a1a1a" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Heures freelance" fill="#D32F2F" stackId="a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Heures demandées" fill="transparent" stroke="#16a34a" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saturation par FY</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={satData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="Saturation %" stroke="#D32F2F" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Allocation par FY */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">
              4. Allocation coachs — {fyData?.label}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Répartis les heures demandées ({Math.round(fyData?.monthlyHours ?? 0)}h/mois) entre cadres
              salariés et pools freelance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={activeFy}
              onChange={(e) => setActiveFy(parseInt(e.target.value))}
              className="h-9 rounded border bg-transparent px-2 text-sm"
            >
              {fyLabels.map((l, i) => (
                <option key={i} value={i}>
                  {l}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={autoSetupForFy}>
              <Wand2 className="h-3.5 w-3.5" /> Pré-remplir ({fyData?.label})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {allocsThisFy.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              Aucune allocation pour {fyData?.label}. Clique &laquo;&nbsp;Pré-remplir&nbsp;&raquo; pour
              démarrer (cadres coachs détectés + pools freelance avec 0h).
            </p>
          )}
          {allocsThisFy.map((alloc) => {
            const cadre =
              alloc.coachKind === "cadre"
                ? params.salaries.items.find((it) => it.id === alloc.coachId)
                : null;
            const pool =
              alloc.coachKind === "freelance"
                ? pools.find((pl) => pl.id === alloc.coachId)
                : null;
            const name = cadre?.role ?? pool?.name ?? alloc.coachId;
            const hourly =
              alloc.coachKind === "freelance" && pool
                ? pool.hourlyRate
                : alloc.coachKind === "cadre" && cadre
                  ? cadre.monthlyGross / 130 // estim taux horaire cadre
                  : 0;
            const cost = alloc.coachKind === "freelance" ? hourly * alloc.hoursPerMonth : 0;
            // Nombre de coachs disponibles dans ce poste cadre (= fte arrondi). Pour freelance, 1.
            const maxCount = alloc.coachKind === "cadre" ? Math.max(1, Math.round(cadre?.fte ?? 1)) : 1;
            const coachCount = alloc.coachCount ?? maxCount;
            // Heures disponibles/mois pour CE poste à CE FY = teachingHoursPerWeek × 4.3 × coachCount
            const teachingHoursPerWeek = cadre?.teachingHoursPerWeek ?? 0;
            const availableHoursPerMonth =
              alloc.coachKind === "cadre"
                ? teachingHoursPerWeek * 4.3 * coachCount
                : pool?.monthlyHours ?? 0;
            return (
              <div
                key={alloc.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded"
              >
                <div>
                  <Label className="text-xs">{alloc.coachKind === "cadre" ? "Cadre" : "Freelance pool"}</Label>
                  <div className="text-sm font-medium">{name}</div>
                </div>
                <div>
                  <Label className="text-xs">Nb coachs</Label>
                  {alloc.coachKind === "cadre" && maxCount > 1 ? (
                    <select
                      className="h-9 w-full rounded border bg-transparent px-2 text-xs"
                      value={coachCount}
                      onChange={(e) =>
                        updateAllocation(alloc.id, {
                          coachCount: parseInt(e.target.value) || 1,
                        })
                      }
                    >
                      {Array.from({ length: maxCount }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} / {maxCount}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="h-9 px-3 flex items-center rounded border bg-muted/40 font-mono text-xs">
                      {coachCount}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs">H dispo / mois</Label>
                  <div className="h-9 px-3 flex items-center rounded border bg-muted/40 font-mono text-xs">
                    {availableHoursPerMonth > 0 ? `${availableHoursPerMonth.toFixed(0)}h` : "—"}
                  </div>
                  {alloc.coachKind === "cadre" && teachingHoursPerWeek === 0 ? (
                    <p className="text-[9px] text-amber-600 mt-0.5">
                      Saisir h/sem dans /salaries
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className="text-xs">Heures/mois</Label>
                  <Input
                    type="number"
                    value={alloc.hoursPerMonth}
                    onChange={(e) =>
                      updateAllocation(alloc.id, {
                        hoursPerMonth: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={
                      availableHoursPerMonth > 0 && alloc.hoursPerMonth > availableHoursPerMonth
                        ? "border-red-400"
                        : ""
                    }
                    title={
                      availableHoursPerMonth > 0 && alloc.hoursPerMonth > availableHoursPerMonth
                        ? `Dépasse la dispo (${availableHoursPerMonth.toFixed(0)}h)`
                        : undefined
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Tarif horaire</Label>
                  <div className="h-9 px-3 flex items-center rounded border bg-muted/40 font-mono text-xs">
                    {hourly.toFixed(0)}€/h
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Coût mensuel</Label>
                  <div className="h-9 px-3 flex items-center rounded border bg-muted/40 font-mono text-xs">
                    {alloc.coachKind === "freelance"
                      ? `${Math.round(cost).toLocaleString("fr-FR")}€`
                      : "fixe (salaire)"}
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => removeAllocation(alloc.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}

          <div className="border-t pt-3 mt-3 flex flex-wrap gap-2">
            <select
              id="add-alloc-coach"
              className="h-9 rounded border bg-transparent px-2 text-sm flex-1 min-w-[200px]"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const [kind, id] = v.split(":");
                addAllocation(kind as "cadre" | "freelance", id, activeFy);
                e.target.value = "";
              }}
            >
              <option value="">+ Ajouter une allocation...</option>
              {params.salaries.items
                .filter((it) => !allocsThisFy.some((a) => a.coachKind === "cadre" && a.coachId === it.id))
                .map((it) => (
                  <option key={`c-${it.id}`} value={`cadre:${it.id}`}>
                    Cadre — {it.role}
                  </option>
                ))}
              {pools
                .filter((p) => !allocsThisFy.some((a) => a.coachKind === "freelance" && a.coachId === p.id))
                .map((p) => (
                  <option key={`f-${p.id}`} value={`freelance:${p.id}`}>
                    Freelance — {p.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Synthèse */}
          {fyData && (
            <div className="mt-3 p-3 rounded border bg-muted/20 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Demande
                  </div>
                  <div className="font-mono font-semibold">{Math.round(fyData.monthlyHours)}h/mois</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Allocation actuelle
                  </div>
                  <div className="font-mono font-semibold">
                    {Math.round(fyData.totalAllocHours)}h/mois (cadres {Math.round(fyData.cadreHours)}h + freelance {Math.round(fyData.freelanceHours)}h)
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Gap (à embaucher)
                  </div>
                  <div
                    className={
                      "font-mono font-semibold " +
                      (Math.abs(fyData.gapHours) < 1
                        ? "text-emerald-700"
                        : fyData.gapHours > 0
                          ? "text-amber-700"
                          : "text-blue-700")
                    }
                  >
                    {Math.round(fyData.gapHours)}h/mois
                    {fyData.gapHours > 0 && " (sous-doté)"}
                    {fyData.gapHours < -1 && " (sur-doté)"}
                    {Math.abs(fyData.gapHours) < 1 && " ✓ équilibre"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section ETP & Comparaison CDI vs Freelance */}
      <FteComparisonSection
        perFy={perFy}
        fyLabels={fyLabels}
      />

      {/* Sync */}
      <Card className="border-blue-300 bg-blue-50/30">
        <CardContent className="pt-5 flex flex-wrap items-start gap-3">
          <UsersRound className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-sm">Synchroniser avec les pools freelance</div>
            <p className="text-xs text-muted-foreground mt-1">
              Reporte la moyenne des heures freelance allouées dans le champ <span className="font-mono">monthlyHours</span> de chaque pool
              freelance. Cela impacte directement la masse salariale dans le P&amp;L.
            </p>
            <Button onClick={syncFreelancePools} variant="outline" size="sm" className="mt-2">
              <Wand2 className="h-3.5 w-3.5" /> Synchroniser pools freelance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Health badge */}
      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            {perFy.some((d) => d.gapHours > 1) ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Sous-allocation détectée
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Allocation cohérente
              </>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            Pour valider le BP côté masse salariale, équilibrer cadres + freelance sur chaque FY pour couvrir
            la demande. Le bouton ci-dessus aligne automatiquement les pools freelance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded border p-2 bg-card">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-heading font-bold text-lg">
        {value.toLocaleString("fr-FR")}
        {suffix && <span className="text-sm font-normal ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

type PerFy = {
  fy: number;
  label: string;
  monthlyHours: number;
  cadreHours: number;
  freelanceHours: number;
};

function FteComparisonSection({
  perFy,
  fyLabels,
}: {
  perFy: PerFy[];
  fyLabels: string[];
}) {
  const [cdi, setCdi] = useState<CdiHypothesis>({
    monthlyGross: 3000,
    chargesPatroPct: 0.42,
    thirteenthMonth: false,
    benefitsMonthly: 100,
    productiveRatio: DEFAULT_PRODUCTIVE_RATIO,
  });
  const [freelance, setFreelance] = useState<FreelanceHypothesis>({
    hourlyRate: 40,
  });

  // Calculs par FY
  const fteData = useMemo(() => {
    return perFy.map((d) => {
      const cmp = compareCdiVsFreelance(d.monthlyHours, cdi, freelance);
      const fteNeeded = hoursToFte(d.monthlyHours, cdi.productiveRatio);
      return {
        ...d,
        fteNeeded,
        cmp,
      };
    });
  }, [perFy, cdi, freelance]);

  const breakEven = useMemo(() => findBreakEvenHours(cdi, freelance, 600, 5), [cdi, freelance]);

  // Données pour chart break-even (courbes CDI vs Freelance)
  const breakEvenChart = useMemo(() => {
    const out: { hours: number; CDI: number; Freelance: number }[] = [];
    const productivePerFte = HOURS_PER_FTE_THEORETICAL * cdi.productiveRatio;
    const cdiCostPerFte =
      (cdi.thirteenthMonth ? cdi.monthlyGross * 13 / 12 : cdi.monthlyGross) *
        (1 + cdi.chargesPatroPct) +
      cdi.benefitsMonthly;
    for (let h = 20; h <= 400; h += 20) {
      const cdiCost = Math.ceil(h / productivePerFte) * cdiCostPerFte;
      const freelanceCost = h * freelance.hourlyRate;
      out.push({ hours: h, CDI: Math.round(cdiCost), Freelance: Math.round(freelanceCost) });
    }
    return out;
  }, [cdi, freelance]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-[#D32F2F]" />
          5. Besoin ETP &amp; comparaison CDI vs Freelance
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Traduit les heures de cours en équivalents temps plein et compare le coût mensuel d&apos;un
          modèle 100% CDI vs 100% Freelance pour le volume horaire de chaque FY.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hypothèses */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded bg-muted/20">
          <div>
            <Label className="text-xs">Brut mensuel CDI (€)</Label>
            <Input
              type="number"
              value={cdi.monthlyGross}
              onChange={(e) => setCdi({ ...cdi, monthlyGross: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Coach CrossFit France: 2500-3500€ brut typique.
            </p>
          </div>
          <div>
            <Label className="text-xs">Charges patronales (%)</Label>
            <Input
              type="number"
              step={0.01}
              value={cdi.chargesPatroPct}
              onChange={(e) => setCdi({ ...cdi, chargesPatroPct: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Cadre: ~42%, non-cadre: ~40%.</p>
          </div>
          <div>
            <Label className="text-xs">Avantages mensuels (€)</Label>
            <Input
              type="number"
              value={cdi.benefitsMonthly}
              onChange={(e) => setCdi({ ...cdi, benefitsMonthly: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Mutuelle + tickets resto + transport.
            </p>
          </div>
          <div>
            <Label className="text-xs">Tarif freelance (€/h)</Label>
            <Input
              type="number"
              value={freelance.hourlyRate}
              onChange={(e) => setFreelance({ hourlyRate: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Coach freelance Paris: 35-50€/h.</p>
          </div>
          <div>
            <Label className="text-xs">Ratio productif</Label>
            <Input
              type="number"
              step={0.05}
              min={0.5}
              max={1}
              value={cdi.productiveRatio}
              onChange={(e) =>
                setCdi({ ...cdi, productiveRatio: parseFloat(e.target.value) || 0.9 })
              }
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              0.90 = 137h productives/mois (CP + maladie + formation déduits).
            </p>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="th-13"
              checked={cdi.thirteenthMonth}
              onChange={(e) => setCdi({ ...cdi, thirteenthMonth: e.target.checked })}
            />
            <Label htmlFor="th-13" className="text-xs cursor-pointer">
              13e mois
            </Label>
          </div>
        </div>

        {/* Recommandation */}
        <div
          className={
            "rounded border p-3 " +
            (breakEven === null
              ? "bg-emerald-50/40 border-emerald-300"
              : "bg-amber-50/40 border-amber-300")
          }
        >
          <div className="flex items-start gap-2">
            <TrendingDown className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold">
                Point de bascule CDI &lt; Freelance: {breakEven === null ? "jamais" : `~${breakEven}h/mois`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {breakEven === null
                  ? `Avec ces hypothèses, le freelance reste toujours moins cher (le tarif freelance × 1 ETP > coût CDI). Tu peux te poser la question d'embaucher uniquement si tu veux fidéliser le coach.`
                  : `À partir de ${breakEven}h/mois, le coût CDI passe sous le coût freelance équivalent. En-dessous, freelance reste plus économique. (1 ETP = ${(HOURS_PER_FTE_THEORETICAL * cdi.productiveRatio).toFixed(0)}h productives/mois.)`}
              </p>
            </div>
          </div>
        </div>

        {/* Tableau par FY */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-2">FY</th>
                <th className="text-right p-2">Heures/mois</th>
                <th className="text-right p-2">ETP requis</th>
                <th className="text-right p-2">CDI (Nb × coût)</th>
                <th className="text-right p-2">Coût CDI/mois</th>
                <th className="text-right p-2">Coût Freelance/mois</th>
                <th className="text-right p-2">Δ (CDI - FL)</th>
                <th className="text-left p-2">Reco</th>
              </tr>
            </thead>
            <tbody>
              {fteData.map((d) => (
                <tr key={d.fy} className="border-t">
                  <td className="p-2 font-mono">{d.label}</td>
                  <td className="p-2 text-right font-mono">{Math.round(d.monthlyHours)}h</td>
                  <td className="p-2 text-right font-mono">
                    {d.fteNeeded.toFixed(2)} ETP
                  </td>
                  <td className="p-2 text-right text-muted-foreground">
                    {d.cmp.cdiFteCount} × {Math.round(d.cmp.cdiCost / Math.max(1, d.cmp.cdiFteCount)).toLocaleString("fr-FR")}€
                  </td>
                  <td className="p-2 text-right font-mono">
                    {Math.round(d.cmp.cdiCost).toLocaleString("fr-FR")}€
                  </td>
                  <td className="p-2 text-right font-mono">
                    {Math.round(d.cmp.freelanceCost).toLocaleString("fr-FR")}€
                  </td>
                  <td
                    className={
                      "p-2 text-right font-mono font-semibold " +
                      (d.cmp.delta < 0 ? "text-emerald-700" : d.cmp.delta > 0 ? "text-red-700" : "")
                    }
                  >
                    {d.cmp.delta >= 0 ? "+" : ""}
                    {Math.round(d.cmp.delta).toLocaleString("fr-FR")}€
                  </td>
                  <td className="p-2">
                    {d.cmp.recommendation === "cdi" ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ✓ CDI
                      </span>
                    ) : d.cmp.recommendation === "freelance" ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        ✓ Freelance
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">
                        Égalité
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          Coût CDI calculé en arrondissant au nombre d&apos;ETP entiers nécessaires (taille minimale
          d&apos;équipe). Inclut charges patronales + avantages. La sous-utilisation des CDI fait
          monter le coût horaire effectif si la demande est faible.
        </p>

        {/* Chart break-even */}
        <div>
          <div className="text-xs font-semibold mb-2">
            Coût mensuel par H heures/mois — courbe de bascule
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={breakEvenChart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis
                dataKey="hours"
                tick={{ fontSize: 11 }}
                label={{ value: "Heures/mois", position: "insideBottom", offset: -2, fontSize: 10 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
              />
              <Tooltip
                formatter={(v) => `${Number(v).toLocaleString("fr-FR")}€`}
                labelFormatter={(l) => `${l}h/mois`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="stepAfter"
                dataKey="CDI"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                name="CDI (par paliers d'ETP)"
              />
              <Line
                type="monotone"
                dataKey="Freelance"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Freelance (linéaire)"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground mt-1">
            Ligne verte (CDI) = paliers car on doit embaucher 1, 2, 3 ETP entiers. Bleue (Freelance) = linéaire.
            La différence est l&apos;économie potentielle au volume actuel.
          </p>
        </div>

        {/* Note méthodo */}
        <div className="rounded border p-3 bg-muted/20 text-[11px] text-muted-foreground">
          <div className="font-semibold text-foreground mb-1">Au-delà du coût brut</div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <b>CDI</b> : engagement long terme, fidélité, qualité constante, mais rigidité (rupture
              conventionnelle, congés à couvrir, cotisation prévoyance).
            </li>
            <li>
              <b>Freelance</b> : flexibilité totale, ajuste vite à la demande, mais tu perds l&apos;exclusivité
              et la disponibilité (le coach peut être pris ailleurs).
            </li>
            <li>
              <b>Mix optimal recommandé</b> : 1 ETP CDI sur la baseline (cours fixes hebdo) +
              freelance pour pics + remplacement.
            </li>
            <li>
              Ce calcul ne tient pas compte du <b>CIR / crédit apprentissage</b> (10-30%) ni des aides
              à l&apos;embauche.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Bundle 1 — Section Heatmap saturation projetée + heatmap manuelle
// ============================================================================

function SaturationHeatmapSection({
  params,
  result,
  scale,
  areas,
  schedule,
  avgSessionsPerMonth,
  activeFy,
  setActiveFy,
  fyLabels,
  onApplyScale,
  onUpdateHeatmap,
  onUpdateTarget,
  onUpdateParallelMatrix,
}: {
  params: ModelParams;
  result: ModelResult;
  scale: number;
  areas: GymArea[];
  schedule: WeeklySchedule;
  avgSessionsPerMonth: number;
  activeFy: number;
  setActiveFy: (fy: number) => void;
  fyLabels: string[];
  onApplyScale: (fy: number, v: number) => void;
  onUpdateHeatmap: (matrix: number[][]) => void;
  onUpdateTarget: (t: number) => void;
  onUpdateParallelMatrix: (matrix: number[][]) => void;
}) {
  const cap = params.capacity;
  const matrix = cap?.demandHeatmap ?? defaultDemandHeatmap();
  const parallelMatrix = cap?.parallelByCellMatrix;
  const targetSat = cap?.targetSaturationPct ?? SATURATION_THRESHOLDS.defaultTarget;
  const isDefault = !cap?.demandHeatmap;
  const isParallelDefault = !cap?.parallelByCellMatrix;

  const memEnd = result.monthly[activeFy * 12 + 11]?.subsCount ?? 0;
  const heat = useMemo(
    () => computeSaturationHeatmap(memEnd, avgSessionsPerMonth, matrix, areas, scale, parallelMatrix),
    [memEnd, avgSessionsPerMonth, matrix, areas, scale, parallelMatrix]
  );
  const reco = useMemo(() => recommendCapacityStrategy(heat, targetSat), [heat, targetSat]);

  // Couleur par saturation
  const cellClass = (sat: number, weight: number): string => {
    if (weight === 0) return "bg-slate-50 text-slate-300";
    if (sat > 1.2) return "bg-red-600 text-white";
    if (sat > 1) return "bg-red-400 text-white";
    if (sat > 0.85) return "bg-amber-400 text-amber-900";
    if (sat > 0.6) return "bg-emerald-400 text-emerald-900";
    if (sat > 0.3) return "bg-emerald-200 text-emerald-800";
    return "bg-emerald-50 text-emerald-700";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[#D32F2F]" />
          Heatmap saturation projetée — {fyLabels[activeFy]}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Saturation par créneau (jour × heure) au FY sélectionné. Vert = optimal, ambre = tension,
          rouge = surcharge. Demande répartie selon la heatmap (poids relatifs).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sélecteur FY + cible saturation */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">FY analysé</Label>
            <div className="flex gap-1 mt-1">
              {fyLabels.map((label, fy) => (
                <Button
                  key={fy}
                  variant={fy === activeFy ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setActiveFy(fy)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Cible saturation (%)</Label>
            <Input
              type="number"
              step="5"
              min="40"
              max="100"
              value={(targetSat * 100).toFixed(0)}
              onChange={(e) => onUpdateTarget((parseFloat(e.target.value) || 75) / 100)}
              className="h-7 w-24 text-xs"
            />
          </div>
        </div>

        {/* Reco engine card */}
        <div
          className={
            "p-3 rounded border-l-4 " +
            (reco.type === "ok"
              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
              : reco.type === "overflow"
                ? "border-red-600 bg-red-50 dark:bg-red-950/20"
                : "border-amber-600 bg-amber-50 dark:bg-amber-950/20")
          }
        >
          <div className="flex items-start gap-2">
            {reco.type === "ok" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 space-y-2">
              <p className="text-xs">{reco.message}</p>
              {reco.type !== "ok" ? (
                <div className="flex flex-wrap gap-2">
                  {reco.suggestedScaleGlobal ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px]"
                      onClick={() =>
                        onApplyScale(activeFy, Math.round(reco.suggestedScaleGlobal! * 100) / 100)
                      }
                    >
                      Appliquer scale global {reco.suggestedScaleGlobal.toFixed(2)}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {reco.hotCells.length > 0 ? (
                <div className="text-[10px] text-muted-foreground">
                  Top créneaux en tension :{" "}
                  {reco.hotCells.slice(0, 5).map((c, i) => (
                    <span key={i} className="font-mono">
                      {HEATMAP_DAYS[c.dow]} {c.hour}h ({(c.saturation * 100).toFixed(0)}%)
                      {i < Math.min(4, reco.hotCells.length - 1) ? ", " : ""}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat
            label="Demande totale/mo"
            value={Math.round(heat.totalDemand)}
            suffix=" places"
          />
          <Stat
            label="Capacité totale/mo"
            value={Math.round(heat.totalCapacity)}
            suffix=" places"
          />
          <Stat
            label="Saturation moyenne"
            value={Math.round(heat.avgSaturation * 100)}
            suffix="%"
          />
          <Stat
            label="Saturation pic"
            value={Math.round(heat.maxSaturation * 100)}
            suffix="%"
          />
        </div>

        {/* Heatmap grid */}
        <div className="border rounded-md p-3 bg-muted/10 overflow-x-auto">
          <div className="min-w-[600px]">
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `40px repeat(${HEATMAP_HOURS.length}, 1fr)`,
              }}
            >
              <div></div>
              {HEATMAP_HOURS.map((h) => (
                <div key={h} className="text-[10px] text-slate-400 text-center tabular-nums">
                  {h}h
                </div>
              ))}
            </div>
            {HEATMAP_DAYS.map((label, dow) => (
              <div
                key={dow}
                className="grid gap-1 mt-1"
                style={{
                  gridTemplateColumns: `40px repeat(${HEATMAP_HOURS.length}, 1fr)`,
                }}
              >
                <div className="text-xs text-slate-600 font-medium flex items-center">
                  {label}
                </div>
                {HEATMAP_HOURS.map((h, i) => {
                  const cell = heat.cells.find((c) => c.dow === dow && c.hour === h)!;
                  const cls = cellClass(cell.saturation, cell.weight);
                  return (
                    <div
                      key={`${dow}-${h}`}
                      className={`aspect-square flex items-center justify-center text-[10px] font-semibold rounded-sm tabular-nums ${cls}`}
                      title={
                        cell.weight > 0
                          ? `${label} ${h}h\nDemande: ${cell.demandSlot.toFixed(0)} places/mo\nCapacité: ${cell.capacitySlot.toFixed(0)} places/mo\nSaturation: ${(cell.saturation * 100).toFixed(0)}%`
                          : `${label} ${h}h — créneau fermé`
                      }
                    >
                      {cell.weight > 0 ? `${(cell.saturation * 100).toFixed(0)}` : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bloc source — calibration heatmap demande sur stats CRM CFRG réelles.
            Justifie auprès d'investisseurs/banquiers que les poids de demande
            (matrice `cap.demandHeatmap`) ne sont pas synthétiques mais dérivés
            de la fréquentation observée du site existant. */}
        <aside className="rounded-md border-l-4 border-[#D32F2F] bg-[#D32F2F]/5 p-3 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-[#D32F2F]">
            <CalendarClock className="h-3.5 w-3.5" />
            Source des poids de demande — Fréquentation CRM CrossFit Rive Gauche
          </div>
          <p className="leading-relaxed text-slate-700">
            La heatmap de demande utilisée pour projeter la saturation s'appuie sur les <strong>statistiques
            réelles de fréquentation de la salle</strong>, et non sur un schéma théorique. Les données
            proviennent du dashboard interne CFRG (<code className="font-mono px-1 bg-white rounded text-[10px]">crossfitrg-web</code>,
            route <code className="font-mono px-1 bg-white rounded text-[10px]">/dashboard/vue-ensemble</code>),
            qui agrège deux vues complémentaires synchronisées toutes les 12 h depuis ResaWod (logiciel de
            réservation utilisé par le club) :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li>
              <strong>Heatmap 90 jours</strong> (<code className="font-mono text-[10px]">FrequencyHeatmap</code>) —
              nombre de séances réalisées par créneau (jour × heure), table <code className="font-mono text-[10px]">crm.sessions</code> filtrée
              sur <code className="font-mono text-[10px]">status = 'attended'</code>. Mesure la <em>fréquence</em>
              d'ouverture utile d'un créneau.
            </li>
            <li>
              <strong>Heatmap YTD cumulée</strong> (<code className="font-mono text-[10px]">YearlyFrequencyHeatmap</code>) —
              somme du champ <code className="font-mono text-[10px]">n_attending</code> par créneau depuis le
              1<sup>er</sup> janvier de l'année en cours. Données ResaWod direct (webhook
              <code className="font-mono text-[10px] ml-1">list-resawod-sessions-window</code>), séances
              annulées exclues, fuseau Europe/Paris préservé sans conversion UTC. Mesure la <em>pression
              effective</em> (un créneau à 12 personnes pèse 12, pas 1).
            </li>
          </ul>
          <p className="leading-relaxed text-slate-700">
            <strong>Comment ces stats sont prises en compte ici :</strong> les pics observés sur la YTD
            (typiquement Lun/Mer/Ven 7h, 18h-20h en semaine, samedi 9h-11h en weekend) servent à calibrer
            les poids relatifs de la matrice <code className="font-mono text-[10px]">demandHeatmap</code>{" "}
            ci-dessous. Le ratio pic/creux de la salle actuelle (≈ 2.5×) est répercuté tel quel sur la
            projection BP — c'est ce qui produit les poids 1.0 / 1.5 / 2.0 visibles dans l'éditeur, et non
            une distribution synthétique uniforme. Un investisseur peut donc retrouver dans
            <code className="font-mono text-[10px] ml-1">/dashboard/vue-ensemble</code> les chiffres
            sous-jacents (présences cumulées YTD, séances comptées 90 j) et vérifier la cohérence des
            poids choisis dans le BP.
          </p>
          <p className="leading-relaxed text-slate-500 text-[11px]">
            <strong>Cycle de rafraîchissement :</strong> 30 jours (cache Next.js Data Cache,
            tag <code className="font-mono text-[10px]">resawod-sessions-window</code>) — l'analyse
            structurelle est stable sur un mois, recalculer à chaque visite ne change rien aux poids.
            Pour ré-importer les poids depuis le CRM mis à jour, utiliser le bouton « Importer heatmap CRM »
            ci-dessous (V2 — bientôt disponible) ou copier manuellement les chiffres depuis le dashboard
            puis ajuster la matrice ci-dessous.
          </p>
          <p className="leading-relaxed text-slate-500 text-[11px]">
            <strong>Limites à signaler aux investisseurs :</strong> la heatmap CRM mesure la fréquentation
            du site <em>existant</em> (offre legacy 220 membres) — le mix produit/horaires de la nouvelle
            offre CFRG (CrossFit + Hyrox + sandbox, 250-450 membres cible) peut décaler légèrement les
            pics. Le BP applique un coefficient de saisonnalité (<code className="font-mono text-[10px]">subs.seasonality</code>,
            cf. /parameters) <em>en plus</em> de cette heatmap pour modéliser les creux été (juil/août) et
            rentrée (sept/janv), qui ne sont pas visibles dans une vue YTD agrégée.
          </p>
        </aside>

        {/* Saisonnalité couplée — affichage côte-à-côte avec la heatmap : permet de voir
            qu'un pic acquisition Sept (×1.20) tombe sur des créneaux déjà sous tension, ou
            qu'un creux été (Août ×0.60) libère naturellement la capacité. Visualisation
            simple : 12 barres + annotation pic/creux. Source : subs.seasonality. */}
        <SeasonalityBarsAlongsideHeatmap params={params} />

        {/* Heatmap manuelle (poids demande) */}
        <details className="border rounded-md">
          <summary className="cursor-pointer p-3 text-xs font-semibold uppercase tracking-wider hover:bg-muted/30">
            Édition heatmap demande {isDefault ? "(défaut — clique pour personnaliser)" : "(personnalisée)"}
          </summary>
          <div className="p-3 space-y-3 border-t">
            <p className="text-[10px] text-muted-foreground">
              Poids relatifs de la demande par créneau. <strong>0 = créneau fermé</strong>. Une
              valeur élevée = créneau très demandé. La distribution mensuelle de la demande totale
              (membres × {avgSessionsPerMonth}) est ventilée selon ces poids.
            </p>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `40px repeat(${HEATMAP_HOURS.length}, 1fr)` }}
                >
                  <div></div>
                  {HEATMAP_HOURS.map((h) => (
                    <div key={h} className="text-[10px] text-slate-400 text-center tabular-nums">
                      {h}h
                    </div>
                  ))}
                </div>
                {HEATMAP_DAYS.map((label, dow) => (
                  <div
                    key={dow}
                    className="grid gap-1 mt-1"
                    style={{ gridTemplateColumns: `40px repeat(${HEATMAP_HOURS.length}, 1fr)` }}
                  >
                    <div className="text-xs text-slate-600 font-medium flex items-center">
                      {label}
                    </div>
                    {HEATMAP_HOURS.map((h, i) => (
                      <Input
                        key={`${dow}-${h}`}
                        type="number"
                        step="0.1"
                        value={matrix[dow]?.[i] ?? 0}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          const next = matrix.map((r) => [...r]);
                          if (!next[dow]) next[dow] = new Array(HEATMAP_HOURS.length).fill(0);
                          next[dow][i] = Math.max(0, v);
                          onUpdateHeatmap(next);
                        }}
                        className="h-7 px-1 text-[10px] text-center tabular-nums"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateHeatmap(defaultDemandHeatmap())}
                className="text-[10px] h-7"
              >
                Reset preset par défaut
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Preset : 21h pics fortes (Lun/Mer/Ven 7h-8h + 18h-21h, Mar/Jeu 18h-21h)
                  const m: number[][] = Array.from({ length: 7 }, () =>
                    new Array(HEATMAP_HOURS.length).fill(0)
                  );
                  const peakHours = [7, 18, 19, 20];
                  const offHoursSoir = [12];
                  for (let dow = 0; dow < 5; dow++) {
                    for (const h of peakHours) {
                      m[dow][HEATMAP_HOURS.indexOf(h)] = 2.0;
                    }
                    for (const h of offHoursSoir) {
                      m[dow][HEATMAP_HOURS.indexOf(h)] = 0.8;
                    }
                  }
                  // weekend matin
                  for (const h of [9, 10, 11]) {
                    m[5][HEATMAP_HOURS.indexOf(h)] = 1.5;
                    m[6][HEATMAP_HOURS.indexOf(h)] = 1.2;
                  }
                  onUpdateHeatmap(m);
                }}
                className="text-[10px] h-7"
              >
                Preset CFRG (21h pics)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="text-[10px] h-7 cursor-not-allowed opacity-50"
                title="Bientôt dispo — extraction crm.sessions du dashboard"
              >
                Importer heatmap CRM (V2)
              </Button>
            </div>
          </div>
        </details>

        {/* Bundle 2 — Planning hétérogène (parallèle par cellule) */}
        <details className="border rounded-md">
          <summary className="cursor-pointer p-3 text-xs font-semibold uppercase tracking-wider hover:bg-muted/30">
            Planning hétérogène : nb d&apos;espaces ouverts par créneau{" "}
            {isParallelDefault ? "(non défini — capacité full)" : "(personnalisé)"}
          </summary>
          <div className="p-3 space-y-3 border-t">
            <p className="text-[10px] text-muted-foreground">
              <strong>0</strong> = créneau fermé · <strong>1</strong> = espace A seul
              {areas.length >= 2 ? " · " : null}
              {areas.length >= 2 ? <><strong>2</strong> = A + B en parallèle</> : null}
              {areas.length >= 3 ? " · etc." : null}
              <br />
              Si non défini, tous les espaces sont supposés ouverts (capacité totale).
              Personnaliser pour modéliser un planning où on n&apos;ouvre B que sur les pics.
            </p>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `40px repeat(${HEATMAP_HOURS.length}, 1fr)` }}
                >
                  <div></div>
                  {HEATMAP_HOURS.map((h) => (
                    <div key={h} className="text-[10px] text-slate-400 text-center tabular-nums">
                      {h}h
                    </div>
                  ))}
                </div>
                {HEATMAP_DAYS.map((label, dow) => (
                  <div
                    key={dow}
                    className="grid gap-1 mt-1"
                    style={{ gridTemplateColumns: `40px repeat(${HEATMAP_HOURS.length}, 1fr)` }}
                  >
                    <div className="text-xs text-slate-600 font-medium flex items-center">
                      {label}
                    </div>
                    {HEATMAP_HOURS.map((h, i) => (
                      <Input
                        key={`p-${dow}-${h}`}
                        type="number"
                        step="1"
                        min="0"
                        max={areas.length}
                        value={parallelMatrix?.[dow]?.[i] ?? 0}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10) || 0;
                          const base = parallelMatrix
                            ? parallelMatrix.map((r) => [...r])
                            : Array.from({ length: 7 }, () =>
                                new Array(HEATMAP_HOURS.length).fill(0)
                              );
                          if (!base[dow]) base[dow] = new Array(HEATMAP_HOURS.length).fill(0);
                          base[dow][i] = Math.max(0, Math.min(v, areas.length));
                          onUpdateParallelMatrix(base);
                        }}
                        className="h-7 px-1 text-[10px] text-center tabular-nums"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateParallelMatrix(defaultParallelMatrix())}
                className="text-[10px] h-7"
                title="1 espace sur toutes les heures de schedule (CFRG départ)"
              >
                Preset 1 espace
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const auto = autoScheduleParallelMatrix(
                    memEnd,
                    avgSessionsPerMonth,
                    matrix,
                    areas,
                    scale,
                    targetSat
                  );
                  onUpdateParallelMatrix(auto);
                }}
                className="text-[10px] h-7"
                title={`Calcule auto le nb d'espaces nécessaire par créneau pour rester ≤ ${(targetSat * 100).toFixed(0)}% sat (FY ${fyLabels[activeFy]})`}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Auto-schedule pour {fyLabels[activeFy]} ({(targetSat * 100).toFixed(0)}% cible)
              </Button>
              {parallelMatrix ? (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  Cap mensuelle :{" "}
                  <strong>
                    {Math.round(
                      computeMonthlyCapacityFromMatrix(parallelMatrix, areas, scale)
                    ).toLocaleString("fr-FR")}
                  </strong>{" "}
                  places
                </span>
              ) : null}
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function SessionsByTenureSection({
  params,
  updateCapacity,
}: {
  params: ModelParams;
  updateCapacity: (patch: Partial<NonNullable<typeof params.capacity>>) => void;
}) {
  const sbt = params.capacity?.sessionsByTenure;
  const enabled = !!sbt;
  const fallback = params.capacity?.avgSessionsPerMonth ?? 8;
  const cohortActive = params.subs.cohortModel?.enabled === true;

  const setEnabled = (next: boolean) => {
    updateCapacity({
      sessionsByTenure: next
        ? { newMember: 5, midTerm: 8, longTerm: 12 }
        : undefined,
    });
  };

  const update = (patch: Partial<NonNullable<typeof params.capacity>["sessionsByTenure"]>) => {
    updateCapacity({
      sessionsByTenure: { ...(sbt ?? { newMember: 5, midTerm: 8, longTerm: 12 }), ...patch! },
    });
  };

  // Aperçu moyenne pondérée
  const weighted = enabled && sbt
    ? avgSessionsWeighted(sbt, fallback, cohortActive)
    : fallback;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-[#D32F2F]" />
          Sessions/mois par ancienneté membre (Bundle 2)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Modélise la croissance d&apos;engagement avec l&apos;ancienneté. Membres récents font moins
          de sessions que les anciens (long-stayers). Si activé + cohort model actif, le
          capacity-planner utilise la moyenne pondérée.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {enabled ? (
              <>
                Moyenne pondérée :{" "}
                <strong className="text-foreground">{weighted.toFixed(1)}</strong> séances/mo
                {!cohortActive ? (
                  <span className="ml-2 text-amber-700">
                    (cohort model désactivé → fallback {fallback})
                  </span>
                ) : null}
              </>
            ) : (
              <>Désactivé — utilise fallback constant {fallback} séances/mo.</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="tenure-toggle" className="text-xs">
              {enabled ? "Activé" : "Désactivé"}
            </Label>
            <Switch id="tenure-toggle" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        {enabled && sbt ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px]">Nouveaux (0-3 mois) — sessions/mo</Label>
              <Input
                type="number"
                step="0.5"
                value={sbt.newMember}
                onChange={(e) => update({ newMember: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">CrossFit typique : 4-6</p>
            </div>
            <div>
              <Label className="text-[10px]">Mid-term (3-12 mois)</Label>
              <Input
                type="number"
                step="0.5"
                value={sbt.midTerm}
                onChange={(e) => update({ midTerm: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Engagement stabilisé : 7-10</p>
            </div>
            <div>
              <Label className="text-[10px]">Long-term (12+ mois)</Label>
              <Input
                type="number"
                step="0.5"
                value={sbt.longTerm}
                onChange={(e) => update({ longTerm: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Habitués : 10-15+</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Bundle 3 — Personas (segmentation client + demande différenciée)
// ============================================================================
function PersonasSection({
  params,
  updateCapacity,
}: {
  params: ModelParams;
  updateCapacity: (patch: Partial<NonNullable<typeof params.capacity>>) => void;
}) {
  const personas = params.capacity?.personas ?? [];
  const totalShare = personas.reduce((s, p) => s + p.sharePct, 0);
  const avgSessions = personas.length > 0 ? avgSessionsByPersona(personas) : 0;

  const setPersonas = (next: Persona[]) => updateCapacity({ personas: next });
  const addPersona = () =>
    setPersonas([
      ...personas,
      {
        id: `pers_${Date.now()}`,
        name: "Nouveau persona",
        sharePct: 0.10,
        avgSessionsPerMonth: 8,
        hourPreferences: { morning: 0.25, lunch: 0.15, evening: 0.55, weekend: 0.05 },
      },
    ]);
  const removePersona = (id: string) =>
    setPersonas(personas.filter((p) => p.id !== id));
  const updatePersona = (id: string, patch: Partial<Persona>) =>
    setPersonas(personas.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-[#D32F2F]" />
          Personas — segmentation client (Bundle 3)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Définit les types de membres (CSP+, Masters, Teens, athlètes Hyrox, etc.) avec
          leurs préférences horaires et fréquence de pratique. Permet d&apos;analyser couverture
          des segments et calibrer la heatmap demande.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-muted-foreground">
            {personas.length} persona{personas.length > 1 ? "s" : ""} — share total{" "}
            <span className={Math.abs(totalShare - 1) < 0.01 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
              {(totalShare * 100).toFixed(0)}%
            </span>
            {personas.length > 0 ? (
              <>
                {" — "}sessions/mo pondérée :{" "}
                <strong className="text-foreground">{avgSessions.toFixed(1)}</strong>
              </>
            ) : null}
          </div>
          <div className="flex gap-2">
            {personas.length === 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPersonas(defaultPersonas())}
                className="text-[10px] h-7"
              >
                Preset CFRG (6 personas)
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={addPersona} className="text-[10px] h-7">
              <Plus className="h-3 w-3 mr-1" /> Persona
            </Button>
          </div>
        </div>

        {personas.length > 0 ? (
          <div className="space-y-2">
            {personas.map((p) => (
              <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-2 border rounded bg-background">
                <div className="md:col-span-3">
                  <Label className="text-[10px]">Nom</Label>
                  <Input
                    value={p.name}
                    onChange={(e) => updatePersona(p.id, { name: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px]">Share (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(p.sharePct * 100).toFixed(0)}
                    onChange={(e) =>
                      updatePersona(p.id, { sharePct: (parseFloat(e.target.value) || 0) / 100 })
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px]">Sessions/mo</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={p.avgSessionsPerMonth}
                    onChange={(e) =>
                      updatePersona(p.id, { avgSessionsPerMonth: parseFloat(e.target.value) || 0 })
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="md:col-span-4">
                  <Label className="text-[10px]">Préférence horaire (matin/midi/soir/we)</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {(["morning", "lunch", "evening", "weekend"] as const).map((slot) => (
                      <Input
                        key={slot}
                        type="number"
                        step="0.05"
                        value={(p.hourPreferences?.[slot] ?? 0).toFixed(2)}
                        onChange={(e) =>
                          updatePersona(p.id, {
                            hourPreferences: {
                              ...(p.hourPreferences ?? {
                                morning: 0,
                                lunch: 0,
                                evening: 0,
                                weekend: 0,
                              }),
                              [slot]: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="h-7 px-1 text-[10px] text-center"
                        title={slot}
                      />
                    ))}
                  </div>
                </div>
                <div className="md:col-span-1 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 h-7"
                    onClick={() => removePersona(p.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const base = params.capacity?.demandHeatmap ?? defaultDemandHeatmap();
                const computed = buildDemandHeatmapFromPersonas(personas, base);
                updateCapacity({ demandHeatmap: computed });
              }}
              className="text-[10px] h-7"
              title="Régénère la heatmap demande à partir des préférences horaires personas"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              Régénérer heatmap demande depuis personas
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Bundle 3 — Disciplines par créneau
// ============================================================================
function DisciplinesSection({
  params,
  updateCapacity,
}: {
  params: ModelParams;
  updateCapacity: (patch: Partial<NonNullable<typeof params.capacity>>) => void;
}) {
  const matrix = params.capacity?.disciplineByCellMatrix;
  const enabled = !!matrix;

  const setEnabled = (next: boolean) => {
    if (next) {
      const empty: (ClassDiscipline | "")[][] = Array.from({ length: 7 }, () =>
        new Array(HEATMAP_HOURS.length).fill("")
      );
      updateCapacity({ disciplineByCellMatrix: empty });
    } else {
      updateCapacity({ disciplineByCellMatrix: undefined });
    }
  };

  const updateCell = (dow: number, hourIdx: number, val: ClassDiscipline | "") => {
    const next: (ClassDiscipline | "")[][] = matrix
      ? matrix.map((r) => [...r])
      : Array.from({ length: 7 }, () => new Array(HEATMAP_HOURS.length).fill(""));
    if (!next[dow]) next[dow] = new Array(HEATMAP_HOURS.length).fill("");
    next[dow][hourIdx] = val;
    updateCapacity({ disciplineByCellMatrix: next });
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    if (!matrix) return c;
    for (const row of matrix) {
      for (const cell of row) {
        if (cell) c[cell] = (c[cell] ?? 0) + 1;
      }
    }
    return c;
  }, [matrix]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[#D32F2F]" />
          Disciplines par créneau (Bundle 3)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Tag chaque créneau de la grille avec une discipline (CrossFit, Hyrox, Halté, etc.).
          Permet d&apos;analyser couverture programmatique : « Pas de Hyrox samedi = perte segment ».
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2 text-[10px]">
            {Object.entries(counts).map(([k, n]) => {
              const d = DISCIPLINES.find((dd) => dd.id === k);
              return (
                <span
                  key={k}
                  className="px-1.5 py-0.5 rounded font-mono"
                  style={{ backgroundColor: `${d?.color}20`, color: d?.color }}
                >
                  {d?.label}: {n}
                </span>
              );
            })}
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && matrix ? (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `40px repeat(${HEATMAP_HOURS.length}, 1fr)` }}
              >
                <div></div>
                {HEATMAP_HOURS.map((h) => (
                  <div key={h} className="text-[10px] text-slate-400 text-center tabular-nums">
                    {h}h
                  </div>
                ))}
              </div>
              {HEATMAP_DAYS.map((label, dow) => (
                <div
                  key={dow}
                  className="grid gap-1 mt-1"
                  style={{ gridTemplateColumns: `40px repeat(${HEATMAP_HOURS.length}, 1fr)` }}
                >
                  <div className="text-xs text-slate-600 font-medium flex items-center">
                    {label}
                  </div>
                  {HEATMAP_HOURS.map((h, i) => {
                    const cell = matrix[dow]?.[i] ?? "";
                    const d = DISCIPLINES.find((dd) => dd.id === cell);
                    return (
                      <select
                        key={`d-${dow}-${h}`}
                        value={cell}
                        onChange={(e) =>
                          updateCell(dow, i, e.target.value as ClassDiscipline | "")
                        }
                        className="h-7 px-0.5 text-[9px] rounded border bg-background tabular-nums"
                        style={{
                          backgroundColor: d ? `${d.color}20` : undefined,
                          color: d?.color,
                          borderColor: d ? d.color : undefined,
                        }}
                      >
                        <option value="">—</option>
                        {DISCIPLINES.map((dd) => (
                          <option key={dd.id} value={dd.id}>
                            {dd.label}
                          </option>
                        ))}
                      </select>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">
            Activer pour assigner une discipline à chaque créneau du planning.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Bundle 3 — Économie marginale d'un cours additionnel
// ============================================================================
function MarginalEconomicsSection({
  params,
  updateCapacity,
  result,
}: {
  params: ModelParams;
  updateCapacity: (patch: Partial<NonNullable<typeof params.capacity>>) => void;
  result: ModelResult;
}) {
  const cap = params.capacity;
  const noShow = cap?.noShowPct ?? 0;
  const hourlyCostInput = cap?.marginalHourlyCostEur;
  const sessionRevenueInput = cap?.marginalSessionRevenueEur;

  // Default coût horaire = tarif freelance moyen des pools
  const defaultHourlyCost = useMemo(() => {
    const pools = params.salaries.freelancePools ?? [];
    if (pools.length === 0) return 25;
    return pools.reduce((s, p) => s + p.hourlyRate, 0) / pools.length;
  }, [params.salaries.freelancePools]);

  // Default revenu/séance = derive du modèle (CA abos FY1 / total séances FY1)
  const defaultSessionRevenue = useMemo(() => {
    const fy1 = result.yearly[0];
    if (!fy1) return 12;
    const totalMembers = fy1.totalRevenue > 0
      ? result.monthly.slice(0, 12).reduce((s, m) => s + m.subsCount, 0) / 12
      : 0;
    const totalSessions = totalMembers * (cap?.avgSessionsPerMonth ?? 8) * 12;
    return totalSessions > 0 ? fy1.subsRevenue / totalSessions : 12;
  }, [result.yearly, result.monthly, cap?.avgSessionsPerMonth]);

  const hourlyCost = hourlyCostInput ?? defaultHourlyCost;
  const sessionRevenue = sessionRevenueInput ?? defaultSessionRevenue;
  const capacityPerHour = cap?.areas?.[0]?.capacity ?? cap?.capacityPerClass ?? 14;
  const econ = marginalClassEconomics(hourlyCost, capacityPerHour, sessionRevenue, 0.7);

  const effectiveCap = effectiveCapacityWithNoShow(capacityPerHour, noShow);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#D32F2F]" />
          Économie marginale d&apos;un cours additionnel (Bundle 3)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Décide si ouvrir un cours supplémentaire est rentable. Compare coût coach (1h freelance)
          vs revenu attendu (places × prix moyen séance HT).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-[10px]">Coût horaire coach (€/h)</Label>
            <Input
              type="number"
              step="1"
              value={hourlyCost.toFixed(2)}
              onChange={(e) =>
                updateCapacity({ marginalHourlyCostEur: parseFloat(e.target.value) || 0 })
              }
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Default : moyenne pools freelance ({defaultHourlyCost.toFixed(0)}€)
            </p>
          </div>
          <div>
            <Label className="text-[10px]">Revenu / séance (€ HT)</Label>
            <Input
              type="number"
              step="0.5"
              value={sessionRevenue.toFixed(2)}
              onChange={(e) =>
                updateCapacity({ marginalSessionRevenueEur: parseFloat(e.target.value) || 0 })
              }
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Default : CA abos / total séances ({defaultSessionRevenue.toFixed(2)}€)
            </p>
          </div>
          <div>
            <Label className="text-[10px]">No-show / annulation tardive (%)</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                value={(noShow * 100).toFixed(1)}
                onChange={(e) =>
                  updateCapacity({ noShowPct: (parseFloat(e.target.value) || 0) / 100 })
                }
                className="h-8 text-xs pr-7"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Capacité effective : {effectiveCap.toFixed(1)} places (overbook ok si {(noShow * 100).toFixed(0)}%)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <Stat label="Coût/cours" value={Math.round(hourlyCost)} suffix=" €" />
          <Stat label="Revenu max (places pleines)" value={Math.round(sessionRevenue * capacityPerHour)} suffix=" €" />
          <Stat
            label="Break-even fill rate"
            value={Math.round(econ.breakevenFillRate * 100)}
            suffix="%"
          />
          <Stat label="Capa /cours" value={capacityPerHour} suffix=" places" />
        </div>

        <div className={"p-3 rounded border-l-4 " + (econ.breakevenFillRate <= 0.5 ? "border-emerald-600 bg-emerald-50" : econ.breakevenFillRate <= 0.7 ? "border-amber-600 bg-amber-50" : "border-red-600 bg-red-50")}>
          <p className="text-xs">
            <strong>
              {econ.breakevenFillRate <= 0.5
                ? "Très rentable"
                : econ.breakevenFillRate <= 0.7
                  ? "Rentable si > 70% rempli"
                  : "Marginal — attention"}
            </strong>{" "}
            — Ouvrir un cours additionnel devient rentable à partir de{" "}
            <strong>{(econ.breakevenFillRate * 100).toFixed(0)}%</strong> de remplissage. Si tu vises{" "}
            <strong>70%+</strong> sat sur les pics, ouvrir le 2e espace est{" "}
            <strong>{econ.recommendedOpen ? "recommandé" : "non recommandé"}</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Saisonnalité acquisition / CA visualisée à côté de la heatmap demande.
 * Permet à l'utilisateur de voir l'interaction entre :
 *   - saisonnalité globale (subs.seasonality) : pic Sept, creux Août
 *   - saisonnalité acquisition différenciée (subs.seasonalityAcquisition) si activée
 *   - heatmap hebdomadaire (jour × heure) déjà affichée plus haut
 * Le but : repérer un mois où acquisition × demande hebdo crée une saturation tendue
 * (ex : Sept ×1.20 acquisition + Lun 19h déjà à 95% = surcharge garantie).
 */
function SeasonalityBarsAlongsideHeatmap({ params }: { params: ModelParams }) {
  const seas = params.subs.seasonality ?? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const seasAcq = params.subs.seasonalityAcquisition;
  const months = ["Sept", "Oct", "Nov", "Déc", "Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août"];
  const maxVal = Math.max(...seas, ...(seasAcq ?? [1]), 1);
  const minVal = Math.min(...seas, ...(seasAcq ?? [1]), 1);

  const peaks = seas
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v >= 1.1)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2);
  const troughs = seas
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v <= 0.85)
    .sort((a, b) => a.v - b.v)
    .slice(0, 2);

  return (
    <div className="rounded-md border bg-muted/10 p-3 space-y-2">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          Saisonnalité mensuelle × pression heatmap hebdo
        </div>
        <a
          href="/parameters#seasonality"
          className="text-[10px] text-[#D32F2F] underline"
          title="Éditer subs.seasonality"
        >
          Éditer sur /parameters
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground">
        La heatmap ci-dessus montre la pression <em>hebdomadaire</em> (jour × heure). Cette
        barre montre la modulation <em>mensuelle</em> qui s'ajoute par-dessus
        (<code>subs.seasonality</code>). Sur un mois Sept ×1.20, les créneaux déjà saturés
        de la heatmap dépassent 100% — combine les deux pour voir où tu vas vraiment
        refuser des membres.
      </p>
      <div className="grid grid-cols-12 gap-1 mt-2">
        {months.map((m, i) => {
          const v = seas[i] ?? 1;
          const vAcq = seasAcq?.[i];
          const heightPct = ((v - minVal) / Math.max(0.01, maxVal - minVal)) * 100;
          const color = v >= 1.1 ? "bg-red-400" : v <= 0.85 ? "bg-emerald-400" : "bg-slate-400";
          return (
            <div key={m} className="flex flex-col items-center gap-0.5">
              <div className="h-16 w-full flex flex-col justify-end relative">
                <div
                  className={`${color} rounded-t-sm transition-all`}
                  style={{ height: `${Math.max(10, heightPct)}%` }}
                  title={`${m} : ×${v.toFixed(2)}${vAcq !== undefined ? ` (acquis ×${vAcq.toFixed(2)})` : ""}`}
                />
                {vAcq !== undefined && Math.abs(vAcq - v) > 0.05 ? (
                  <div
                    className="absolute right-0 top-0 h-0.5 bg-amber-600"
                    style={{
                      width: "100%",
                      top: `${100 - ((vAcq - minVal) / Math.max(0.01, maxVal - minVal)) * 100}%`,
                    }}
                    title={`Acquisition spécifique : ×${vAcq.toFixed(2)}`}
                  />
                ) : null}
              </div>
              <div className="text-[9px] text-muted-foreground">{m}</div>
              <div className="text-[9px] font-mono text-foreground">
                {v.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] mt-2">
        {peaks.length > 0 ? (
          <div className="text-red-700">
            <strong>Pics :</strong>{" "}
            {peaks.map((p) => `${months[p.i]} ×${p.v.toFixed(2)}`).join(", ")} — couplé aux
            créneaux rouges de la heatmap, attention au refus de membres.
          </div>
        ) : null}
        {troughs.length > 0 ? (
          <div className="text-emerald-700">
            <strong>Creux :</strong>{" "}
            {troughs.map((p) => `${months[p.i]} ×${p.v.toFixed(2)}`).join(", ")} — capacité
            libérée naturellement, opportunité pour cours spéciaux/teen/masters.
          </div>
        ) : null}
        {seasAcq ? (
          <div className="text-amber-700">
            <strong>Acquisition différenciée active</strong> (trait orange) — le cohort
            applique <code>seasonalityAcquisition</code> séparé du CA global.
          </div>
        ) : null}
      </div>
    </div>
  );
}
