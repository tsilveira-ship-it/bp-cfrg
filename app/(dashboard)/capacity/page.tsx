"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { effectiveMonthlyHours } from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtNum, fmtPct } from "@/lib/format";
import { InfoLabel } from "@/components/info-label";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  CalendarClock,
  ExternalLink,
  Info,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  computeMonthlyCapacitySlots,
  HOURS_PER_FTE_PRODUCTIVE,
  DEFAULT_AREAS,
  DEFAULT_SCHEDULE,
} from "@/lib/capacity-planner";
import type { GymArea, WeeklySchedule } from "@/lib/model/types";

const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "12px",
};

const DEFAULT_CAPACITY = {
  parallelClasses: 1,
  capacityPerClass: 15,
  capacityPerClassMin: 12,
  capacityPerClassMax: 16,
  avgSessionsPerMonth: 8,
};

type CalcSource = "planner" | "fallback";

const WEEKS_PER_MONTH = 4.3;

/** Renvoie l'offre de places mensuelle selon la source. */
function computeMonthlySlotsOffered(
  hasPlanner: boolean,
  areas: GymArea[],
  schedule: WeeklySchedule,
  scale: number,
  fallbackCoachHours: number,
  fallbackSlotsPerHour: number
): number {
  if (hasPlanner) {
    // Σ areas (cours_par_sem × capacity_area) × WEEKS_PER_MONTH × scale
    return computeMonthlyCapacitySlots(areas, schedule, scale);
  }
  // Fallback: si pas de planning, on assume que toutes les heures coach disponibles sont
  // converties en cours, avec slots/h = capacityPerClass × parallelClasses
  return fallbackCoachHours * fallbackSlotsPerHour;
}

export default function CapacityPage() {
  const params = useModelStore((s) => s.params);
  const patch = useModelStore((s) => s.patch);
  const setParams = useModelStore((s) => s.setParams);
  const result = useMemo(() => computeModel(params), [params]);

  const cap = params.capacity ?? DEFAULT_CAPACITY;
  const parallel = cap.parallelClasses;
  const capPerClass = cap.capacityPerClass;
  const capMin = cap.capacityPerClassMin ?? capPerClass;
  const capMax = cap.capacityPerClassMax ?? capPerClass;
  const avgSessions = cap.avgSessionsPerMonth;

  const enableCapacity = () => {
    setParams((p) => ({ ...p, capacity: { ...DEFAULT_CAPACITY, ...(p.capacity ?? {}) } }));
  };

  // === Sources des heures coaching ===
  const planner = params.capacity ?? null;
  const hasPlanner = !!(planner?.areas && planner.weeklySchedule && planner.areas.length > 0);
  const areas = planner?.areas ?? DEFAULT_AREAS;
  const schedule = planner?.weeklySchedule ?? DEFAULT_SCHEDULE;

  const totalCoachingHours = (params.salaries.freelancePools ?? [])
    .filter((p) => p.monthlyHours > 0 || (p.hoursPerWeekday ?? 0) > 0)
    .reduce((s, p) => s + Math.max(0, effectiveMonthlyHours(p)), 0);
  const cadreCoaches = params.salaries.items.filter((it) => /coach|head/i.test(it.role));
  const cadreFte = cadreCoaches.reduce((s, it) => s + it.fte, 0);
  const cadreHours = cadreFte * HOURS_PER_FTE_PRODUCTIVE;
  const fallbackTotalHours = totalCoachingHours + cadreHours;
  const fallbackSlotsPerHour = parallel * capPerClass;

  const source: CalcSource = hasPlanner ? "planner" : "fallback";

  // Stats du planning (pour bandeau et explainer)
  const classesPerWeek = hasPlanner
    ? (5 * schedule.weekdayClassesPerArea + 2 * schedule.weekendClassesPerArea) * areas.length
    : 0;
  const sumCapacity = areas.reduce((s, a) => s + a.capacity, 0);

  // Données mensuelles
  const data = result.monthly.map((m) => {
    const totalMembers = m.subsCount + m.legacyCount;
    const sessionsDemand = totalMembers * avgSessions;
    const fyIdx = m.fy;
    const scale = planner?.scaleByFy?.[fyIdx] ?? 1;
    const sessionsSupply = computeMonthlySlotsOffered(
      hasPlanner,
      areas,
      schedule,
      scale,
      fallbackTotalHours,
      fallbackSlotsPerHour
    );
    const saturation = sessionsSupply > 0 ? sessionsDemand / sessionsSupply : 0;
    return {
      label: m.label,
      Membres: Math.round(totalMembers),
      "Saturation %": Math.round(saturation * 100),
      saturationVal: saturation,
      sessionsDemand,
      sessionsSupply,
      scale,
    };
  });

  const maxSat = Math.max(...data.map((d) => d.saturationVal));
  const maxSatMonth = data.find((d) => d.saturationVal === maxSat);
  const lastMonth = result.monthly[result.monthly.length - 1];
  const lastData = data[data.length - 1];
  const lastMembers = lastMonth ? lastMonth.subsCount + lastMonth.legacyCount : 0;
  const lastDemand = lastMembers * avgSessions;
  const lastSupply = lastData?.sessionsSupply ?? 0;

  // Capacité théorique max
  const maxMembersAtSweetSpot = Math.floor((lastSupply * 0.85) / Math.max(1, avgSessions));
  const maxMembersAt100 = Math.floor(lastSupply / Math.max(1, avgSessions));
  const headroomMembers = maxMembersAt100 - lastMembers;

  // Simulateur "what if" — état local
  const [whatIfMembers, setWhatIfMembers] = useState(lastMembers);
  const [whatIfSessions, setWhatIfSessions] = useState(avgSessions);
  const [whatIfClassesPerWeekDelta, setWhatIfClassesPerWeekDelta] = useState(0);

  const whatIfDemand = whatIfMembers * whatIfSessions;
  const whatIfClassesPerWeek = classesPerWeek + whatIfClassesPerWeekDelta;
  const whatIfSupply = hasPlanner
    ? whatIfClassesPerWeek * (sumCapacity / Math.max(1, areas.length)) * WEEKS_PER_MONTH
    : lastSupply;
  const whatIfSaturation = whatIfSupply > 0 ? whatIfDemand / whatIfSupply : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capacité opérationnelle</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Saturation = places demandées (membres × sessions) ÷ places offertes (cours ×
            capacité). Permet d&apos;évaluer ton potentiel et tes besoins en effectifs.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      {/* Bandeau source du calcul */}
      <Card
        className={
          source === "planner"
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-amber-300 bg-amber-50/30"
        }
      >
        <CardContent className="pt-5 flex flex-wrap items-start gap-3">
          {source === "planner" ? (
            <>
              <CalendarClock className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-emerald-900">
                  Source : planning détaillé /capacity-planner ✓
                </div>
                <p className="text-xs text-emerald-900/80 mt-1">
                  {areas.length} espace{areas.length > 1 ? "s" : ""} (capacités{" "}
                  {areas.map((a) => a.capacity).join(", ")}) ×{" "}
                  {schedule.weekdayClassesPerArea} cours/jour ouvré +{" "}
                  {schedule.weekendClassesPerArea} cours/jour weekend ={" "}
                  <b>{classesPerWeek} cours/semaine total</b>.
                </p>
              </div>
              <Link
                href="/capacity-planner"
                className="text-xs text-emerald-800 underline hover:no-underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Modifier le planning
              </Link>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-amber-900">
                  Source : heuristique (planning non configuré)
                </div>
                <p className="text-xs text-amber-900/80 mt-1">
                  Heures coach estimées : <b>{Math.round(totalCoachingHours)}h</b> freelance +{" "}
                  <b>{Math.round(cadreHours)}h</b> cadres = {Math.round(fallbackTotalHours)}h ×{" "}
                  {fallbackSlotsPerHour} slots/h ={" "}
                  <b>{Math.round(fallbackTotalHours * fallbackSlotsPerHour)} places offertes/mois</b>
                  .
                </p>
              </div>
              <Link
                href="/capacity-planner"
                className="text-xs text-amber-900 underline hover:no-underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Configurer le planning
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Carte explicative du calcul */}
      <Card className="border-blue-200 bg-blue-50/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-blue-700" /> Comment se calcule la saturation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md bg-white border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                ① Demande
              </div>
              <div className="text-xs mt-1">
                Membres × sessions/mois/membre
              </div>
              <div className="font-mono text-sm mt-2">
                {fmtNum(lastMembers)} × {avgSessions} ={" "}
                <b className="text-blue-700">{fmtNum(lastDemand)} places/mois</b>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                au dernier mois ({lastMonth?.label ?? "—"})
              </div>
            </div>
            <div className="rounded-md bg-white border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                ② Offre
              </div>
              <div className="text-xs mt-1">
                {hasPlanner
                  ? `Σ areas (cours/sem × capacité) × 4.3 × scaling FY`
                  : "heures coach × slots/h"}
              </div>
              <div className="font-mono text-sm mt-2">
                {hasPlanner ? (
                  <>
                    {classesPerWeek} cours × {(sumCapacity / Math.max(1, areas.length)).toFixed(1)} pl avg × 4.3 ×{" "}
                    {(lastData?.scale ?? 1).toFixed(2)} ={" "}
                    <b className="text-blue-700">{fmtNum(lastSupply)} places/mois</b>
                  </>
                ) : (
                  <>
                    {Math.round(fallbackTotalHours)}h × {fallbackSlotsPerHour} ={" "}
                    <b className="text-blue-700">{fmtNum(lastSupply)} places/mois</b>
                  </>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                au dernier mois (scaling {(lastData?.scale ?? 1).toFixed(2)}×)
              </div>
            </div>
            <div className="rounded-md bg-white border-2 border-blue-300 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                ③ Saturation
              </div>
              <div className="text-xs mt-1">Demande ÷ Offre</div>
              <div className="font-mono text-sm mt-2">
                {fmtNum(lastDemand)} ÷ {fmtNum(lastSupply)} ={" "}
                <b
                  className={
                    "text-lg " +
                    (maxSat > 1
                      ? "text-red-700"
                      : maxSat > 0.85
                        ? "text-amber-700"
                        : "text-emerald-700")
                  }
                >
                  {fmtPct(lastSupply > 0 ? lastDemand / lastSupply : 0, 0)}
                </b>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                au dernier mois (max sur horizon : {fmtPct(maxSat)})
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t pt-3">
            💡 <b>Interprétation :</b> 100% = tous les cours pleins, plus aucune place dispo.
            En pratique, il faut viser <b>70-85%</b> car (a) les membres ne viennent jamais tous
            simultanément aux mêmes créneaux, (b) il faut une marge pour absorber les pics et les
            essais.
          </div>
        </CardContent>
      </Card>

      {/* Potentiel & limites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-[#D32F2F]" /> Potentiel d&apos;évolution & limites
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Au dernier mois ({lastMonth?.label}), avec l&apos;offre actuelle de places.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Membres actuels
              </div>
              <div className="text-2xl font-heading font-bold mt-1">{fmtNum(lastMembers)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Saturation: {fmtPct(lastSupply > 0 ? lastDemand / lastSupply : 0, 0)}
              </div>
            </div>
            <div className="rounded-md border border-emerald-300 bg-emerald-50/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-emerald-800 font-bold">
                Sweet spot (85% sat)
              </div>
              <div className="text-2xl font-heading font-bold text-emerald-700 mt-1">
                {fmtNum(maxMembersAtSweetSpot)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Membres max à viser pour confort
              </div>
            </div>
            <div className="rounded-md border border-amber-300 bg-amber-50/30 p-3">
              <div className="text-[10px] uppercase tracking-widest text-amber-800 font-bold">
                Plafond (100% sat)
              </div>
              <div className="text-2xl font-heading font-bold text-amber-700 mt-1">
                {fmtNum(maxMembersAt100)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Au-delà = pertes / refus
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Marge (headroom)
              </div>
              <div
                className={
                  "text-2xl font-heading font-bold mt-1 " +
                  (headroomMembers < 0
                    ? "text-red-700"
                    : headroomMembers < lastMembers * 0.15
                      ? "text-amber-700"
                      : "text-emerald-700")
                }
              >
                {headroomMembers >= 0 ? "+" : ""}
                {fmtNum(headroomMembers)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Membres possibles avant 100%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulateur "What if" */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600" /> Simulateur &laquo;&nbsp;Et si...&nbsp;&raquo;
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Teste l&apos;impact d&apos;ajouter des cours / changer le nb de membres / ajuster les
            sessions.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Nb membres simulé</Label>
              <Input
                type="number"
                value={whatIfMembers}
                onChange={(e) => setWhatIfMembers(parseInt(e.target.value) || 0)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Actuel: {fmtNum(lastMembers)}
              </p>
            </div>
            <div>
              <Label className="text-xs">Sessions/membre/mois</Label>
              <Input
                type="number"
                step={0.5}
                value={whatIfSessions}
                onChange={(e) => setWhatIfSessions(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Actuel: {avgSessions}
              </p>
            </div>
            {hasPlanner ? (
              <div>
                <Label className="text-xs">Δ Cours/sem (vs planning)</Label>
                <Input
                  type="number"
                  value={whatIfClassesPerWeekDelta}
                  onChange={(e) => setWhatIfClassesPerWeekDelta(parseInt(e.target.value) || 0)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  +5 = ajouter 5 cours/sem au planning
                </p>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic self-end pb-2">
                Configure le planning pour simuler l&apos;ajout de cours.
              </div>
            )}
          </div>

          <div className="rounded-lg border-2 border-blue-300 bg-blue-50/30 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-blue-900 font-bold">
                  Demande simulée
                </div>
                <div className="font-mono text-xl mt-1">
                  {fmtNum(whatIfMembers)} × {whatIfSessions} ={" "}
                  <b>{fmtNum(whatIfDemand)} places</b>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-blue-900 font-bold">
                  Offre simulée
                </div>
                <div className="font-mono text-xl mt-1">
                  <b>{fmtNum(whatIfSupply)} places</b>
                </div>
                {hasPlanner && whatIfClassesPerWeekDelta !== 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    {classesPerWeek} {whatIfClassesPerWeekDelta > 0 ? "+" : ""}
                    {whatIfClassesPerWeekDelta} = {whatIfClassesPerWeek} cours/sem
                  </div>
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-blue-900 font-bold">
                  Saturation
                </div>
                <div
                  className={
                    "text-3xl font-heading font-bold mt-1 " +
                    (whatIfSaturation > 1
                      ? "text-red-700"
                      : whatIfSaturation > 0.85
                        ? "text-amber-700"
                        : "text-emerald-700")
                  }
                >
                  {fmtPct(whatIfSaturation, 0)}
                </div>
                {whatIfSaturation > 1 && (
                  <div className="text-[10px] text-red-700 mt-1">
                    ⚠️ Capacité dépassée — recruter ou ajouter des cours
                  </div>
                )}
                {whatIfSaturation > 0.85 && whatIfSaturation <= 1 && (
                  <div className="text-[10px] text-amber-700 mt-1">
                    Tension — anticiper recrutement
                  </div>
                )}
                {whatIfSaturation <= 0.85 && whatIfSaturation > 0 && (
                  <div className="text-[10px] text-emerald-700 mt-1">
                    OK — marge confortable
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hypothèses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hypothèses capacité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!params.capacity && (
            <div className="rounded-md border border-amber-300 bg-amber-50/40 p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">Capacité utilise des valeurs par défaut</div>
                <button
                  onClick={enableCapacity}
                  className="mt-2 text-xs font-medium underline underline-offset-2 hover:no-underline"
                >
                  Activer la capacité paramétrée
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Sessions/membre/mois (moyen)</Label>
              <Input
                type="number"
                step={0.5}
                value={avgSessions}
                onChange={(e) =>
                  patch("capacity.avgSessionsPerMonth", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                ~8-10 typique CrossFit. <b>Driver clé de la demande.</b>
              </p>
            </div>
            <div>
              <Label className="text-xs">Cours en parallèle (par créneau)</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={parallel}
                onChange={(e) =>
                  patch("capacity.parallelClasses", parseInt(e.target.value) || 1)
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">Sert au fallback heuristique.</p>
            </div>
            <div>
              <Label className="text-xs">Capacité moy/cours</Label>
              <Input
                type="number"
                value={capPerClass}
                onChange={(e) =>
                  patch("capacity.capacityPerClass", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Range {capMin}-{capMax}.
              </p>
            </div>
            <div>
              <Label className="text-xs">Heures/places offertes (mensuel)</Label>
              <div className="h-9 px-3 flex items-center rounded-md border bg-muted/40 font-mono text-sm">
                {fmtNum(lastSupply)} places
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Calculé depuis {hasPlanner ? "le planner" : "l'estimation heuristique"}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs synthèse */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              <InfoLabel label="Saturation max" />
            </div>
            <div
              className={
                "text-2xl font-bold mt-1 " +
                (maxSat > 1 ? "text-red-700" : maxSat > 0.85 ? "text-amber-700" : "text-emerald-700")
              }
            >
              {fmtPct(maxSat)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {maxSatMonth?.label} ({fmtNum(maxSatMonth?.Membres ?? 0)} membres)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              <InfoLabel label="Plafond membres" />
            </div>
            <div className="text-2xl font-bold mt-1">{fmtNum(maxMembersAt100)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              à 100% saturation (sweet spot {fmtNum(maxMembersAtSweetSpot)})
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Statut</div>
            <div className="mt-1 flex items-center gap-2">
              {maxSat > 1 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                  <span className="text-sm font-semibold text-red-700">Saturation dépassée</span>
                </>
              ) : maxSat > 0.85 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                  <span className="text-sm font-semibold text-amber-700">Tension max</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <span className="text-sm font-semibold text-emerald-700">Capacité OK</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Évolution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Évolution membres + saturation</CardTitle>
          <p className="text-xs text-muted-foreground">
            Lignes pointillées : sweet spot 85% (ambre) et plafond 100% (rouge). Ajuster le scaling
            FY dans le planner pour augmenter l&apos;offre dans le temps.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2">
            <div style={{ width: Math.max(data.length * 22, 800) }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9 }}
                    interval={2}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <ReferenceLine yAxisId="right" y={100} stroke="#dc2626" strokeDasharray="3 3" />
                  <ReferenceLine yAxisId="right" y={85} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="Membres" fill="#1a1a1a" />
                  <Bar yAxisId="right" dataKey="Saturation %" fill="#D32F2F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lecture & actions */}
      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Comment agir sur la saturation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <div className="font-semibold text-foreground mb-1">Pour augmenter l&apos;offre</div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Ajouter des cours/jour dans le planner</li>
                <li>Augmenter la capacité par cours (jusqu&apos;à 16-18 max qualité)</li>
                <li>Ajouter un espace d&apos;entraînement supplémentaire</li>
                <li>Recruter plus de coachs (cadres ou freelance)</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">Pour piloter la demande</div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Pricing différencié selon créneaux (heures creuses moins cher)</li>
                <li>Fermer les inscriptions au-delà du sweet spot</li>
                <li>Limiter le nb de réservations/membre/semaine</li>
                <li>Promouvoir les créneaux off-peak</li>
              </ul>
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-t mt-3 pt-3">
            💡 Pour ajuster espaces, planning et allocation cadres/freelance →{" "}
            <Link href="/capacity-planner" className="text-[#D32F2F] underline">
              /capacity-planner
            </Link>{" "}
            (vue détaillée).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

