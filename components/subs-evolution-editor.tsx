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
