"use client";
import { ParamNumber } from "@/components/param-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtNum } from "@/lib/format";
import { buildTimeline, type ModelParams } from "@/lib/model/types";
import { Sparkles } from "lucide-react";

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
