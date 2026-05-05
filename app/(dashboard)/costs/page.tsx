"use client";
import { useMemo, useState } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CostBreakdownChart,
  MonthlyCostStackChart,
  MonthlyTotalCostLine,
} from "@/components/charts";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { LineWithAnalysis } from "@/components/line-with-analysis";
import { SynthesisCard } from "@/components/synthesis-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtCurrency, fmtPct } from "@/lib/format";

export default function CostsPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const lastY = result.yearly[result.yearly.length - 1];
  const [fyFilter, setFyFilter] = useState<number | "all">("all");

  const yearlyData = result.yearly.map((y) => ({
    label: y.label,
    Salaires: y.salaries,
    Loyer: y.rent,
    Récurrent: y.recurring,
    Marketing: y.marketing,
    Provisions: y.provisions,
    Ponctuels: y.oneOff,
  }));

  const monthly = useMemo(
    () =>
      result.monthly.map((m) => ({
        month: m.month,
        label: m.label,
        fy: m.fy,
        Salaires: m.salaries,
        Loyer: m.rent,
        Récurrent: m.recurringEntretien + m.recurringFraisOp,
        Marketing: m.marketing,
        Provisions: m.provisions,
        Ponctuels: m.oneOff,
        Total: m.totalOpex,
      })),
    [result]
  );

  const filtered = fyFilter === "all" ? monthly : monthly.filter((m) => m.fy === fyFilter);

  // Width pour scroll horizontal: 28px par mois minimum
  const chartWidth = Math.max(filtered.length * 28, 800);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dépenses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Charges opérationnelles {result.yearly[0]?.label} → {lastY?.label}
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <SynthesisCard />

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Vue mensuelle</TabsTrigger>
          <TabsTrigger value="yearly">Vue annuelle</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>Évolution mensuelle des charges</CardTitle>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    size="sm"
                    variant={fyFilter === "all" ? "default" : "outline"}
                    onClick={() => setFyFilter("all")}
                  >
                    Tout
                  </Button>
                  {result.yearly.map((y) => (
                    <Button
                      key={y.fy}
                      size="sm"
                      variant={fyFilter === y.fy ? "default" : "outline"}
                      onClick={() => setFyFilter(y.fy)}
                    >
                      {y.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-2">
                <div style={{ width: chartWidth }}>
                  <MonthlyCostStackChart data={filtered} height={400} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-muted-foreground mb-2 font-medium">Total mensuel</div>
                <div className="overflow-x-auto pb-2">
                  <div style={{ width: chartWidth }}>
                    <MonthlyTotalCostLine data={filtered} height={160} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tableau mensuel détaillé</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[70vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-20">Mois</TableHead>
                      <TableHead className="text-right">Salaires</TableHead>
                      <TableHead className="text-right">Loyer</TableHead>
                      <TableHead className="text-right">Récurrent</TableHead>
                      <TableHead className="text-right">Marketing</TableHead>
                      <TableHead className="text-right">Provisions</TableHead>
                      <TableHead className="text-right">Ponctuels</TableHead>
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m) => (
                      <TableRow key={m.month} className={m.fy % 2 === 0 ? "bg-muted/20" : ""}>
                        <TableCell className="sticky left-0 bg-inherit text-xs font-medium">
                          {m.label}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmtCurrency(m.Salaires, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmtCurrency(m.Loyer, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmtCurrency(m.Récurrent, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmtCurrency(m.Marketing, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmtCurrency(m.Provisions, { compact: true })}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {m.Ponctuels > 0 ? fmtCurrency(m.Ponctuels, { compact: true }) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold">
                          {fmtCurrency(m.Total, { compact: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution annuelle des charges</CardTitle>
            </CardHeader>
            <CardContent>
              <CostBreakdownChart data={yearlyData} />
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
                        <TableHead key={y.fy} className="text-right">
                          {y.label}
                        </TableHead>
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
                        <TableCell className="font-medium">
                          <LineWithAnalysis label={row.label} />
                        </TableCell>
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
                        <TableCell
                          key={i}
                          className={"text-right " + (y.ebitda >= 0 ? "text-emerald-700" : "text-red-700")}
                        >
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
