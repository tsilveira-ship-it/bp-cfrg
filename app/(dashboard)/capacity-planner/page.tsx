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
  compareCdiVsFreelance,
  computeAllocatedHours,
  computeMonthlyCapacitySlots,
  computeMonthlyHours,
  computeWeeklyHours,
  DEFAULT_AREAS,
  DEFAULT_PRODUCTIVE_RATIO,
  DEFAULT_SCHEDULE,
  findBreakEvenHours,
  freelanceCostFromAllocations,
  hoursToFte,
  HOURS_PER_FTE_THEORETICAL,
  type CdiHypothesis,
  type FreelanceHypothesis,
} from "@/lib/capacity-planner";
import type {
  CoachAllocation,
  GymArea,
  WeeklySchedule,
} from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScenarioSwitcher } from "@/components/scenario-switcher";

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
            {fyLabels.map((label, fy) => (
              <div key={fy}>
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  step={0.05}
                  value={scaleByFy[fy] ?? 1}
                  onChange={(e) => updateScale(fy, parseFloat(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
            return (
              <div
                key={alloc.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded"
              >
                <div>
                  <Label className="text-xs">{alloc.coachKind === "cadre" ? "Cadre" : "Freelance pool"}</Label>
                  <div className="text-sm font-medium">{name}</div>
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
