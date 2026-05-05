"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel, computeFinanceFlows } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { EquityEditor } from "@/components/financing/equity-editor";
import { LoansEditor } from "@/components/financing/loans-editor";
import { BondsEditor } from "@/components/financing/bonds-editor";
import { BondSimulator } from "@/components/financing/bond-simulator";
import { FinancingTimeline } from "@/components/financing/financing-timeline";
import { fmtCurrency } from "@/lib/format";

export default function FinancingPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const flows = useMemo(
    () => computeFinanceFlows(params, result.horizonMonths),
    [params, result.horizonMonths]
  );

  const totalEquity = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const totalLoans = (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0);
  const totalBonds = (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);
  const totalRaise = totalEquity + totalLoans + totalBonds;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financement</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Apports, emprunts et émissions obligataires
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Apports</div>
            <div className="text-2xl font-bold mt-1">{fmtCurrency(totalEquity, { compact: true })}</div>
            <div className="text-xs text-muted-foreground mt-1">{(params.financing.equity ?? []).length} ligne(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Emprunts</div>
            <div className="text-2xl font-bold mt-1">{fmtCurrency(totalLoans, { compact: true })}</div>
            <div className="text-xs text-muted-foreground mt-1">{(params.financing.loans ?? []).length} prêt(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Obligations</div>
            <div className="text-2xl font-bold mt-1">{fmtCurrency(totalBonds, { compact: true })}</div>
            <div className="text-xs text-muted-foreground mt-1">{(params.financing.bonds ?? []).length} émission(s)</div>
          </CardContent>
        </Card>
        <Card className="bg-[#D32F2F]/5 border-[#D32F2F]/30">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total levé</div>
            <div className="text-2xl font-bold mt-1 text-[#D32F2F]">{fmtCurrency(totalRaise, { compact: true })}</div>
            <div className="text-xs text-muted-foreground mt-1">tout flux confondu</div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="equity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="equity">Apports / Equity</TabsTrigger>
          <TabsTrigger value="loans">Emprunts bancaires</TabsTrigger>
          <TabsTrigger value="bonds">Obligations</TabsTrigger>
          <TabsTrigger value="simulator">Simulateur</TabsTrigger>
          <TabsTrigger value="timeline">Échéancier consolidé</TabsTrigger>
        </TabsList>

        <TabsContent value="equity">
          <EquityEditor />
        </TabsContent>
        <TabsContent value="loans">
          <LoansEditor />
        </TabsContent>
        <TabsContent value="bonds">
          <BondsEditor />
        </TabsContent>
        <TabsContent value="simulator">
          <BondSimulator />
        </TabsContent>
        <TabsContent value="timeline">
          <FinancingTimeline flows={flows} result={result} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
