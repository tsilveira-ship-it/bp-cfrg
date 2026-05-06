"use client";
import { ParamNumber } from "@/components/param-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { fmtNum } from "@/lib/format";
import { buildTimeline, type ModelParams } from "@/lib/model/types";
import { solveAcquisitionsFromNetTarget } from "@/lib/model/compute";
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

  const endCounts: number[] = [subs.rampEndCount];
  for (let i = 0; i < growths.length; i++) {
    endCounts.push(endCounts[i] * (1 + growths[i]));
  }

  const monthly: number[] = [];
  for (let m = 0; m < 12; m++) {
    monthly.push(subs.rampStartCount + ((subs.rampEndCount - subs.rampStartCount) * m) / 11);
  }
  let prev = subs.rampEndCount;
  for (let fy = 0; fy < growths.length; fy++) {
    const next = prev * (1 + growths[fy]);
    for (let i = 0; i < 12; i++) {
      monthly.push(prev + ((next - prev) * i) / 11);
    }
    prev = next;
  }

  const max = Math.max(...monthly, 1);
  const sparkW = 100;
  const sparkH = 28;
  const points = monthly
    .map((v, i) => `${(i * sparkW) / Math.max(1, monthly.length - 1)},${sparkH - (v / max) * sparkH}`)
    .join(" ");

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

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
              Ramp-up {tl.fyLabels[0]} ({tl.monthLabels[0]} → {tl.monthLabels[11]})
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">Linéaire mois par mois.</p>
          </div>
          <span className="text-xs text-muted-foreground">
            +{fmtNum(subs.rampEndCount - subs.rampStartCount)} membres en 12 mois
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
              Croissance annuelle {tl.fyLabels[1] ?? ""} → {tl.fyLabels[tl.horizonYears - 1] ?? ""}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              % d&apos;augmentation des membres entre fin FY(n) et fin FY(n+1).
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => applyAll(0.20)} className="text-xs h-7">
              20%
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyAll(0.10)} className="text-xs h-7">
              10%
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyAll(0)} className="text-xs h-7">
              0%
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {growths.map((g, idx) => (
            <div key={idx} className="p-3 border rounded-md bg-muted/20 space-y-2">
              <Label className="text-xs font-medium">Croissance {tl.fyLabels[idx + 1]}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step={1}
                  value={(g * 100).toFixed(1).replace(/\.0$/, "")}
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
            <Label className="text-xs">Churn mensuel (% nouveaux abos)</Label>
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
              0% = pas de churn (rétention parfaite). 2-3% mensuel = standard fitness.
            </p>
          </div>
          <div className="text-xs text-muted-foreground p-3 border rounded bg-muted/20">
            Rétention équivalente:{" "}
            <span className="font-semibold text-foreground">
              {subs.monthlyChurnPct && subs.monthlyChurnPct > 0
                ? `~${(1 / subs.monthlyChurnPct).toFixed(0)} mois moyens`
                : "infini (pas de churn)"}
            </span>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
            Aperçu trajectoire ({tl.horizonMonths} mois)
          </h4>
        </div>
        <div className="border rounded-md p-3 bg-muted/10">
          <svg
            viewBox={`0 0 ${sparkW} ${sparkH}`}
            preserveAspectRatio="none"
            className="w-full h-16"
          >
            <polyline fill="none" stroke="#D32F2F" strokeWidth="0.8" points={points} />
            {Array.from({ length: tl.horizonYears - 1 }, (_, i) => i + 1).map((fy) => (
              <line
                key={fy}
                x1={(fy * 12 * sparkW) / Math.max(1, monthly.length - 1)}
                y1={0}
                x2={(fy * 12 * sparkW) / Math.max(1, monthly.length - 1)}
                y2={sparkH}
                stroke="#e5e5e5"
                strokeWidth="0.3"
                strokeDasharray="1 1"
              />
            ))}
          </svg>
          <div className={`grid gap-1 text-[10px] text-muted-foreground mt-2 text-center`} style={{ gridTemplateColumns: `repeat(${tl.horizonYears + 1}, 1fr)` }}>
            <div>
              {tl.monthLabels[0]}
              <div className="text-foreground font-semibold">{fmtNum(subs.rampStartCount)}</div>
            </div>
            {tl.fyLabels.map((lbl, i) => (
              <div key={lbl}>
                Fin {lbl}
                <div className="text-foreground font-semibold">{fmtNum(endCounts[i] ?? 0)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
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

  const setEnabled = (next: boolean) => {
    setParams((p) => {
      const existing = p.subs.cohortModel;
      if (next) {
        const defaultStart = existing?.acquisitionStart ?? Math.max(1, Math.round(p.subs.rampStartCount * (p.subs.monthlyChurnPct ?? 0.025)));
        const defaultEnd = existing?.acquisitionEnd ?? Math.max(1, Math.round(p.subs.rampEndCount * (p.subs.monthlyChurnPct ?? 0.025)));
        const growthLen = Math.max(0, horizonYears - 1);
        const defaultGrowth = existing?.acquisitionGrowthByFy ?? new Array(growthLen).fill(0.10);
        return {
          ...p,
          subs: {
            ...p.subs,
            cohortModel: {
              enabled: true,
              acquisitionStart: defaultStart,
              acquisitionEnd: defaultEnd,
              acquisitionGrowthByFy: defaultGrowth,
              acquisitionSeasonality: existing?.acquisitionSeasonality,
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

  const autoCalcFromTarget = () => {
    const startNet = params.subs.rampStartCount;
    const endNet = params.subs.rampEndCount;
    const churnRate = params.subs.monthlyChurnPct ?? 0.025;
    const acqStart = solveAcquisitionsFromNetTarget(startNet, churnRate);
    const acqEnd = solveAcquisitionsFromNetTarget(endNet, churnRate);
    setParams((p) => ({
      ...p,
      subs: {
        ...p.subs,
        cohortModel: {
          enabled: true,
          acquisitionStart: Math.round(acqStart * 10) / 10,
          acquisitionEnd: Math.round(acqEnd * 10) / 10,
          acquisitionGrowthByFy: p.subs.cohortModel?.acquisitionGrowthByFy ?? new Array(Math.max(0, horizonYears - 1)).fill(0.10),
          acquisitionSeasonality: p.subs.cohortModel?.acquisitionSeasonality,
        },
      },
    }));
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Acquisitions/mois début FY26</Label>
              <Input
                type="number"
                step="0.5"
                value={cm.acquisitionStart}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    subs: {
                      ...p.subs,
                      cohortModel: { ...cm, acquisitionStart: parseFloat(e.target.value) || 0 },
                    },
                  }))
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Brut, avant churn.
              </p>
            </div>
            <div>
              <Label className="text-xs">Acquisitions/mois fin FY26</Label>
              <Input
                type="number"
                step="0.5"
                value={cm.acquisitionEnd}
                onChange={(e) =>
                  setParams((p) => ({
                    ...p,
                    subs: {
                      ...p.subs,
                      cohortModel: { ...cm, acquisitionEnd: parseFloat(e.target.value) || 0 },
                    },
                  }))
                }
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">
              Croissance annuelle du taux d&apos;acquisition (FY27 →)
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {cm.acquisitionGrowthByFy.map((g, idx) => (
                <div key={idx} className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">FY{27 + idx}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step={1}
                      value={(g * 100).toFixed(1).replace(/\.0$/, "")}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          subs: {
                            ...p.subs,
                            cohortModel: {
                              ...cm,
                              acquisitionGrowthByFy: cm.acquisitionGrowthByFy.map((x, i) =>
                                i === idx ? (parseFloat(e.target.value) || 0) / 100 : x
                              ),
                            },
                          },
                        }))
                      }
                      className="pr-6 h-8 text-xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <RetentionCurveEditor cm={cm} setParams={setParams} fallbackChurn={churn} />

          <BilanFunnelEditor params={params} setParams={setParams} />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={autoCalcFromTarget}
              className="text-xs h-7"
              title="Calcule acquisitions = rampEnd × churn (Little's law steady state)"
            >
              Auto-calc depuis cible NET ({fmtNum(params.subs.rampStartCount)} → {fmtNum(params.subs.rampEndCount)})
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
  const channels = subs.acquisitionChannels ?? [];
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

  const addChannel = () => {
    setParams((p) => ({
      ...p,
      subs: {
        ...p.subs,
        acquisitionChannels: [
          ...(p.subs.acquisitionChannels ?? []),
          {
            id: `ch_${Date.now()}`,
            name: "Nouveau canal",
            mixPct: 0.10,
            cacEur: 30,
            growthPa: 0.05,
          },
        ],
      },
    }));
  };

  const removeChannel = (id: string) => {
    setParams((p) => ({
      ...p,
      subs: {
        ...p.subs,
        acquisitionChannels: (p.subs.acquisitionChannels ?? []).filter((c) => c.id !== id),
      },
    }));
  };

  const updateChannel = (id: string, patch: Partial<{ name: string; mixPct: number; cacEur: number; growthPa: number }>) => {
    setParams((p) => ({
      ...p,
      subs: {
        ...p.subs,
        acquisitionChannels: (p.subs.acquisitionChannels ?? []).map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      },
    }));
  };

  const seedChannelsFromCRM = () => {
    setParams((p) => ({
      ...p,
      subs: {
        ...p.subs,
        acquisitionChannels: [
          { id: `ch_brochure_${Date.now()}`, name: "Brochure", mixPct: 0.63, cacEur: 25, growthPa: 0.05 },
          { id: `ch_resawod_${Date.now() + 1}`, name: "ResaWod / drop-in", mixPct: 0.29, cacEur: -10, growthPa: 0.10 },
          { id: `ch_siteweb_${Date.now() + 2}`, name: "Site web (SEO)", mixPct: 0.08, cacEur: 50, growthPa: 0.30 },
        ],
      },
    }));
  };

  const totalChannelMix = channels.reduce((s, c) => s + c.mixPct, 0);
  const weightedCac = channels.reduce((s, c) => s + c.cacEur * c.mixPct, 0);

  return (
    <section className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-muted/5 space-y-4">
      <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
        Niveau 6 — Avancé (mix évolutif, canaux, saisonnalité, pause)
      </h4>

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
          <Label className="text-xs">Saisonnalité churn (informatif — non appliqué V1)</Label>
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

      {/* Canaux d'acquisition */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs">Canaux d&apos;acquisition (CAC pondéré)</Label>
            <p className="text-[10px] text-muted-foreground">
              {channels.length > 0 ? (
                <>
                  Mix total :{" "}
                  <span className={Math.abs(totalChannelMix - 1) < 0.001 ? "text-emerald-600" : "text-red-600"}>
                    {fmtNum(totalChannelMix * 100)}%
                  </span>
                  {" — "}
                  CAC pondéré : <span className="font-mono font-semibold">{weightedCac.toFixed(2)}€</span>
                </>
              ) : (
                "Décompose les acquisitions par canal pour CAC différencié."
              )}
            </p>
          </div>
          <div className="flex gap-1">
            {channels.length === 0 ? (
              <Button variant="ghost" size="sm" onClick={seedChannelsFromCRM} className="text-[10px] h-7">
                Preset CRM (brochure 63% / ResaWod 29% / web 8%)
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={addChannel} className="text-[10px] h-7">
              + Canal
            </Button>
          </div>
        </div>
        {channels.length > 0 ? (
          <div className="space-y-1.5">
            {channels.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-2 border rounded bg-background"
              >
                <div className="md:col-span-4">
                  <Label className="text-[10px]">Nom</Label>
                  <Input
                    value={c.name}
                    onChange={(e) => updateChannel(c.id, { name: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px]">Mix (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(c.mixPct * 100).toFixed(1)}
                    onChange={(e) =>
                      updateChannel(c.id, { mixPct: (parseFloat(e.target.value) || 0) / 100 })
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px]">CAC (€)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={c.cacEur}
                    onChange={(e) =>
                      updateChannel(c.id, { cacEur: parseFloat(e.target.value) || 0 })
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-[10px]">Croissance/an (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={(c.growthPa * 100).toFixed(1)}
                    onChange={(e) =>
                      updateChannel(c.id, { growthPa: (parseFloat(e.target.value) || 0) / 100 })
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="md:col-span-1 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 h-7"
                    onClick={() => removeChannel(c.id)}
                  >
                    ×
                  </Button>
                </div>
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
  const bf = params.subs.bilanFunnel;
  const enabled = bf?.enabled === true;
  const horizonYears = params.timeline.horizonYears;

  const setEnabled = (next: boolean) => {
    setParams((p) => {
      const existing = p.subs.bilanFunnel;
      if (next) {
        const growthLen = Math.max(0, horizonYears - 1);
        return {
          ...p,
          subs: {
            ...p.subs,
            bilanFunnel: {
              enabled: true,
              monthlyBilansStart: existing?.monthlyBilansStart ?? 10,
              monthlyBilansEnd: existing?.monthlyBilansEnd ?? 30,
              bilansGrowthByFy: existing?.bilansGrowthByFy ?? new Array(growthLen).fill(0.20),
              conversionPct: existing?.conversionPct ?? 0.45,
              bilanPriceTTC: existing?.bilanPriceTTC ?? 19.90,
            },
          },
        };
      }
      return {
        ...p,
        subs: {
          ...p.subs,
          bilanFunnel: existing ? { ...existing, enabled: false } : undefined,
        },
      };
    });
  };

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

  // Estimations dérivées pour aperçu
  const startAcq = bf ? bf.monthlyBilansStart * bf.conversionPct : 0;
  const endAcq = bf ? bf.monthlyBilansEnd * bf.conversionPct : 0;
  const startRevHT = bf ? bf.monthlyBilansStart * (bf.bilanPriceTTC / (1 + (params.subs.vatRate ?? 0.20))) : 0;

  return (
    <div className="border rounded-md p-3 bg-muted/10 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider">
            Funnel Bilan → conversion abo (Niveau 5)
          </h5>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Override le ramp d&apos;acquisitions ci-dessus. acquisitions[m] = bilans[m] × conversion%.
            Revenu Bilan ajouté en prestations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="bilan-toggle" className="text-[10px]">
            {enabled ? "Activé" : "Désactivé"}
          </Label>
          <Switch id="bilan-toggle" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {enabled && bf ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px]">Bilans/mois début FY26</Label>
              <Input
                type="number"
                step="1"
                value={bf.monthlyBilansStart}
                onChange={(e) => update({ monthlyBilansStart: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px]">Bilans/mois fin FY26</Label>
              <Input
                type="number"
                step="1"
                value={bf.monthlyBilansEnd}
                onChange={(e) => update({ monthlyBilansEnd: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px]">Prix Bilan TTC (€)</Label>
              <Input
                type="number"
                step="0.10"
                value={bf.bilanPriceTTC}
                onChange={(e) => update({ bilanPriceTTC: parseFloat(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px]">Conversion bilan → abo (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  value={(bf.conversionPct * 100).toFixed(1)}
                  onChange={(e) =>
                    update({ conversionPct: (parseFloat(e.target.value) || 0) / 100 })
                  }
                  className="h-8 text-xs pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Dashboard CRM live : ~45% (cible). Ajuster selon donnée réelle.
              </p>
            </div>
            <div>
              <Label className="text-[10px] mb-1.5 block">
                Croissance annuelle bilans (FY27 →)
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                {bf.bilansGrowthByFy.map((g, idx) => (
                  <div key={idx}>
                    <Label className="text-[9px] text-muted-foreground">FY{27 + idx}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step={1}
                        value={(g * 100).toFixed(1).replace(/\.0$/, "")}
                        onChange={(e) =>
                          update({
                            bilansGrowthByFy: bf.bilansGrowthByFy.map((x, i) =>
                              i === idx ? (parseFloat(e.target.value) || 0) / 100 : x
                            ),
                          })
                        }
                        className="h-7 text-[10px] pr-5"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px] bg-background border rounded p-2">
            <div>
              <div className="text-muted-foreground">Acquisitions M0</div>
              <div className="font-mono font-semibold">{startAcq.toFixed(1)}/mo</div>
            </div>
            <div>
              <div className="text-muted-foreground">Acquisitions M11</div>
              <div className="font-mono font-semibold">{endAcq.toFixed(1)}/mo</div>
            </div>
            <div>
              <div className="text-muted-foreground">Revenu bilan M0 (HT)</div>
              <div className="font-mono font-semibold">{startRevHT.toFixed(0)}€</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="text-[10px] h-6 cursor-not-allowed opacity-50"
              title="Bientôt dispo — extraction crm.payments + crm.customers"
            >
              Importer trajectoire dashboard CRM (V2)
            </Button>
          </div>
        </>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">
          Désactivé — acquisitions calculées via cohortModel ci-dessus. Activer pour modéliser
          le funnel CRM réel (Bilan 19,90€ → conversion).
        </p>
      )}
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
