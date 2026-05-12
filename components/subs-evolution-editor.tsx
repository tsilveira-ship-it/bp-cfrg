"use client";
import { useMemo } from "react";
import { ParamNumber } from "@/components/param-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fmtNum } from "@/lib/format";
import { buildTimeline, type ModelParams } from "@/lib/model/types";
import {
  solveAcquisitionsFromNetTarget,
  computeModel,
  expectedRetentionMonths,
  monthlyFunnel,
} from "@/lib/model/compute";
import { Sparkles, Layers } from "lucide-react";

type Props = {
  params: ModelParams;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
  patch: (path: string, value: unknown) => void;
};

export function SubsEvolutionEditor({ params, setParams, patch }: Props) {
  const { subs, timeline } = params;
  const tl = buildTimeline(timeline.startYear, timeline.horizonYears);
  const growths = subs.growthRates ?? [];

  // Trajectoire RÉELLE issue de computeModel : intègre cohort, churn par tier,
  // courbe rétention, legacy multi-cohortes, bilan funnel, mix évolutif, pause, etc.
  const result = useMemo(() => computeModel(params), [params]);

  // Séries mensuelles (new subs / legacy / total)
  const series = useMemo(() => {
    const newSubs: number[] = [];
    const legacy: number[] = [];
    const total: number[] = [];
    for (const m of result.monthly) {
      newSubs.push(m.subsCount);
      legacy.push(m.legacyCount);
      total.push(m.subsCount + m.legacyCount);
    }
    return { newSubs, legacy, total };
  }, [result]);

  // Niveau 6 — Séries dérivées pour le live preview multipanel.
  // Permet à l'utilisateur de voir l'impact de chaque levier (cohort, churn, mix, pause)
  // sur revenu / saturation capacité / cumul EBITDA / LTV-CAC en parallèle des counts.
  const derivedSeries = useMemo(() => {
    const revenue = result.monthly.map((m) => m.totalRevenue);
    const ebitda = result.monthly.map((m) => m.ebitda);
    const cumEbitda: number[] = [];
    let acc = 0;
    for (const e of ebitda) {
      acc += e;
      cumEbitda.push(acc);
    }
    // Saturation projetée si params.capacity défini. Sinon série de zéros.
    const cap = params.capacity;
    const saturation: number[] = result.monthly.map((m, idx) => {
      if (!cap || !cap.avgSessionsPerMonth) return 0;
      const demand = (m.subsCount + m.legacyCount) * cap.avgSessionsPerMonth;
      // Approx capacity offered: parallelClasses × capacityPerClass × ~30 cours/mois × scaleByFy
      const fy = Math.floor(idx / 12);
      const scale = cap.scaleByFy?.[fy] ?? 1;
      const capPerHour = (cap.parallelClasses ?? 1) * (cap.capacityPerClass ?? 14);
      // Hypothèse simplifiée: 30 créneaux/sem × 4.3 sem/mois = 129 créneaux/mois
      const offered = capPerHour * 129 * scale;
      return offered > 0 ? demand / offered : 0;
    });
    return { revenue, cumEbitda, saturation };
  }, [result, params.capacity]);

  // Counts fin de FY (mois 11, 23, 35, ...) — par série
  const endCountsByKind = useMemo(() => {
    const fyEnd = (arr: number[]) => {
      const out: number[] = [];
      for (let fy = 0; fy < tl.horizonYears; fy++) {
        const idx = fy * 12 + 11;
        out.push(arr[idx] ?? arr[arr.length - 1] ?? 0);
      }
      return out;
    };
    return {
      newSubs: fyEnd(series.newSubs),
      legacy: fyEnd(series.legacy),
      total: fyEnd(series.total),
    };
  }, [series, tl.horizonYears]);

  // Backward-compat alias utilisé par section "Croissance annuelle"
  const endCounts = endCountsByKind.newSubs;

  const startCounts = {
    newSubs: series.newSubs[0] ?? 0,
    legacy: series.legacy[0] ?? 0,
    total: series.total[0] ?? 0,
  };

  const sparkW = 100;
  const sparkH = 32;
  const max = Math.max(...series.total, 1);
  const xAt = (i: number) => (i * sparkW) / Math.max(1, series.total.length - 1);
  const yAt = (v: number) => sparkH - (v / max) * sparkH;
  const linePath = (arr: number[]) => arr.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  const totalPoints = linePath(series.total);
  const newPoints = linePath(series.newSubs);
  const legacyPoints = linePath(series.legacy);
  // Stacked area new (au-dessus de legacy) : path remontant new+legacy puis redescendant legacy
  const stackedAreaPath = useMemo(() => {
    const top = series.total.map((_, i) => `${xAt(i)},${yAt(series.total[i])}`);
    const bottom = series.legacy
      .map((_, i) => `${xAt(series.total.length - 1 - i)},${yAt(series.legacy[series.total.length - 1 - i])}`);
    return `M ${top.join(" L ")} L ${bottom.join(" L ")} Z`;
  }, [series]);

  // Mode actif (pour banner contextuel)
  const cohortEnabled = subs.cohortModel?.enabled === true;
  const bilanEnabled = subs.bilanFunnel?.enabled === true;
  const hasLegacyCohorts = (params.legacy.cohorts?.length ?? 0) > 0;
  const hasTierChurn = subs.tiers.some((t) => t.monthlyChurnPct !== undefined);
  const modeBadges: string[] = [];
  if (cohortEnabled) modeBadges.push("Cohort");
  if (bilanEnabled) modeBadges.push("Bilan funnel");
  if (hasLegacyCohorts) modeBadges.push("Legacy multi-cohortes");
  if (hasTierChurn) modeBadges.push("Churn/tier");
  if (subs.cohortModel?.retentionCurve) modeBadges.push("Courbe rétention");
  if (subs.avgMonthlyPausePct) modeBadges.push("Pause/freeze");

  const applyAll = (pct: number) => {
    setParams((p) => ({
      ...p,
      subs: {
        ...p.subs,
        growthRates: (p.subs.growthRates ?? []).map(() => pct),
      },
    }));
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">Tarification</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ParamNumber
            path="subs.vatRate"
            label="TVA"
            value={subs.vatRate ?? 0.20}
            unit="%"
            step={0.5}
            hint="Modèle CA = HT = TTC ÷ (1+TVA)"
          />
          <ParamNumber
            path="subs.priceIndexPa"
            label="Indexation tarifs / an"
            value={subs.priceIndexPa}
            unit="%"
            step={0.5}
            hint="Hausse annuelle composée"
          />
        </div>
      </section>

      {/* Sections legacy : ramp NET + growthRates. Collapsed par défaut quand cohort actif
          (= cas recommandé). Conservées pour rétro-compat scénarios anciens et pour seed
          du bouton "Seed depuis cible NET" du cohort. Marquage deprecated visible. */}
      <details open={!cohortEnabled} className="border border-dashed rounded-md">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/30">
          Mode NET legacy — Ramp + growthRates {cohortEnabled ? "(ignoré, cohort actif)" : "(actif)"}
        </summary>
        <div className="p-3 space-y-4 border-t">
          {cohortEnabled ? (
            <div className="text-[11px] bg-amber-50 border border-amber-300 rounded p-2 space-y-1">
              <div>
                <strong className="text-amber-800">Pas d'impact direct sur le compute</strong> —
                en mode cohort actif, <code>compute.ts</code> ignore <code>rampStartCount</code>,
                <code> rampEndCount</code> et <code>growthRates</code> pour la trajectoire d'abos.
              </div>
              <div>
                Ces valeurs restent utilisées par : (a) le bouton <em>Seed depuis cible NET</em>
                du mode cohort (Little's law <code>rampEndCount × churn</code>), (b) les métriques
                dérivées d'audit (CAC implicite Y1 = budget marketing × 12 ÷ <code>rampEnd − rampStart</code>),
                (c) le moteur de stress tests (driver <code>rampStart/rampEnd</code>). Si tu modifies
                ces 3 valeurs, mets-les en cohérence avec ta trajectoire cohort pour que les KPIs
                d'audit restent lisibles.
              </div>
            </div>
          ) : (
            <div className="text-[11px] bg-amber-50 border border-amber-300 rounded p-2">
              <strong className="text-amber-800">Mode NET legacy actif</strong> — interpolation
              linéaire entre <code>rampStartCount</code> et <code>rampEndCount</code> puis
              croissance FY-over-FY. Recommandé : activer <em>Mode cohort</em> ci-dessous pour
              piloter par acquisitions brutes (modélisation plus défendable).
            </div>
          )}

          <section className={cohortEnabled ? "opacity-60" : ""}>
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-heading text-xs font-semibold uppercase tracking-wider">
                Ramp NET {tl.fyLabels[0]} ({tl.monthLabels[0]} → {tl.monthLabels[11]})
              </h5>
              <span className="text-[10px] text-muted-foreground">
                +{fmtNum(subs.rampEndCount - subs.rampStartCount)} membres en 12 mois
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ParamNumber
                path="subs.rampStartCount"
                label={`Membres ${tl.monthLabels[0]}`}
                value={subs.rampStartCount}
              />
              <ParamNumber
                path="subs.rampEndCount"
                label={`Membres ${tl.monthLabels[11]} (cible)`}
                value={subs.rampEndCount}
              />
            </div>
          </section>

          <section className={cohortEnabled ? "opacity-60" : ""}>
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-heading text-xs font-semibold uppercase tracking-wider">
                Croissance NET {tl.fyLabels[1] ?? ""} → {tl.fyLabels[tl.horizonYears - 1] ?? ""}
              </h5>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => applyAll(0.20)} disabled={cohortEnabled} className="text-[10px] h-6">
                  20%
                </Button>
                <Button variant="ghost" size="sm" onClick={() => applyAll(0.10)} disabled={cohortEnabled} className="text-[10px] h-6">
                  10%
                </Button>
                <Button variant="ghost" size="sm" onClick={() => applyAll(0)} disabled={cohortEnabled} className="text-[10px] h-6">
                  0%
                </Button>
              </div>
            </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {growths.map((g, idx) => (
            <div
              key={idx}
              className={`p-3 border rounded-md space-y-2 ${cohortEnabled ? "bg-muted/10" : "bg-muted/20"}`}
            >
              <Label className="text-xs font-medium">Croissance {tl.fyLabels[idx + 1]}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step={1}
                  value={(g * 100).toFixed(1).replace(/\.0$/, "")}
                  disabled={cohortEnabled}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      subs: {
                        ...p.subs,
                        growthRates: (p.subs.growthRates ?? []).map((x, i) =>
                          i === idx ? (parseFloat(e.target.value) || 0) / 100 : x
                        ),
                      },
                    }))
                  }
                  className="pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                Fin {tl.fyLabels[idx + 1]}: <span className="font-semibold text-foreground">{fmtNum(endCounts[idx + 1])}</span>
              </div>
            </div>
          ))}
        </div>
          </section>
        </div>
      </details>

      <CohortModelSection params={params} setParams={setParams} />
      <AdvancedSubsSection params={params} setParams={setParams} />

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
              Saisonnalité & rétention
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modulation mensuelle (saisonnalité) + churn cohort. Permet de modéliser creux été / pic
              septembre.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  subs: {
                    ...p.subs,
                    seasonality: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                  },
                }))
              }
              className="text-xs h-7"
            >
              Plat (1.0)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  subs: {
                    ...p.subs,
                    seasonality: [1.20, 1.05, 1.0, 0.85, 1.15, 1.05, 1.0, 0.95, 0.90, 0.80, 0.65, 0.60],
                  },
                }))
              }
              className="text-xs h-7"
            >
              Standard
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5 mb-3">
          {["Sept", "Oct", "Nov", "Déc", "Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août"].map((mlabel, idx) => {
            const v = subs.seasonality?.[idx] ?? 1;
            return (
              <div key={mlabel} className="space-y-1">
                <Label className="text-[10px] block text-center">{mlabel}</Label>
                <Input
                  type="number"
                  step="0.05"
                  className="h-8 px-1 text-xs text-center"
                  value={v}
                  onChange={(e) =>
                    setParams((p) => {
                      const arr = [...(p.subs.seasonality ?? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])];
                      arr[idx] = parseFloat(e.target.value) || 0;
                      return { ...p, subs: { ...p.subs, seasonality: arr } };
                    })
                  }
                />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Churn mensuel global</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                value={((subs.monthlyChurnPct ?? 0) * 100).toFixed(2)}
                onChange={(e) =>
                  patch("subs.monthlyChurnPct", (parseFloat(e.target.value) || 0) / 100)
                }
                className="pr-7"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              <strong>Source unique du churn.</strong> Appliqué à tous les tiers sans override.
              0% = rétention parfaite. 2-3%/mois = standard fitness. Override par tier dispo dans
              la section <em>Tiers d'abonnement</em> (bouton « + Override »).
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <a
                href="/sensitivity"
                title="Voir l'impact d'une variation ±20% sur churn"
                className="inline-flex items-center h-6 px-2 text-[10px] rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              >
                → Tester ±20%
              </a>
              <a
                href="/sensitivity#tornado"
                title="Voir la décomposition des leviers (tornado)"
                className="inline-flex items-center h-6 px-2 text-[10px] rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              >
                → Voir tornado
              </a>
              <a
                href="/capacity-planner"
                title="Voir l'impact capacité"
                className="inline-flex items-center h-6 px-2 text-[10px] rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              >
                → Impact capacité
              </a>
            </div>
          </div>
          <div className="text-xs text-muted-foreground p-3 border rounded bg-muted/20">
            Rétention équivalente:{" "}
            <span className="font-semibold text-foreground">
              {(() => {
                const curve = subs.cohortModel?.retentionCurve;
                const churn = subs.monthlyChurnPct ?? 0;
                if (curve && curve.length > 0) {
                  const months = expectedRetentionMonths(churn, curve);
                  return `~${months.toFixed(0)} mois (intégrale courbe)`;
                }
                if (churn > 0) return `~${(1 / churn).toFixed(0)} mois (1/churn)`;
                return "infini (pas de churn)";
              })()}
            </span>
            {subs.cohortModel?.retentionCurve ? (
              <p className="text-[10px] text-muted-foreground mt-1">
                Calcul depuis la courbe empirique (Σ rétention[t]) — pas <code>1/churn</code>.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
              Aperçu trajectoire RÉELLE ({tl.horizonMonths} mois)
            </h4>
          </div>
          <div className="flex flex-wrap gap-1">
            {modeBadges.length > 0 ? (
              modeBadges.map((b) => (
                <span
                  key={b}
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-brand-red,#D32F2F)]/10 text-[var(--color-brand-red,#D32F2F)] font-semibold"
                >
                  {b}
                </span>
              ))
            ) : (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                Mode NET legacy
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground -mt-1 mb-2">
          Trajectoire calculée par <code>computeModel</code> — intègre tous les overrides
          actifs (cohort, churn par tier, courbe rétention, legacy multi-cohortes, bilan
          funnel, mix évolutif, pause).
        </p>
        <div className="border rounded-md p-3 bg-muted/10">
          {/* Légende */}
          <div className="flex items-center gap-3 mb-2 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-sm bg-[#D32F2F]/30 border border-[#D32F2F]" />
              <span className="text-muted-foreground">Nouveaux</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-2 rounded-sm bg-slate-400/30 border border-slate-500" />
              <span className="text-muted-foreground">Legacy</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 bg-[#D32F2F]" />
              <span className="text-muted-foreground">Total</span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${sparkW} ${sparkH}`}
            preserveAspectRatio="none"
            className="w-full h-20"
          >
            {/* Aire stack new (entre legacy et total) */}
            <path d={stackedAreaPath} fill="#D32F2F" fillOpacity="0.15" stroke="none" />
            {/* Ligne legacy */}
            <polyline fill="none" stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="1 0.8" points={legacyPoints} />
            {/* Aire legacy = remplie sous la courbe legacy */}
            <path
              d={`M ${xAt(0)},${sparkH} L ${legacyPoints} L ${xAt(series.legacy.length - 1)},${sparkH} Z`}
              fill="#94a3b8"
              fillOpacity="0.20"
              stroke="none"
            />
            {/* Ligne total (rouge plein) */}
            <polyline fill="none" stroke="#D32F2F" strokeWidth="0.9" points={totalPoints} />
            {/* Ligne new (rouge clair) */}
            <polyline fill="none" stroke="#D32F2F" strokeWidth="0.5" strokeOpacity="0.5" points={newPoints} />
            {/* Verticales fin de FY */}
            {Array.from({ length: tl.horizonYears - 1 }, (_, i) => i + 1).map((fy) => (
              <line
                key={fy}
                x1={(fy * 12 * sparkW) / Math.max(1, series.total.length - 1)}
                y1={0}
                x2={(fy * 12 * sparkW) / Math.max(1, series.total.length - 1)}
                y2={sparkH}
                stroke="#e5e5e5"
                strokeWidth="0.3"
                strokeDasharray="1 1"
              />
            ))}
          </svg>
          <div
            className="grid gap-1 text-[10px] text-muted-foreground mt-2 text-center"
            style={{ gridTemplateColumns: `repeat(${tl.horizonYears + 1}, 1fr)` }}
          >
            <div>
              <div className="text-muted-foreground/80">{tl.monthLabels[0]}</div>
              <div className="font-mono leading-tight mt-0.5">
                <div className="text-[var(--color-brand-red,#D32F2F)]">{fmtNum(startCounts.newSubs)}</div>
                <div className="text-slate-500">+{fmtNum(startCounts.legacy)}</div>
                <div className="text-foreground font-semibold border-t border-muted-foreground/30 pt-0.5">
                  {fmtNum(startCounts.total)}
                </div>
              </div>
            </div>
            {tl.fyLabels.map((lbl, i) => (
              <div key={lbl}>
                <div className="text-muted-foreground/80">Fin {lbl}</div>
                <div className="font-mono leading-tight mt-0.5">
                  <div className="text-[var(--color-brand-red,#D32F2F)]">
                    {fmtNum(endCountsByKind.newSubs[i] ?? 0)}
                  </div>
                  <div className="text-slate-500">+{fmtNum(endCountsByKind.legacy[i] ?? 0)}</div>
                  <div className="text-foreground font-semibold border-t border-muted-foreground/30 pt-0.5">
                    {fmtNum(endCountsByKind.total[i] ?? 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Niveau 6 — multipanel preview : revenue / saturation / cumul EBITDA
            Permet de voir en un coup d'œil l'impact de toute modification cohort/churn
            /mix sur les 3 métriques clés en plus du count. */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <MiniPanel
            title="Revenu / mois (HT)"
            values={derivedSeries.revenue}
            color="#0EA5E9"
            fyLabels={tl.fyLabels}
            fmt={(v) => `${(v / 1000).toFixed(0)}k€`}
          />
          <MiniPanel
            title="Saturation capacité"
            values={derivedSeries.saturation}
            color={params.capacity ? "#F59E0B" : "#cbd5e1"}
            fyLabels={tl.fyLabels}
            fmt={(v) => `${(v * 100).toFixed(0)}%`}
            referenceLine={1}
            disabled={!params.capacity}
            disabledHint="Définis params.capacity pour activer"
          />
          <MiniPanel
            title="EBITDA cumulé (break-even)"
            values={derivedSeries.cumEbitda}
            color="#10B981"
            fyLabels={tl.fyLabels}
            fmt={(v) => `${(v / 1000).toFixed(0)}k€`}
            referenceLine={0}
          />
        </div>
      </section>
    </div>
  );
}

/**
 * Mini sparkline panel — affichage compact d'une série mensuelle avec marqueurs FY,
 * ligne de référence optionnelle (ex: 100% saturation, 0€ break-even), label valeur fin.
 * Volontairement décoré minimal : 3 panels côte-à-côte sous le graph count principal.
 */
function MiniPanel({
  title,
  values,
  color,
  fyLabels,
  fmt,
  referenceLine,
  disabled,
  disabledHint,
}: {
  title: string;
  values: number[];
  color: string;
  fyLabels: string[];
  fmt: (v: number) => string;
  referenceLine?: number;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const W = 100;
  const H = 30;
  const vMin = Math.min(...values, referenceLine ?? Infinity, 0);
  const vMax = Math.max(...values, referenceLine ?? -Infinity, 1);
  const range = Math.max(1e-9, vMax - vMin);
  const xAt = (i: number) => (i * W) / Math.max(1, values.length - 1);
  const yAt = (v: number) => H - ((v - vMin) / range) * H;
  const points = values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  const refY = referenceLine !== undefined ? yAt(referenceLine) : null;
  const last = values[values.length - 1] ?? 0;
  return (
    <div
      className={"border rounded-md p-2 bg-background " + (disabled ? "opacity-50" : "")}
      title={disabled ? disabledHint : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</div>
        <div className="text-[11px] font-mono font-semibold text-foreground">{fmt(last)}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-10">
        {refY !== null ? (
          <line x1={0} y1={refY} x2={W} y2={refY} stroke="#9ca3af" strokeWidth="0.3" strokeDasharray="1 1" />
        ) : null}
        {Array.from({ length: fyLabels.length - 1 }, (_, i) => i + 1).map((fy) => (
          <line
            key={fy}
            x1={(fy * 12 * W) / Math.max(1, values.length - 1)}
            x2={(fy * 12 * W) / Math.max(1, values.length - 1)}
            y1={0}
            y2={H}
            stroke="#e5e5e5"
            strokeWidth="0.2"
            strokeDasharray="0.5 0.5"
          />
        ))}
        <polyline fill="none" stroke={color} strokeWidth="0.8" points={points} />
      </svg>
    </div>
  );
}

function CohortModelSection({
  params,
  setParams,
}: {
  params: ModelParams;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
}) {
  const cm = params.subs.cohortModel;
  const enabled = cm?.enabled === true;
  const churn = params.subs.monthlyChurnPct ?? 0;
  const horizonYears = params.timeline.horizonYears;

  // Helper : valeur acquisitionByFy[fy] avec fallback ramp legacy si tableau absent.
  // L'utilisateur voit toujours quelque chose même sur un scénario ancien non migré.
  const getAcqFy = (fy: number): number => {
    if (!cm) return 0;
    if (Array.isArray(cm.acquisitionByFy) && cm.acquisitionByFy[fy] !== undefined) {
      return cm.acquisitionByFy[fy];
    }
    // Fallback rétro-compat : approx depuis ramp legacy
    if (fy === 0) return (cm.acquisitionStart + cm.acquisitionEnd) / 2;
    let cur = (cm.acquisitionStart + cm.acquisitionEnd) / 2;
    for (let i = 1; i <= fy; i++) {
      const g = cm.acquisitionGrowthByFy[i - 1] ?? 0;
      cur = cur * (1 + g);
    }
    return cur;
  };

  const setAcqFy = (fy: number, value: number) => {
    setParams((p) => {
      const existing = p.subs.cohortModel;
      if (!existing) return p;
      const Y = p.timeline.horizonYears;
      const arr = Array.isArray(existing.acquisitionByFy)
        ? [...existing.acquisitionByFy]
        : new Array(Y).fill(0).map((_, i) => getAcqFy(i));
      while (arr.length < Y) arr.push(arr[arr.length - 1] ?? 0);
      arr[fy] = value;
      return {
        ...p,
        subs: {
          ...p.subs,
          cohortModel: { ...existing, acquisitionByFy: arr },
        },
      };
    });
  };

  const setEnabled = (next: boolean) => {
    setParams((p) => {
      const existing = p.subs.cohortModel;
      const Y = p.timeline.horizonYears;
      if (next) {
        // Seed depuis ramp legacy si on a quelque chose, sinon depuis Little's law
        // (rampStart × churn) pour démarrer avec une valeur sensée.
        const churnRate = p.subs.monthlyChurnPct ?? 0.025;
        const baseAcq = existing?.acquisitionByFy?.[0]
          ?? Math.max(1, Math.round(p.subs.rampStartCount * churnRate));
        const acqByFy = existing?.acquisitionByFy
          ?? new Array(Y).fill(baseAcq).map((v, i) => v * Math.pow(1.1, i));
        return {
          ...p,
          subs: {
            ...p.subs,
            cohortModel: {
              enabled: true,
              acquisitionByFy: acqByFy,
              acquisitionStart: existing?.acquisitionStart ?? acqByFy[0],
              acquisitionEnd: existing?.acquisitionEnd ?? acqByFy[0],
              acquisitionGrowthByFy:
                existing?.acquisitionGrowthByFy ?? new Array(Math.max(0, Y - 1)).fill(0.1),
              acquisitionSeasonality: existing?.acquisitionSeasonality,
              retentionCurve: existing?.retentionCurve,
            },
          },
        };
      }
      return {
        ...p,
        subs: {
          ...p.subs,
          cohortModel: existing ? { ...existing, enabled: false } : undefined,
        },
      };
    });
  };

  // Auto-calc depuis Little's law sur cible NET legacy (si présente) — produit une valeur
  // d'acquisitions/mois plate qui maintient le stock cible. L'utilisateur affine ensuite.
  const autoCalcFromTarget = () => {
    const targetNet = params.subs.rampEndCount > 0 ? params.subs.rampEndCount : 200;
    const churnRate = params.subs.monthlyChurnPct ?? 0.025;
    const acqSteady = Math.max(
      1,
      Math.round(solveAcquisitionsFromNetTarget(targetNet, churnRate) * 10) / 10
    );
    setParams((p) => {
      const existing = p.subs.cohortModel;
      const Y = p.timeline.horizonYears;
      // Cible NET croît avec growthRates → on applique le même taux aux acquisitions.
      const arr = new Array<number>(Y).fill(acqSteady);
      const growthRates = p.subs.growthRates ?? [];
      let cur = acqSteady;
      for (let i = 1; i < Y; i++) {
        const g = growthRates[i - 1] ?? 0;
        cur = cur * (1 + g);
        arr[i] = Math.round(cur * 10) / 10;
      }
      return {
        ...p,
        subs: {
          ...p.subs,
          cohortModel: {
            enabled: true,
            acquisitionByFy: arr,
            acquisitionStart: existing?.acquisitionStart ?? arr[0],
            acquisitionEnd: existing?.acquisitionEnd ?? arr[0],
            acquisitionGrowthByFy:
              existing?.acquisitionGrowthByFy ?? new Array(Math.max(0, Y - 1)).fill(0.1),
            acquisitionSeasonality: existing?.acquisitionSeasonality,
            retentionCurve: existing?.retentionCurve,
          },
        },
      };
    });
  };

  return (
    <section className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-muted/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--color-brand-red,#D32F2F)]" />
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
              Mode cohort (acquisitions brutes)
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modélisation explicite acquisition × rétention. Désactivé = cible NET legacy.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="cohort-toggle" className="text-xs">
            {enabled ? "Activé" : "Désactivé"}
          </Label>
          <Switch
            id="cohort-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </div>

      {enabled && cm ? (
        <div className="space-y-4">
          <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 rounded p-2">
            <strong>Mode cohort actif</strong> — les champs <code>rampStart/rampEnd</code> et{" "}
            <code>growthRates</code> ci-dessus sont <em>ignorés</em>. La trajectoire est calculée
            depuis les acquisitions mensuelles brutes ci-dessous, puis chaque cohorte décroît au
            taux <code>{(churn * 100).toFixed(2)}%</code>/mois.
            <span className="block mt-1 text-amber-600">
              Le mix tier (illimité / 12 séances / 8 séances / etc.) est appliqué automatiquement
              aux acquisitions via <code>subs.tiers[].mixPct</code> (ou <code>mixPctByFy</code>
              {" "}pour un mix évolutif). Aucune ramp interne : 1 valeur d'acquisition par FY,
              constante intra-FY, modulée par la saisonnalité mensuelle.
            </span>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">
              Acquisitions brutes / mois par FY (valeur constante intra-FY)
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {Array.from({ length: horizonYears }, (_, fy) => {
                const fyLabel = `FY${(params.timeline.startYear + fy) % 100}`;
                const v = getAcqFy(fy);
                return (
                  <div key={fy} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{fyLabel}</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={v.toFixed(1).replace(/\.0$/, "")}
                      onChange={(e) => setAcqFy(fy, parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs text-center"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Acquisitions brutes mensuelles par année (avant churn). La saisonnalité mensuelle
              (subs.seasonality, ex Sept ×1.20 / Août ×0.60) module ces valeurs au calcul. Pas
              de ramp interne : le mois d'ouverture vaut le mois 11 du FY0, lissés par la
              saisonnalité. Plus simple, plus défendable.
            </p>
          </div>

          <RetentionCurveEditor cm={cm} setParams={setParams} fallbackChurn={churn} />

          <BilanFunnelEditor params={params} setParams={setParams} />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={autoCalcFromTarget}
              className="text-xs h-7"
              title="Seed acquisitions/mois par FY depuis cible NET × churn (Little's law) puis applique growthRates aux FY suivants. Utile pour partir d'une valeur défendable."
            >
              Seed depuis cible NET ({fmtNum(params.subs.rampEndCount)} membres × churn)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="text-xs h-7 cursor-not-allowed opacity-50"
              title="Bientôt dispo — extraction depuis crm.prospects + payments"
            >
              Importer dashboard CRM (V2)
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Activer pour modéliser l&apos;acquisition mensuelle indépendamment de la rétention.
          Utile pour calibrer CAC, modéliser scénarios churn, et simuler le funnel Bilan → abo.
        </p>
      )}
    </section>
  );
}

function AdvancedSubsSection({
  params,
  setParams,
}: {
  params: ModelParams;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
}) {
  const subs = params.subs;
  // Niveau 6 — `acquisitionChannels` retiré : remplacé par le funnel concret leadFunnel
  // (lead → appel → bilan → abo + coût horaire freelance) dans BilanFunnelEditor.
  const seasAcqEnabled = !!subs.seasonalityAcquisition;
  const seasChurnEnabled = !!subs.seasonalityChurn;

  const toggleSeasAcq = (next: boolean) => {
    setParams((p) => {
      const baseline = p.subs.seasonality ?? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      return {
        ...p,
        subs: {
          ...p.subs,
          seasonalityAcquisition: next ? [...baseline] : undefined,
        },
      };
    });
  };

  const toggleSeasChurn = (next: boolean) => {
    setParams((p) => {
      const baseline = p.subs.seasonality ?? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      return {
        ...p,
        subs: {
          ...p.subs,
          seasonalityChurn: next ? [...baseline] : undefined,
        },
      };
    });
  };

  const updateSeasonality = (kind: "acq" | "churn", idx: number, val: number) => {
    setParams((p) => {
      const key = kind === "acq" ? "seasonalityAcquisition" : "seasonalityChurn";
      const arr = [...(p.subs[key] ?? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])];
      arr[idx] = val;
      return { ...p, subs: { ...p.subs, [key]: arr } };
    });
  };

  return (
    <section className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-muted/5 space-y-4">
      <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
        Niveau 6 — Saisonnalité différenciée + pause/freeze
      </h4>
      <p className="text-[10px] text-muted-foreground -mt-2">
        Funnel commercial concret (leads / appels / bilans / abos + coût freelance + ads) :
        voir la section <em>Funnel Bilan</em> dans Mode cohort ci-dessus.
      </p>

      {/* Pause/freeze */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-3">
        <div>
          <Label className="text-xs">Pause/freeze moyenne (% base)</Label>
          <div className="relative">
            <Input
              type="number"
              step="0.5"
              value={((subs.avgMonthlyPausePct ?? 0) * 100).toFixed(2)}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  subs: { ...p.subs, avgMonthlyPausePct: (parseFloat(e.target.value) || 0) / 100 },
                }))
              }
              className="pr-7"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              %
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Membres en pause ne paient pas mais ne sont pas churnés. CrossFit typique : 2-5%.
          </p>
        </div>
      </div>

      {/* Saisonnalité différenciée */}
      <div className="border-t pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Saisonnalité acquisition (override globale)</Label>
          <Switch checked={seasAcqEnabled} onCheckedChange={toggleSeasAcq} />
        </div>
        {seasAcqEnabled ? (
          <div className="grid grid-cols-6 lg:grid-cols-12 gap-1">
            {["Sept", "Oct", "Nov", "Déc", "Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août"].map((mlabel, idx) => (
              <div key={mlabel} className="space-y-0.5">
                <Label className="text-[9px] block text-center">{mlabel}</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={subs.seasonalityAcquisition?.[idx] ?? 1}
                  onChange={(e) => updateSeasonality("acq", idx, parseFloat(e.target.value) || 0)}
                  className="h-7 px-1 text-[10px] text-center"
                />
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label className="text-xs">Saisonnalité churn (multiplicateurs Sept→Août)</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Module le churn mensuel selon le mois calendaire. Ex: 1.5 en juillet = churn ×1.5
              pendant l'été (pratique courante CrossFit : départs été + reprise rentrée). Appliqué
              en mode cohort uniquement. <strong>Ignoré si une courbe de rétention est active</strong>
              {" "}(la courbe empirique override la modulation synthétique).
            </p>
          </div>
          <Switch checked={seasChurnEnabled} onCheckedChange={toggleSeasChurn} />
        </div>
        {seasChurnEnabled ? (
          <div className="grid grid-cols-6 lg:grid-cols-12 gap-1">
            {["Sept", "Oct", "Nov", "Déc", "Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août"].map((mlabel, idx) => (
              <div key={mlabel} className="space-y-0.5">
                <Label className="text-[9px] block text-center">{mlabel}</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={subs.seasonalityChurn?.[idx] ?? 1}
                  onChange={(e) => updateSeasonality("churn", idx, parseFloat(e.target.value) || 0)}
                  className="h-7 px-1 text-[10px] text-center"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

    </section>
  );
}

function BilanFunnelEditor({
  params,
  setParams,
}: {
  params: ModelParams;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
}) {
  // Funnel commercial pivot — toujours actif désormais. normalizeParams garantit
  // que bf.leadFunnel existe avec enabled=true. Plus de toggle visible.
  const bf = params.subs.bilanFunnel;

  const update = (patch: Partial<NonNullable<ModelParams["subs"]["bilanFunnel"]>>) => {
    setParams((p) => {
      const existing = p.subs.bilanFunnel;
      if (!existing) return p;
      return {
        ...p,
        subs: { ...p.subs, bilanFunnel: { ...existing, ...patch } },
      };
    });
  };

  if (!bf) return null;

  return (
    <div className="border rounded-md p-3 bg-muted/10 space-y-3">
      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wider">
          Funnel commercial — Acquisitions → Leads → Coûts
        </h5>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Pivot : la cible d&apos;acquisitions (saisie dans <em>Acquisitions par FY</em> du
          mode cohort) pilote les leads nécessaires + coûts freelance + ads. Remplace le
          budget marketing flat du P&L.
        </p>
      </div>

      <>
          {/* Prix bilan : toujours utile (revenu HT par bilan, modes pivot ET legacy). */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px]">Prix Bilan TTC (€)</Label>
              <Input
                type="number"
                step="0.10"
                value={bf.bilanPriceTTC}
                onChange={(e) => update({ bilanPriceTTC: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Revenu HT par bilan = TTC / (1 + TVA). Recouvre partiellement le coût marketing.
              </p>
            </div>
          </div>

          <LeadFunnelEditor params={params} setParams={setParams} />
        </>
    </div>
  );
}

type CohortModelInner = NonNullable<ModelParams["subs"]["cohortModel"]>;

const CURVE_ANCHORS = [0, 1, 3, 6, 12, 24] as const;
const CURVE_LENGTH = 25; // Mois 0..24

function buildCurveFromAnchors(anchors: Record<number, number>): number[] {
  // Interpolation linéaire entre les ancres connues, valeurs croissantes en t.
  const knownPoints = CURVE_ANCHORS.filter((t) => anchors[t] !== undefined && !isNaN(anchors[t]));
  if (knownPoints.length === 0) return [];
  const out = new Array<number>(CURVE_LENGTH).fill(0);
  for (let t = 0; t < CURVE_LENGTH; t++) {
    let lower = knownPoints[0];
    let upper = knownPoints[knownPoints.length - 1];
    for (let i = 0; i < knownPoints.length; i++) {
      if (knownPoints[i] <= t) lower = knownPoints[i];
      if (knownPoints[i] >= t) {
        upper = knownPoints[i];
        break;
      }
    }
    if (lower === upper) {
      out[t] = anchors[lower];
    } else {
      const span = upper - lower;
      const ratio = (t - lower) / span;
      out[t] = anchors[lower] + (anchors[upper] - anchors[lower]) * ratio;
    }
  }
  return out;
}

function RetentionCurveEditor({
  cm,
  setParams,
  fallbackChurn,
}: {
  cm: CohortModelInner;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
  fallbackChurn: number;
}) {
  const curve = cm.retentionCurve;
  const enabled = Array.isArray(curve) && curve.length > 0;

  // Pour UI: déduire valeurs aux ancres si curve définie, sinon défaut exp
  const anchorVals: Record<number, number> = {};
  for (const t of CURVE_ANCHORS) {
    if (enabled && curve && t < curve.length) {
      anchorVals[t] = curve[t];
    } else {
      anchorVals[t] = Math.pow(1 - fallbackChurn, t);
    }
  }

  const setEnabled = (next: boolean) => {
    setParams((p) => {
      const existing = p.subs.cohortModel;
      if (!existing) return p;
      if (next) {
        // Init courbe depuis exponentielle actuelle
        const churnRate = p.subs.monthlyChurnPct ?? 0.025;
        const initCurve = new Array(CURVE_LENGTH).fill(0).map((_, t) => Math.pow(1 - churnRate, t));
        return {
          ...p,
          subs: {
            ...p.subs,
            cohortModel: { ...existing, retentionCurve: initCurve },
          },
        };
      }
      const { retentionCurve: _drop, ...rest } = existing;
      return {
        ...p,
        subs: {
          ...p.subs,
          cohortModel: rest,
        },
      };
    });
  };

  const updateAnchor = (t: number, valuePct: number) => {
    setParams((p) => {
      const existing = p.subs.cohortModel;
      if (!existing) return p;
      const newAnchors: Record<number, number> = { ...anchorVals, [t]: Math.max(0, Math.min(1, valuePct / 100)) };
      const newCurve = buildCurveFromAnchors(newAnchors);
      return {
        ...p,
        subs: {
          ...p.subs,
          cohortModel: { ...existing, retentionCurve: newCurve },
        },
      };
    });
  };

  // SVG sparkline
  const W = 200;
  const H = 50;
  const series = enabled && curve ? curve : new Array(CURVE_LENGTH).fill(0).map((_, t) => Math.pow(1 - fallbackChurn, t));
  const points = series
    .map((v, i) => `${(i * W) / (CURVE_LENGTH - 1)},${H - v * H}`)
    .join(" ");

  return (
    <div className="border rounded-md p-3 bg-muted/10 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider">
            Courbe rétention non-exponentielle
          </h5>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Override la formule exp(1 - churn). Saisir % survivants à M0/M1/M3/M6/M12/M24.
            Interpolation linéaire entre points.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="curve-toggle" className="text-[10px]">
            {enabled ? "Activée" : "Désactivée"}
          </Label>
          <Switch id="curve-toggle" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {enabled ? (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {CURVE_ANCHORS.map((t) => (
              <div key={t} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">M{t}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.5"
                    value={(anchorVals[t] * 100).toFixed(1)}
                    onChange={(e) => updateAnchor(t, parseFloat(e.target.value) || 0)}
                    className="pr-6 h-8 text-xs"
                    disabled={t === 0}
                    title={t === 0 ? "M0 toujours 100%" : `% survivants au mois ${t}`}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Preset CrossFit (newbie drop M1-M3 puis stable)
                const cfPreset = buildCurveFromAnchors({ 0: 1, 1: 0.85, 3: 0.7, 6: 0.6, 12: 0.5, 24: 0.42 });
                setParams((p) => ({
                  ...p,
                  subs: {
                    ...p.subs,
                    cohortModel: p.subs.cohortModel ? { ...p.subs.cohortModel, retentionCurve: cfPreset } : p.subs.cohortModel,
                  },
                }));
              }}
              className="text-[10px] h-6"
            >
              Preset CrossFit (newbie drop)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Preset chain fitness (drop fort)
                const fitPreset = buildCurveFromAnchors({ 0: 1, 1: 0.7, 3: 0.45, 6: 0.30, 12: 0.18, 24: 0.10 });
                setParams((p) => ({
                  ...p,
                  subs: {
                    ...p.subs,
                    cohortModel: p.subs.cohortModel ? { ...p.subs.cohortModel, retentionCurve: fitPreset } : p.subs.cohortModel,
                  },
                }));
              }}
              className="text-[10px] h-6"
            >
              Preset chain (drop fort)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="text-[10px] h-6 cursor-not-allowed opacity-50"
              title="Bientôt dispo — calcul depuis crm.sessions"
            >
              Importer Javelot/ResaWod (V2)
            </Button>
          </div>

          <div className="border rounded p-2 bg-background">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="w-full h-12"
            >
              <polyline fill="none" stroke="#D32F2F" strokeWidth="1" points={points} />
              <line x1="0" y1={H * 0.5} x2={W} y2={H * 0.5} stroke="#e5e5e5" strokeWidth="0.3" strokeDasharray="1 1" />
              <text x="2" y={H * 0.5 - 1} fontSize="4" fill="#999">50%</text>
            </svg>
            <div className="grid grid-cols-6 gap-1 text-[9px] text-muted-foreground mt-1">
              {CURVE_ANCHORS.map((t) => (
                <div key={t} className="text-center">
                  <div>M{t}</div>
                  <div className="font-mono text-foreground">{(anchorVals[t] * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">
          Désactivée — rétention exponentielle (1 - churn)^t utilisée. Activer pour modéliser
          un newbie-drop ou une courbe empirique.
        </p>
      )}
    </div>
  );
}

/**
 * Niveau 6 — Funnel commercial concret : leads /mois → appels freelance → bilans → abos.
 *
 * 2 colonnes : saisie inputs à gauche, aperçu dérivé live à droite (calculé sur FY0).
 * Si activé, remplace `marketing.monthlyBudget` flat dans le P&L par
 *   freelance horaire + bonus bilan + bonus abo + ads
 * et dérive les bilans depuis les leads (override `monthlyBilansStart/End` ramp).
 */
function LeadFunnelEditor({
  params,
  setParams,
}: {
  params: ModelParams;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
}) {
  // Funnel pivot toujours actif — normalizeParams garantit la présence + enabled=true.
  const bf = params.subs.bilanFunnel;
  const lf = bf?.leadFunnel;
  const horizonYears = params.timeline.horizonYears;
  const fyLabels = buildTimeline(params.timeline.startYear, horizonYears).fyLabels;

  const horizonMonths = horizonYears * 12;
  const steps = useMemo(() => {
    if (!bf || !lf) return [];
    return monthlyFunnel(params, horizonMonths);
  }, [params, bf, lf, horizonMonths]);

  const annualByFy = useMemo(() => {
    if (steps.length === 0) return [];
    const out: {
      fy: number;
      label: string;
      leads: number;
      appels: number;
      bilans: number;
      acquisitions: number;
      hours: number;
      costHourly: number;
      costBonusBilan: number;
      costBonusAbo: number;
      costAds: number;
      total: number;
      revenuBilan: number;
      net: number;
    }[] = [];
    for (let fy = 0; fy < horizonYears; fy++) {
      const slice = steps.slice(fy * 12, (fy + 1) * 12);
      out.push({
        fy,
        label: fyLabels[fy] ?? `FY${fy}`,
        leads: slice.reduce((s, x) => s + x.leads, 0),
        appels: slice.reduce((s, x) => s + x.appels, 0),
        bilans: slice.reduce((s, x) => s + x.bilans, 0),
        acquisitions: slice.reduce((s, x) => s + x.acquisitions, 0),
        hours: slice.reduce((s, x) => s + x.hoursFreelance, 0),
        costHourly: slice.reduce((s, x) => s + x.costFreelanceHourly, 0),
        costBonusBilan: slice.reduce((s, x) => s + x.costBonusBilan, 0),
        costBonusAbo: slice.reduce((s, x) => s + x.costBonusAbo, 0),
        costAds: slice.reduce((s, x) => s + x.costAds, 0),
        total: slice.reduce((s, x) => s + x.totalCost, 0),
        revenuBilan: slice.reduce((s, x) => s + x.revenuBilanHT, 0),
        net: slice.reduce((s, x) => s + x.netMarketing, 0),
      });
    }
    return out;
  }, [steps, horizonYears, fyLabels]);

  const update = (
    patch: Partial<NonNullable<NonNullable<ModelParams["subs"]["bilanFunnel"]>["leadFunnel"]>>
  ) => {
    setParams((p) => {
      const existing = p.subs.bilanFunnel?.leadFunnel;
      if (!existing) return p;
      return {
        ...p,
        subs: {
          ...p.subs,
          bilanFunnel: {
            ...p.subs.bilanFunnel!,
            leadFunnel: { ...existing, ...patch },
          },
        },
      };
    });
  };

  if (!bf || !lf) return null;

  return (
    <div className="border-l-4 border-[#D32F2F] rounded-md p-3 bg-[#D32F2F]/5 space-y-3 mt-3">
      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wider text-[#D32F2F]">
          Funnel commercial — Acquisitions → Leads → Coûts
        </h5>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Pivot : la cible d&apos;acquisitions (du mode cohort) pilote leads + heures freelance
          + ads. Remplace le budget marketing flat du P&L.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Colonne saisie — pivot : cible acquisitions = INPUT cohort, back-calc des leads */}
          <div className="space-y-3">
            <div className="text-[10px] p-2 bg-amber-50 border border-amber-200 rounded text-amber-900">
              <strong>Mode pivot</strong> — les acquisitions/mois sont saisies dans le tableau{" "}
              <em>Acquisitions par FY</em> du Mode cohort ci-dessus. Le funnel back-calcule les
              leads et coûts nécessaires pour atteindre cette cible.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Leads / acquisition (ratio)</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={lf.leadsPerAcquisition}
                  onChange={(e) =>
                    update({ leadsPerAcquisition: Math.max(1, parseFloat(e.target.value) || 1) })
                  }
                  className="h-8 text-xs"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Conv globale = {((1 / Math.max(1, lf.leadsPerAcquisition)) * 100).toFixed(1)}%.
                  Typique : 8-15 leads/abo.
                </p>
              </div>
              <div>
                <Label className="text-[10px]">% leads appelés</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="1"
                    value={(lf.callPct * 100).toFixed(0)}
                    onChange={(e) =>
                      update({ callPct: (parseFloat(e.target.value) || 0) / 100 })
                    }
                    className="h-8 text-xs pr-6"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  85% typique (15% non joignables)
                </p>
              </div>
            </div>

            <div>
              <Label className="text-[10px]">% acquisitions via Bilan (vs direct)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="5"
                  value={(lf.pctViaBilan * 100).toFixed(0)}
                  onChange={(e) =>
                    update({ pctViaBilan: (parseFloat(e.target.value) || 0) / 100 })
                  }
                  className="h-8 text-xs pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Part des abos signés après un bilan 19,90€ (le reste signe directement).
                60% typique = 60% bilans + 40% direct.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Taux horaire freelance (€/h)</Label>
                <Input
                  type="number"
                  step="1"
                  value={lf.freelanceHourlyRateEur}
                  onChange={(e) =>
                    update({ freelanceHourlyRateEur: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Minutes /appel</Label>
                <Input
                  type="number"
                  step="1"
                  value={lf.minutesPerLead}
                  onChange={(e) =>
                    update({ minutesPerLead: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8 text-xs"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">5-15 min typique</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Bonus / bilan signé (€)</Label>
                <Input
                  type="number"
                  step="5"
                  value={lf.bonusPerBilanEur ?? 0}
                  onChange={(e) =>
                    update({ bonusPerBilanEur: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8 text-xs"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">Incite qualité</p>
              </div>
              <div>
                <Label className="text-[10px]">Bonus / abo signé (€)</Label>
                <Input
                  type="number"
                  step="5"
                  value={lf.bonusPerAboEur ?? 0}
                  onChange={(e) =>
                    update({ bonusPerAboEur: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8 text-xs"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Incite conversion finale
                </p>
              </div>
            </div>

            <div>
              <Label className="text-[10px]">Budget ads /mois (€)</Label>
              <Input
                type="number"
                step="50"
                value={lf.adsBudgetMonthlyEur}
                onChange={(e) =>
                  update({ adsBudgetMonthlyEur: parseFloat(e.target.value) || 0 })
                }
                className="h-8 text-xs"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Indexé par marketing.indexPa. Génère le flux de leads en amont.
              </p>
            </div>
          </div>

          {/* Colonne aperçu — FY0 */}
          <div className="space-y-2">
            {annualByFy[0] ? (
              <>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Aperçu FY0 ({annualByFy[0].label}) — mensuel moyen
                </div>
                <div className="rounded border bg-background p-2.5 space-y-1 text-[11px] font-mono">
                  <FunnelRow
                    label="Acquisitions (cible)"
                    value={`${(annualByFy[0].acquisitions / 12).toFixed(1)} /mois`}
                    accent
                  />
                  <FunnelRow
                    label={`↑ × ${lf.leadsPerAcquisition} leads/abo`}
                    value=""
                    dim
                  />
                  <FunnelRow label="Leads nécessaires" value={`${(annualByFy[0].leads / 12).toFixed(0)} /mois`} />
                  <FunnelRow
                    label={`× ${(lf.callPct * 100).toFixed(0)}% appelés`}
                    value=""
                    dim
                  />
                  <FunnelRow label="Appels effectifs" value={`${(annualByFy[0].appels / 12).toFixed(0)} /mois`} />
                  <div className="text-[10px] text-muted-foreground pl-3">
                    → {(annualByFy[0].hours / 12).toFixed(1)} h freelance/mois (
                    {(annualByFy[0].hours / 12 / 137).toFixed(2)} FTE)
                  </div>
                  <div className="border-t pt-1 mt-1">
                    <FunnelRow
                      label={`Bilans (${(lf.pctViaBilan * 100).toFixed(0)}% via bilan)`}
                      value={`${(annualByFy[0].bilans / 12).toFixed(1)} /mois`}
                    />
                    <FunnelRow
                      label={`Direct (${((1 - lf.pctViaBilan) * 100).toFixed(0)}% sans bilan)`}
                      value={`${(((annualByFy[0].acquisitions - annualByFy[0].bilans) / 12)).toFixed(1)} /mois`}
                      dim
                    />
                  </div>
                </div>
                <div className="rounded border bg-background p-2.5 space-y-1 text-[11px] font-mono">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Coûts mensuels moyens
                  </div>
                  <FunnelRow
                    label="Freelance horaire"
                    value={`${(annualByFy[0].costHourly / 12).toFixed(0)} €`}
                  />
                  {lf.bonusPerBilanEur ? (
                    <FunnelRow
                      label="Bonus bilans"
                      value={`${(annualByFy[0].costBonusBilan / 12).toFixed(0)} €`}
                    />
                  ) : null}
                  {lf.bonusPerAboEur ? (
                    <FunnelRow
                      label="Bonus abos"
                      value={`${(annualByFy[0].costBonusAbo / 12).toFixed(0)} €`}
                    />
                  ) : null}
                  <FunnelRow label="Ads" value={`${(annualByFy[0].costAds / 12).toFixed(0)} €`} />
                  <FunnelRow
                    label="TOTAL marketing"
                    value={`${(annualByFy[0].total / 12).toFixed(0)} €`}
                    accent
                  />
                  <FunnelRow
                    label="Revenu bilans (HT)"
                    value={`− ${(annualByFy[0].revenuBilan / 12).toFixed(0)} €`}
                    dim
                  />
                  <FunnelRow
                    label="NET marketing"
                    value={`${(annualByFy[0].net / 12).toFixed(0)} €`}
                    accent
                  />
                  <div className="border-t mt-1 pt-1 text-[10px] text-muted-foreground">
                    Annuel :{" "}
                    <span className="font-semibold text-foreground">
                      {annualByFy[0].net.toFixed(0)} €
                    </span>
                    {" — "}CAC effectif :{" "}
                    <span className="font-semibold text-foreground">
                      {annualByFy[0].acquisitions > 0
                        ? (annualByFy[0].net / annualByFy[0].acquisitions).toFixed(0) + " €"
                        : "—"}
                    </span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

      {annualByFy.length > 0 ? (
        <details className="border rounded-md bg-background">
          <summary className="cursor-pointer p-2 text-[11px] font-semibold uppercase tracking-wider hover:bg-muted/30">
            Tableau annuel funnel × {horizonYears} ans
          </summary>
          <div className="overflow-x-auto p-2 border-t">
            <table className="text-[10px] w-full">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left px-1 py-0.5">FY</th>
                  <th className="text-right px-1">Leads</th>
                  <th className="text-right px-1">Appels</th>
                  <th className="text-right px-1">Heures</th>
                  <th className="text-right px-1">Bilans</th>
                  <th className="text-right px-1">Acquis.</th>
                  <th className="text-right px-1">Freelance</th>
                  <th className="text-right px-1">Bonus</th>
                  <th className="text-right px-1">Ads</th>
                  <th className="text-right px-1 border-l">Total</th>
                  <th className="text-right px-1">Rev. bilan</th>
                  <th className="text-right px-1 border-l font-semibold">NET</th>
                  <th className="text-right px-1">CAC</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {annualByFy.map((r) => (
                  <tr key={r.fy} className="border-b">
                    <td className="px-1 py-0.5 font-semibold">{r.label}</td>
                    <td className="text-right px-1">{r.leads.toFixed(0)}</td>
                    <td className="text-right px-1">{r.appels.toFixed(0)}</td>
                    <td className="text-right px-1">{r.hours.toFixed(0)}</td>
                    <td className="text-right px-1">{r.bilans.toFixed(0)}</td>
                    <td className="text-right px-1 font-semibold">
                      {r.acquisitions.toFixed(0)}
                    </td>
                    <td className="text-right px-1">{r.costHourly.toFixed(0)}€</td>
                    <td className="text-right px-1">
                      {(r.costBonusBilan + r.costBonusAbo).toFixed(0)}€
                    </td>
                    <td className="text-right px-1">{r.costAds.toFixed(0)}€</td>
                    <td className="text-right px-1 border-l">{r.total.toFixed(0)}€</td>
                    <td className="text-right px-1">−{r.revenuBilan.toFixed(0)}€</td>
                    <td className="text-right px-1 border-l font-semibold">
                      {r.net.toFixed(0)}€
                    </td>
                    <td className="text-right px-1">
                      {r.acquisitions > 0 ? `${(r.net / r.acquisitions).toFixed(0)}€` : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold bg-muted/30">
                  <td className="px-1 py-1">TOTAL</td>
                  <td className="text-right px-1">
                    {annualByFy.reduce((s, r) => s + r.leads, 0).toFixed(0)}
                  </td>
                  <td className="text-right px-1">
                    {annualByFy.reduce((s, r) => s + r.appels, 0).toFixed(0)}
                  </td>
                  <td className="text-right px-1">
                    {annualByFy.reduce((s, r) => s + r.hours, 0).toFixed(0)}
                  </td>
                  <td className="text-right px-1">
                    {annualByFy.reduce((s, r) => s + r.bilans, 0).toFixed(0)}
                  </td>
                  <td className="text-right px-1">
                    {annualByFy.reduce((s, r) => s + r.acquisitions, 0).toFixed(0)}
                  </td>
                  <td className="text-right px-1">
                    {annualByFy.reduce((s, r) => s + r.costHourly, 0).toFixed(0)}€
                  </td>
                  <td className="text-right px-1">
                    {annualByFy.reduce((s, r) => s + r.costBonusBilan + r.costBonusAbo, 0).toFixed(0)}€
                  </td>
                  <td className="text-right px-1">
                    {annualByFy.reduce((s, r) => s + r.costAds, 0).toFixed(0)}€
                  </td>
                  <td className="text-right px-1 border-l">
                    {annualByFy.reduce((s, r) => s + r.total, 0).toFixed(0)}€
                  </td>
                  <td className="text-right px-1">
                    −{annualByFy.reduce((s, r) => s + r.revenuBilan, 0).toFixed(0)}€
                  </td>
                  <td className="text-right px-1 border-l">
                    {annualByFy.reduce((s, r) => s + r.net, 0).toFixed(0)}€
                  </td>
                  <td className="text-right px-1">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function FunnelRow({
  label,
  value,
  accent,
  dim,
}: {
  label: string;
  value: string;
  accent?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={
        "flex justify-between " +
        (accent ? "font-bold text-[#D32F2F]" : dim ? "text-muted-foreground text-[10px] pl-3" : "")
      }
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
