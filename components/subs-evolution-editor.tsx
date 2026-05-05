"use client";
import { ParamNumber } from "@/components/param-input";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtNum, fmtPct } from "@/lib/format";
import type { ModelParams } from "@/lib/model/types";
import { Sparkles } from "lucide-react";

type Props = {
  params: ModelParams;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
  patch: (path: string, value: unknown) => void;
};

export function SubsEvolutionEditor({ params, setParams, patch }: Props) {
  const { subs } = params;
  const growths = [subs.fy26GrowthPct, subs.fy27GrowthPct, subs.fy28GrowthPct, subs.fy29GrowthPct];
  const growthPaths = ["subs.fy26GrowthPct", "subs.fy27GrowthPct", "subs.fy28GrowthPct", "subs.fy29GrowthPct"] as const;

  // Implied end-of-FY counts
  const endCounts: number[] = [subs.rampEndCount];
  for (let i = 0; i < 4; i++) {
    endCounts.push(endCounts[i] * (1 + growths[i]));
  }
  // endCounts: [Aug26, Aug27, Aug28, Aug29, Aug30]

  // Build 60-month ramp for sparkline
  const monthly: number[] = [];
  for (let m = 0; m < 12; m++) {
    monthly.push(subs.rampStartCount + ((subs.rampEndCount - subs.rampStartCount) * m) / 11);
  }
  let prev = subs.rampEndCount;
  for (let fy = 0; fy < 4; fy++) {
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
    .map((v, i) => `${(i * sparkW) / (monthly.length - 1)},${sparkH - (v / max) * sparkH}`)
    .join(" ");

  const applyAll = (pct: number) => {
    setParams((p) => ({
      ...p,
      subs: {
        ...p.subs,
        fy26GrowthPct: pct,
        fy27GrowthPct: pct,
        fy28GrowthPct: pct,
        fy29GrowthPct: pct,
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
            hint="Hausse annuelle composée des prix TTC"
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
              Ramp-up FY25 (Sept 2025 → Août 2026)
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
            label="Membres Sept 2025"
            value={subs.rampStartCount}
          />
          <ParamNumber
            path="subs.rampEndCount"
            label="Membres Août 2026 (cible)"
            value={subs.rampEndCount}
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
              Croissance annuelle FY26 → FY29
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              % d&apos;augmentation des membres entre fin FY(n) et fin FY(n+1).
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => applyAll(0.20)} className="text-xs h-7">
              Tout à 20%
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyAll(0.10)} className="text-xs h-7">
              10%
            </Button>
            <Button variant="ghost" size="sm" onClick={() => applyAll(0)} className="text-xs h-7">
              0%
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[26, 27, 28, 29].map((yy, idx) => (
            <div key={yy} className="p-3 border rounded-md bg-muted/20 space-y-2">
              <Label className="text-xs font-medium">Croissance FY{yy}</Label>
              <div className="relative">
                <Input
                  type="number"
                  step={1}
                  value={(growths[idx] * 100).toFixed(1).replace(/\.0$/, "")}
                  onChange={(e) =>
                    patch(growthPaths[idx], (parseFloat(e.target.value) || 0) / 100)
                  }
                  className="pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                Fin FY{yy}: <span className="font-semibold text-foreground">{fmtNum(endCounts[idx + 1])}</span> membres
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wider">
            Aperçu trajectoire (60 mois)
          </h4>
        </div>
        <div className="border rounded-md p-3 bg-muted/10">
          <div className="flex items-end gap-3">
            <svg
              viewBox={`0 0 ${sparkW} ${sparkH}`}
              preserveAspectRatio="none"
              className="flex-1 h-16"
            >
              <polyline
                fill="none"
                stroke="#D32F2F"
                strokeWidth="0.8"
                points={points}
              />
              {[12, 24, 36, 48].map((m) => (
                <line
                  key={m}
                  x1={(m * sparkW) / (monthly.length - 1)}
                  y1={0}
                  x2={(m * sparkW) / (monthly.length - 1)}
                  y2={sparkH}
                  stroke="#e5e5e5"
                  strokeWidth="0.3"
                  strokeDasharray="1 1"
                />
              ))}
            </svg>
          </div>
          <div className="grid grid-cols-5 gap-1 text-[10px] text-muted-foreground mt-2 text-center">
            <div>
              Sept 25
              <div className="text-foreground font-semibold">{fmtNum(subs.rampStartCount)}</div>
            </div>
            <div>
              Août 26
              <div className="text-foreground font-semibold">{fmtNum(endCounts[0])}</div>
            </div>
            <div>
              Août 27
              <div className="text-foreground font-semibold">{fmtNum(endCounts[1])}</div>
            </div>
            <div>
              Août 28
              <div className="text-foreground font-semibold">{fmtNum(endCounts[2])}</div>
            </div>
            <div>
              Août 29
              <div className="text-foreground font-semibold">{fmtNum(endCounts[3])}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
