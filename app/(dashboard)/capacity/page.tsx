"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Button } from "@/components/ui/button";
import { fmtNum, fmtPct } from "@/lib/format";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Layers,
  Sparkles,
  TrendingUp,
  UsersRound,
  Wand2,
} from "lucide-react";
import {
  avgSessionsByPersona,
  avgSessionsWeighted,
  computeMonthlyCapacityFromMatrix,
  computeMonthlyCapacitySlots,
  computeSaturationHeatmap,
  defaultDemandHeatmap,
  defaultParallelMatrix,
  DEFAULT_AREAS,
  DEFAULT_SCHEDULE,
  DISCIPLINES,
  HEATMAP_DAYS,
  HEATMAP_HOURS,
  marginalClassEconomics,
  recommendCapacityStrategy,
} from "@/lib/capacity-planner";
import { SATURATION_THRESHOLDS } from "@/lib/thresholds";

export default function CapacityPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  const cap = params.capacity;
  const horizonYears = params.timeline.horizonYears;
  const fyLabels = result.fyLabels;
  const areas = cap?.areas ?? DEFAULT_AREAS;
  const schedule = cap?.weeklySchedule ?? DEFAULT_SCHEDULE;
  const scaleByFy = cap?.scaleByFy ?? new Array(horizonYears).fill(1);
  const demandMatrix = cap?.demandHeatmap ?? defaultDemandHeatmap();
  const parallelMatrix = cap?.parallelByCellMatrix;
  const targetSat = cap?.targetSaturationPct ?? SATURATION_THRESHOLDS.defaultTarget;
  const personas = cap?.personas ?? [];
  const disciplineMatrix = cap?.disciplineByCellMatrix;
  const sbt = cap?.sessionsByTenure;
  const cohortActive = params.subs.cohortModel?.enabled === true;
  const fallbackSessions = cap?.avgSessionsPerMonth ?? 8;

  // Choix sessions/mo : si sessionsByTenure défini → moyenne pondérée, sinon fallback
  const avgSessions = sbt
    ? avgSessionsWeighted(sbt, fallbackSessions, cohortActive)
    : personas.length > 0
      ? avgSessionsByPersona(personas)
      : fallbackSessions;

  // Saturation par FY (en utilisant heatmap + parallel matrix si dispo)
  const fyData = useMemo(() => {
    return fyLabels.map((label, fy) => {
      const memEnd = result.monthly[fy * 12 + 11]?.subsCount ?? 0;
      const legacyEnd = result.monthly[fy * 12 + 11]?.legacyCount ?? 0;
      const totalMembers = memEnd + legacyEnd;
      const scale = scaleByFy[fy] ?? 1;
      const heat = computeSaturationHeatmap(
        totalMembers,
        avgSessions,
        demandMatrix,
        areas,
        scale,
        parallelMatrix
      );
      const reco = recommendCapacityStrategy(heat, targetSat);
      return {
        fy,
        label,
        members: totalMembers,
        scale,
        avgSat: heat.avgSaturation,
        maxSat: heat.maxSaturation,
        totalDemand: heat.totalDemand,
        totalCapacity: heat.totalCapacity,
        recoType: reco.type,
        recoMessage: reco.message,
        recoScale: reco.suggestedScaleGlobal,
        hotCells: reco.hotCells.length,
      };
    });
  }, [
    fyLabels,
    result.monthly,
    scaleByFy,
    avgSessions,
    demandMatrix,
    areas,
    parallelMatrix,
    targetSat,
  ]);

  // Capacité courante (mode legacy global ou parallel matrix)
  const baseCap = parallelMatrix
    ? computeMonthlyCapacityFromMatrix(parallelMatrix, areas, 1)
    : computeMonthlyCapacitySlots(areas, schedule, 1);

  const hasPlanner = !!(cap?.areas && cap.weeklySchedule && cap.areas.length > 0);

  // Couverture personas (sat % weighted par share)
  const personaCoverage = useMemo(() => {
    if (personas.length === 0) return null;
    const totalShare = personas.reduce((s, p) => s + p.sharePct, 0);
    return personas.map((p) => ({
      id: p.id,
      name: p.name,
      sharePct: p.sharePct,
      avgSessions: p.avgSessionsPerMonth,
      // Sat moyenne pondérée par préférence horaire (heuristique simple : sat moyenne globale × poids préférences)
      // Pour V1 : utilise sat globale FY1 comme proxy
      satFy1: fyData[0]?.avgSat ?? 0,
      shareNorm: totalShare > 0 ? p.sharePct / totalShare : 0,
    }));
  }, [personas, fyData]);

  // Couverture disciplines (% créneaux taggés)
  const disciplineCoverage = useMemo(() => {
    if (!disciplineMatrix) return null;
    const counts: Record<string, number> = {};
    let totalActive = 0;
    let tagged = 0;
    for (let dow = 0; dow < disciplineMatrix.length; dow++) {
      for (let i = 0; i < disciplineMatrix[dow].length; i++) {
        const w = demandMatrix[dow]?.[i] ?? 0;
        if (w > 0) {
          totalActive += 1;
          const cell = disciplineMatrix[dow][i];
          if (cell) {
            tagged += 1;
            counts[cell] = (counts[cell] ?? 0) + 1;
          }
        }
      }
    }
    return { counts, totalActive, tagged };
  }, [disciplineMatrix, demandMatrix]);

  // Marginal economics
  const hourlyCost = cap?.marginalHourlyCostEur ?? 25;
  const sessionRevenue = cap?.marginalSessionRevenueEur ?? 12;
  const capPerHour = areas[0]?.capacity ?? 14;
  const econ = marginalClassEconomics(hourlyCost, capPerHour, sessionRevenue, 0.7);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capacité — Vue synthèse</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Synthèse haut niveau consommant <code>/capacity-planner</code> (heatmap, personas,
            disciplines, économie marginale). Pour modifier les hypothèses, utiliser{" "}
            <Link href="/capacity-planner" className="underline">
              Capacity planner
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScenarioSwitcher />
          <Link href="/capacity-planner">
            <Button variant="outline" size="sm" className="text-xs">
              Modifier <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Banner config */}
      {!hasPlanner ? (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="pt-5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-sm text-amber-900">
                Planning non configuré — utilise les valeurs par défaut
              </div>
              <p className="text-xs text-amber-900/80 mt-1">
                {areas.length} espace(s) {areas.map((a) => a.capacity).join(", ")} places ·{" "}
                {schedule.weekdayClassesPerArea} cours/jour ouvré +{" "}
                {schedule.weekendClassesPerArea} cours/jour weekend.
              </p>
            </div>
            <Link href="/capacity-planner">
              <Button size="sm" variant="outline" className="text-xs">
                Configurer
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* KPIs globaux */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Membres fin horizon"
          value={fmtNum(fyData[fyData.length - 1]?.members ?? 0)}
          sublabel={fyLabels[fyLabels.length - 1] ?? ""}
        />
        <KpiCard
          label="Sessions/mo moyennes"
          value={avgSessions.toFixed(1)}
          sublabel={
            sbt ? "par ancienneté" : personas.length > 0 ? "par personas" : "constant"
          }
        />
        <KpiCard
          label="Capacité base/mo"
          value={fmtNum(Math.round(baseCap))}
          sublabel={parallelMatrix ? "matrice cellule" : "planning uniforme"}
        />
        <KpiCard
          label="Cible saturation"
          value={`${(targetSat * 100).toFixed(0)}%`}
          sublabel="zone optimale"
        />
      </section>

      {/* Tableau saturation par FY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#D32F2F]" />
            Saturation par FY
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Saturation moyenne et pic calculées depuis la heatmap demande × planning hétérogène
            si défini. Reco engine identifie les FY en tension.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-2">FY</th>
                  <th className="text-right p-2">Membres</th>
                  <th className="text-right p-2">Scale</th>
                  <th className="text-right p-2">Sat moyenne</th>
                  <th className="text-right p-2">Sat pic</th>
                  <th className="text-right p-2">Cellules HOT</th>
                  <th className="text-left p-2">Verdict</th>
                  <th className="text-right p-2">Reco scale</th>
                </tr>
              </thead>
              <tbody>
                {fyData.map((d) => (
                  <tr key={d.fy} className="border-b">
                    <td className="p-2 font-medium">{d.label}</td>
                    <td className="p-2 text-right tabular-nums">{fmtNum(d.members)}</td>
                    <td className="p-2 text-right tabular-nums font-mono">
                      {d.scale.toFixed(2)}
                    </td>
                    <td
                      className={
                        "p-2 text-right tabular-nums font-mono " +
                        (d.avgSat > 1
                          ? "text-red-600 font-bold"
                          : d.avgSat >= targetSat
                            ? "text-emerald-700 font-semibold"
                            : "text-muted-foreground")
                      }
                    >
                      {fmtPct(d.avgSat, 0)}
                    </td>
                    <td
                      className={
                        "p-2 text-right tabular-nums font-mono " +
                        (d.maxSat > 1.2
                          ? "text-red-700 font-bold"
                          : d.maxSat > 1
                            ? "text-red-500 font-semibold"
                            : d.maxSat > targetSat
                              ? "text-amber-600"
                              : "text-emerald-700")
                      }
                    >
                      {fmtPct(d.maxSat, 0)}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {d.hotCells > 0 ? (
                        <span className="text-red-600 font-semibold">{d.hotCells}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="p-2">
                      <span
                        className={
                          "text-[10px] px-1.5 py-0.5 rounded font-semibold " +
                          (d.recoType === "ok"
                            ? "bg-emerald-100 text-emerald-800"
                            : d.recoType === "overflow"
                              ? "bg-red-100 text-red-800"
                              : d.recoType === "double-peaks"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800")
                        }
                      >
                        {d.recoType.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-right tabular-nums font-mono">
                      {d.recoScale ? d.recoScale.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            <strong>OK</strong> = sat dans cible · <strong>SCALE-GLOBAL</strong> = augmenter
            scale global · <strong>DOUBLE-PEAKS</strong> = doubler uniquement les pics
            (économique) · <strong>OVERFLOW</strong> = saturation &gt; 150%, capacité critique.
          </p>
        </CardContent>
      </Card>

      {/* Couverture personas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-[#D32F2F]" />
            Couverture personas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personaCoverage && personaCoverage.length > 0 ? (
            <div className="space-y-2">
              {personaCoverage.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 border rounded-md text-xs"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-muted-foreground text-[10px]">
                      Share {fmtPct(p.sharePct, 0)} · {p.avgSessions} sessions/mo
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Couverture FY1</div>
                    <div
                      className={
                        "font-mono font-semibold " +
                        (p.satFy1 > 1
                          ? "text-red-600"
                          : p.satFy1 > targetSat
                            ? "text-amber-600"
                            : "text-emerald-700")
                      }
                    >
                      {fmtPct(p.satFy1, 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              Aucun persona défini.{" "}
              <Link href="/capacity-planner" className="underline text-foreground">
                Configurer dans Capacity planner →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Couverture disciplines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#D32F2F]" />
            Couverture disciplines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {disciplineCoverage ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Créneaux taggés :{" "}
                  <strong className="text-foreground">
                    {disciplineCoverage.tagged}/{disciplineCoverage.totalActive}
                  </strong>{" "}
                  ({fmtPct(disciplineCoverage.tagged / Math.max(1, disciplineCoverage.totalActive), 0)})
                </span>
                {disciplineCoverage.tagged < disciplineCoverage.totalActive ? (
                  <span className="text-amber-700 text-[10px]">
                    {disciplineCoverage.totalActive - disciplineCoverage.tagged} créneau(x) non taggé(s)
                  </span>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINES.map((d) => {
                  const n = disciplineCoverage.counts[d.id] ?? 0;
                  if (n === 0) return null;
                  return (
                    <span
                      key={d.id}
                      className="text-[10px] px-2 py-1 rounded font-mono"
                      style={{ backgroundColor: `${d.color}20`, color: d.color }}
                    >
                      {d.label}: {n}
                    </span>
                  );
                })}
              </div>
              {/* Disciplines présentes mais 0 créneau */}
              <div className="flex flex-wrap gap-1 mt-2">
                {DISCIPLINES.filter((d) => !(disciplineCoverage.counts[d.id] > 0)).map((d) => (
                  <span
                    key={d.id}
                    className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground italic line-through"
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              Aucun tag discipline.{" "}
              <Link href="/capacity-planner" className="underline text-foreground">
                Configurer dans Capacity planner →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Économie marginale */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#D32F2F]" />
            Économie marginale d&apos;un cours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <KpiCard label="Coût coach/h" value={`${hourlyCost.toFixed(0)}€`} small />
            <KpiCard label="Revenu max" value={`${(sessionRevenue * capPerHour).toFixed(0)}€`} small />
            <KpiCard
              label="Break-even fill"
              value={`${(econ.breakevenFillRate * 100).toFixed(0)}%`}
              small
            />
            <KpiCard label="Capa /cours" value={`${capPerHour}`} small />
          </div>
          <div
            className={
              "p-2 text-xs rounded border-l-4 " +
              (econ.breakevenFillRate <= 0.5
                ? "border-emerald-600 bg-emerald-50"
                : econ.breakevenFillRate <= 0.7
                  ? "border-amber-600 bg-amber-50"
                  : "border-red-600 bg-red-50")
            }
          >
            <strong>
              {econ.breakevenFillRate <= 0.5
                ? "Très rentable"
                : econ.breakevenFillRate <= 0.7
                  ? "Rentable si >70% rempli"
                  : "Marginal"}
            </strong>{" "}
            — ouvrir un cours additionnel devient rentable à partir de{" "}
            <strong>{(econ.breakevenFillRate * 100).toFixed(0)}%</strong> de remplissage.
          </div>
        </CardContent>
      </Card>

      {/* Reco engine global multi-FY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-[#D32F2F]" />
            Recommandation engine — synthèse multi-FY
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fyData.map((d) => (
            <div
              key={d.fy}
              className={
                "p-2 text-xs rounded border-l-4 flex items-start gap-2 " +
                (d.recoType === "ok"
                  ? "border-emerald-600 bg-emerald-50"
                  : d.recoType === "overflow"
                    ? "border-red-600 bg-red-50"
                    : "border-amber-600 bg-amber-50")
              }
            >
              <CalendarClock className="h-3 w-3 mt-0.5 shrink-0" />
              <div className="flex-1">
                <strong>{d.label}</strong> — {d.recoMessage}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CTA modifier */}
      <Card className="border-dashed bg-muted/10">
        <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <CalendarClock className="h-6 w-6 text-[#D32F2F] mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Pour ajuster les hypothèses</div>
              <p className="text-xs text-muted-foreground">
                Heatmap demande, planning hétérogène, personas, disciplines, économie marginale —
                tout est dans <code>/capacity-planner</code>.
              </p>
            </div>
          </div>
          <Link href="/capacity-planner">
            <Button>
              Capacity planner <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  small = false,
}: {
  label: string;
  value: string;
  sublabel?: string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className={small ? "pt-3 pb-3" : "pt-5"}>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={(small ? "text-base" : "text-2xl") + " font-bold mt-1 font-mono"}>
          {value}
        </div>
        {sublabel ? (
          <div className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
