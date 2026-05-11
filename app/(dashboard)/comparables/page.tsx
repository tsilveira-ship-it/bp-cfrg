"use client";
import { useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Minus,
  TrendingUp,
} from "lucide-react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { evaluate, type Comparable } from "@/lib/comparables";
import { getSectorBenchmarks } from "@/lib/model/defaults";
import { fmtCurrency, fmtPct, fmtNum } from "@/lib/format";

function fmtVal(v: number, unit: Comparable["unit"]): string {
  if (unit === "€") return fmtCurrency(v, { compact: v >= 10000 });
  if (unit === "%") return fmtPct(v);
  if (unit === "x") return `${v.toFixed(1)}×`;
  if (unit === "mois") return `${fmtNum(v)} mois`;
  return fmtNum(v);
}

export default function ComparablesPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  const rows = useMemo<Comparable[]>(() => {
    // Benchmarks lus depuis params (override possible) avec fallback DEFAULT_PARAMS.
    const SECTOR_BENCHMARKS = getSectorBenchmarks(params);
    // Prix moyen abo
    const tiers = params.subs.tiers ?? [];
    const avgPrice = tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
    // Total marketing FY1
    const fy1 = result.yearly[0];
    // Estimation CAC: marketing FY0 / nouveaux membres (ramp end count)
    const estCAC = params.subs.rampEndCount > 0 ? (fy1?.marketing ?? 0) / params.subs.rampEndCount : 0;
    // EBITDA margin fin
    const lastFy = result.yearly[result.yearly.length - 1];
    // Capacité par cours
    const capPerClass = params.capacity?.capacityPerClass ?? 15;
    // Membres en fin de ramp
    const rampEnd = params.subs.rampEndCount;
    // Taux IS
    const isRate = params.tax.isRate;
    // Churn
    const churn = params.subs.monthlyChurnPct ?? 0;

    return [
      {
        metric: "Prix moyen mensuel abonnement",
        category: "Prix",
        ourValue: avgPrice,
        unit: "€",
        benchmarkLow: SECTOR_BENCHMARKS.monthlyPriceCrossfit.low,
        benchmarkHigh: SECTOR_BENCHMARKS.monthlyPriceCrossfit.high,
        source: SECTOR_BENCHMARKS.monthlyPriceCrossfit.source,
        comment: "Mix pondéré sur les tiers actifs.",
      },
      {
        metric: "CAC estimé (marketing FY1 / membres ramp)",
        category: "Acquisition",
        ourValue: estCAC,
        unit: "€",
        benchmarkLow: SECTOR_BENCHMARKS.cacFitness.low,
        benchmarkHigh: SECTOR_BENCHMARKS.cacFitness.high,
        source: SECTOR_BENCHMARKS.cacFitness.source,
        comment: "Approximation: budget marketing FY1 ÷ rampEndCount. À affiner avec attribution.",
      },
      {
        metric: "Churn mensuel nouveaux abos",
        category: "Rétention",
        ourValue: churn,
        unit: "%",
        benchmarkLow: SECTOR_BENCHMARKS.churnCrossfitCommunity.low,
        benchmarkHigh: SECTOR_BENCHMARKS.churnCrossfitCommunity.high,
        source: SECTOR_BENCHMARKS.churnCrossfitCommunity.source,
        comment: "Plage CrossFit communauté. Salle classique: 3-5%.",
      },
      {
        metric: "Marge EBITDA finale",
        category: "Marges",
        ourValue: lastFy?.ebitdaMargin ?? 0,
        unit: "%",
        benchmarkLow: SECTOR_BENCHMARKS.ebitdaMarginCrossfit.low,
        benchmarkHigh: SECTOR_BENCHMARKS.ebitdaMarginCrossfit.high,
        source: SECTOR_BENCHMARKS.ebitdaMarginCrossfit.source,
      },
      {
        metric: "Membres actifs en fin de ramp-up",
        category: "Marché",
        ourValue: rampEnd,
        unit: "n",
        benchmarkLow: SECTOR_BENCHMARKS.membersMatureCrossfit.low,
        benchmarkHigh: SECTOR_BENCHMARKS.membersMatureCrossfit.high,
        source: SECTOR_BENCHMARKS.membersMatureCrossfit.source,
        comment: "Référence pour boxes Paris matures (2-5 ans d'exploitation).",
      },
      {
        metric: "Capacité par cours",
        category: "Capacité",
        ourValue: capPerClass,
        unit: "n",
        benchmarkLow: SECTOR_BENCHMARKS.classCapacityCrossfit.low,
        benchmarkHigh: SECTOR_BENCHMARKS.classCapacityCrossfit.high,
        source: SECTOR_BENCHMARKS.classCapacityCrossfit.source,
        comment: "Standard CrossFit HQ. Plus haut nuit à la qualité du coaching.",
      },
      {
        metric: "Taux IS",
        category: "Marges",
        ourValue: isRate,
        unit: "%",
        benchmarkLow: SECTOR_BENCHMARKS.isRateFR.low,
        benchmarkHigh: SECTOR_BENCHMARKS.isRateFR.high,
        source: SECTOR_BENCHMARKS.isRateFR.source,
        comment: "15% taux réduit (38 120€ premiers); 25% au-delà.",
      },
    ];
  }, [params, result]);

  const evaluated = rows.map(evaluate);
  const totalInRange = evaluated.filter((e) => e.status === "in-range").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-[#D32F2F]" /> Comparables marché
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Confrontation des hypothèses du BP aux benchmarks sectoriels publiés.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-emerald-300 bg-emerald-50/30">
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-emerald-700">Dans la plage</div>
            <div className="text-3xl font-heading font-bold text-emerald-700">{totalInRange}</div>
            <p className="text-[10px] text-muted-foreground mt-1">/ {evaluated.length} indicateurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Au-dessus du marché</div>
            <div className="text-3xl font-heading font-bold">
              {evaluated.filter((e) => e.status === "above").length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">À justifier auprès des analystes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">En-dessous du marché</div>
            <div className="text-3xl font-heading font-bold">
              {evaluated.filter((e) => e.status === "below").length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Risque sous-estimation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparaison par indicateur</CardTitle>
          <p className="text-xs text-muted-foreground">
            Pastille verte = dans la plage. Rouge/ambre = outlier (à justifier).
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Indicateur</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Notre BP</TableHead>
                <TableHead className="text-right">Plage marché</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluated.map((c, i) => (
                <TableRow
                  key={i}
                  className={
                    c.status === "in-range"
                      ? ""
                      : c.status === "below"
                        ? "bg-amber-50/40"
                        : "bg-red-50/30"
                  }
                >
                  <TableCell>
                    {c.status === "in-range" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : c.status === "below" ? (
                      <ArrowDown className="h-4 w-4 text-amber-600" />
                    ) : (
                      <ArrowUp className="h-4 w-4 text-red-600" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{c.metric}</div>
                    {c.comment && (
                      <div className="text-[10px] text-muted-foreground italic">{c.comment}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.category}</TableCell>
                  <TableCell className="text-right text-sm font-mono font-semibold">
                    {fmtVal(c.ourValue, c.unit)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {fmtVal(c.benchmarkLow, c.unit)} – {fmtVal(c.benchmarkHigh, c.unit)}
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground italic max-w-xs">
                    {c.source}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Minus className="h-4 w-4" /> Méthodologie
          </h3>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            <li>
              Benchmarks compilés depuis sources publiques: IHRSA, CrossFit affiliate census,
              Xerfi, BNP Paribas Real Estate, rapports annuels chaînes fitness.
            </li>
            <li>
              Plages indicatives 25e-75e percentile sectoriel. Un outlier n&apos;est pas un défaut
              mais doit être justifié (premium, stratégie low-cost, etc.).
            </li>
            <li>
              CAC estimé en approximation (marketing FY1 / rampEndCount). Affiner avec
              attribution réelle quand /variance contient des données.
            </li>
            <li>
              À enrichir avec étude marché commandée (Xerfi, FFGym) et concurrents directs.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
