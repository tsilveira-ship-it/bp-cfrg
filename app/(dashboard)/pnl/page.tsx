"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { SynthesisCard } from "@/components/synthesis-card";
import { LineWithAnalysis } from "@/components/line-with-analysis";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency, fmtPct } from "@/lib/format";

export default function PnlPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compte de résultat (P&amp;L)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Income statement complet — du CA au résultat net après IS
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <SynthesisCard />

      <Card>
        <CardHeader>
          <CardTitle>Compte de résultat annuel</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ligne</TableHead>
                {result.yearly.map((y) => (
                  <TableHead key={y.fy} className="text-right">
                    {y.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-bold border-b-2 bg-muted/30">
                <TableCell><LineWithAnalysis label="Chiffre d'affaires" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">
                    {fmtCurrency(y.totalRevenue, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="text-muted-foreground text-xs">
                <TableCell>Croissance vs N-1</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">
                    {i === 0 ? "—" : fmtPct(y.growthPct)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="pl-6 text-muted-foreground">↳ Nouveaux abos</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-muted-foreground">
                    {fmtCurrency(y.subsRevenue, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="pl-6 text-muted-foreground">↳ Legacy</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-muted-foreground">
                    {fmtCurrency(y.legacyRevenue, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="pl-6 text-muted-foreground">↳ Prestations</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-muted-foreground">
                    {fmtCurrency(y.prestationsRevenue, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="pl-6 text-muted-foreground">↳ Merchandising</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-muted-foreground">
                    {fmtCurrency(y.merchRevenue, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>

              <TableRow>
                <TableCell><LineWithAnalysis label="Salaires" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    ({fmtCurrency(y.salaries, { compact: true })})
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell><LineWithAnalysis label="Loyer" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    ({fmtCurrency(y.rent, { compact: true })})
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell><LineWithAnalysis label="Récurrent" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    ({fmtCurrency(y.recurring, { compact: true })})
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell><LineWithAnalysis label="Marketing" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    ({fmtCurrency(y.marketing, { compact: true })})
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell><LineWithAnalysis label="Provisions" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    ({fmtCurrency(y.provisions, { compact: true })})
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell><LineWithAnalysis label="Ponctuels" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    ({fmtCurrency(y.oneOff, { compact: true })})
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-bold border-t-2 bg-muted/30">
                <TableCell><LineWithAnalysis label="Total OPEX" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    ({fmtCurrency(y.totalOpex, { compact: true })})
                  </TableCell>
                ))}
              </TableRow>

              <TableRow className="font-bold bg-emerald-50/50">
                <TableCell><LineWithAnalysis label="EBITDA" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell
                    key={i}
                    className={"text-right " + (y.ebitda >= 0 ? "text-emerald-700" : "text-red-700")}
                  >
                    {fmtCurrency(y.ebitda, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="text-xs text-muted-foreground">
                <TableCell>Marge EBITDA</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">
                    {fmtPct(y.ebitdaMargin)}
                  </TableCell>
                ))}
              </TableRow>

              <TableRow>
                <TableCell><LineWithAnalysis label="D&A" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    {y.da > 0 ? `(${fmtCurrency(y.da, { compact: true })})` : "—"}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell><LineWithAnalysis label="EBIT" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell
                    key={i}
                    className={"text-right " + (y.ebit >= 0 ? "" : "text-red-700")}
                  >
                    {fmtCurrency(y.ebit, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell><LineWithAnalysis label="Intérêts" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    {y.interestExpense > 0 ? `(${fmtCurrency(y.interestExpense, { compact: true })})` : "—"}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell><LineWithAnalysis label="PBT" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell
                    key={i}
                    className={"text-right " + (y.pbt >= 0 ? "" : "text-red-700")}
                  >
                    {fmtCurrency(y.pbt, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell><LineWithAnalysis label="Impôts" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    {y.tax > 0 ? `(${fmtCurrency(y.tax, { compact: true })})` : "—"}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-bold border-t-2 bg-[#D32F2F]/5">
                <TableCell><LineWithAnalysis label="Résultat net" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell
                    key={i}
                    className={"text-right " + (y.netIncome >= 0 ? "text-emerald-700" : "text-red-700")}
                  >
                    {fmtCurrency(y.netIncome, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
