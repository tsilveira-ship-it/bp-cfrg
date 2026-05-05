"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CostBreakdownChart } from "@/components/charts";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtCurrency, fmtPct } from "@/lib/format";

export default function CostsPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const lastY = result.yearly[result.yearly.length - 1];

  const data = result.yearly.map((y) => ({
    label: y.label,
    Salaires: y.salaries,
    Loyer: y.rent,
    Récurrent: y.recurring,
    Marketing: y.marketing,
    Provisions: y.provisions,
    Ponctuels: y.oneOff,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dépenses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Charges opérationnelles par poste, {result.yearly[0]?.label} → {lastY?.label}
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Évolution des charges</CardTitle>
        </CardHeader>
        <CardContent>
          <CostBreakdownChart data={data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail annuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poste</TableHead>
                  {result.yearly.map((y) => (
                    <TableHead key={y.fy} className="text-right">{y.label}</TableHead>
                  ))}
                  <TableHead className="text-right">% CA {lastY?.label}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { label: "Salaires", k: "salaries" as const },
                  { label: "Loyer & charges salle", k: "rent" as const },
                  { label: "Récurrent (entretien + frais op)", k: "recurring" as const },
                  { label: "Marketing", k: "marketing" as const },
                  { label: "Provisions", k: "provisions" as const },
                  { label: "Ponctuels (SACEM, etc.)", k: "oneOff" as const },
                ].map((row) => (
                  <TableRow key={row.k}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right">
                        {fmtCurrency(y[row.k], { compact: true })}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-xs">
                      {fmtPct((lastY?.[row.k] ?? 0) / Math.max(1, lastY?.totalRevenue ?? 1))}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2 bg-muted/30">
                  <TableCell>Total OPEX</TableCell>
                  {result.yearly.map((y, i) => (
                    <TableCell key={i} className="text-right">
                      {fmtCurrency(y.totalOpex, { compact: true })}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {fmtPct((lastY?.totalOpex ?? 0) / Math.max(1, lastY?.totalRevenue ?? 1))}
                  </TableCell>
                </TableRow>
                <TableRow className="font-bold bg-emerald-50/40">
                  <TableCell>EBITDA</TableCell>
                  {result.yearly.map((y, i) => (
                    <TableCell key={i} className={"text-right " + (y.ebitda >= 0 ? "text-emerald-700" : "text-red-700")}>
                      {fmtCurrency(y.ebitda, { compact: true })}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">{fmtPct(lastY?.ebitdaMargin ?? 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
