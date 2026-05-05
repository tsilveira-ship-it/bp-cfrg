"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtCurrency, fmtNum } from "@/lib/format";

export default function MonthlyPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vue mensuelle détaillée</h1>
          <p className="text-muted-foreground text-sm mt-1">60 mois — du Sept 2025 au Août 2030</p>
        </div>
        <ScenarioSwitcher />
      </header>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[75vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-20">Mois</TableHead>
                  <TableHead className="text-right">Abos nv</TableHead>
                  <TableHead className="text-right">Legacy</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right">Salaires</TableHead>
                  <TableHead className="text-right">Loyer</TableHead>
                  <TableHead className="text-right">Mkt</TableHead>
                  <TableHead className="text-right">OPEX</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right">CAPEX</TableHead>
                  <TableHead className="text-right">Tréso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.monthly.map((m, i) => (
                  <TableRow
                    key={i}
                    className={m.fy % 2 === 0 ? "bg-muted/20" : ""}
                  >
                    <TableCell className="sticky left-0 bg-inherit font-medium text-xs">
                      {m.label}
                    </TableCell>
                    <TableCell className="text-right text-xs">{fmtNum(m.subsCount, 0)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtNum(m.legacyCount, 0)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {fmtCurrency(m.totalRevenue, { compact: true })}
                    </TableCell>
                    <TableCell className="text-right text-xs">{fmtCurrency(m.salaries, { compact: true })}</TableCell>
                    <TableCell className="text-right text-xs">{fmtCurrency(m.rent, { compact: true })}</TableCell>
                    <TableCell className="text-right text-xs">{fmtCurrency(m.marketing, { compact: true })}</TableCell>
                    <TableCell className="text-right text-xs">{fmtCurrency(m.totalOpex, { compact: true })}</TableCell>
                    <TableCell className={"text-right text-xs font-medium " + (m.ebitda >= 0 ? "text-emerald-700" : "text-red-700")}>
                      {fmtCurrency(m.ebitda, { compact: true })}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {m.capex > 0 ? fmtCurrency(-m.capex, { compact: true }) : "—"}
                    </TableCell>
                    <TableCell className={"text-right text-xs font-medium " + (m.cashBalance < 0 ? "text-red-700" : "")}>
                      {fmtCurrency(m.cashBalance, { compact: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
