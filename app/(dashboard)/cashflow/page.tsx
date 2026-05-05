"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashFlowChart } from "@/components/charts";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtCurrency } from "@/lib/format";

export default function CashflowPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  const cashData = result.monthly.map((m) => ({
    label: m.label,
    Trésorerie: m.cashBalance,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trésorerie</h1>
          <p className="text-muted-foreground text-sm mt-1">Flux de trésorerie consolidé et solde mensuel</p>
        </div>
        <ScenarioSwitcher />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Solde de trésorerie cumulé</CardTitle>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={cashData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tableau de flux annuel</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flux</TableHead>
                {result.yearly.map((y) => (
                  <TableHead key={y.fy} className="text-right">{y.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-semibold bg-muted/40">
                <TableCell>EBITDA</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className={"text-right " + (y.ebitda >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {fmtCurrency(y.ebitda, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">– Impôts</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(-y.tax, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell>Cash Flow Opérationnel (CFO)</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.cfo, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">CAPEX</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(-y.capex, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell>Cash Flow Investissement (CFI)</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.cfi, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow className="font-semibold">
                <TableCell>Cash Flow Financement (CFF)</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.cff, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow className="font-bold border-t-2 bg-muted/40">
                <TableCell>Variation de trésorerie</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className={"text-right " + (y.netCashFlow >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {fmtCurrency(y.netCashFlow, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-bold bg-muted/20">
                <TableCell>Trésorerie fin d&apos;exercice</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className={"text-right " + (y.cashEnd < 0 ? "text-red-700" : "")}>
                    {fmtCurrency(y.cashEnd, { compact: true })}
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
