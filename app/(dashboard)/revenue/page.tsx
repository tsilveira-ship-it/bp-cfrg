"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueBreakdownChart, MembersChart } from "@/components/charts";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtCurrency, fmtPct, fmtNum } from "@/lib/format";

export default function RevenuePage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  const revPerTier = useMemo(() => {
    const vatDivisor = 1 + (params.subs.vatRate ?? 0);
    return params.subs.tiers.map((tier) => {
      const priceHT = tier.monthlyPrice / vatDivisor;
      const yearlyRev = result.yearly.map((y, fy) => {
        const monthsInFy = result.monthly.filter((m) => m.fy === fy);
        const sum = monthsInFy.reduce((s, m) => {
          const priceFactor = Math.pow(1 + params.subs.priceIndexPa, fy);
          return s + m.subsCount * tier.mixPct * priceHT * priceFactor;
        }, 0);
        return sum;
      });
      return { tier, yearlyRev, priceHT };
    });
  }, [params.subs.tiers, params.subs.priceIndexPa, params.subs.vatRate, result]);

  const membersData = result.monthly.map((m) => ({
    label: m.label,
    "Nouveaux abos": Math.round(m.subsCount),
    Legacy: Math.round(m.legacyCount),
    Total: Math.round(m.subsCount + m.legacyCount),
  }));

  const breakdownData = result.yearly.map((y) => ({
    label: y.label,
    "Nouveaux abos": y.subsRevenue,
    Legacy: y.legacyRevenue,
    Prestations: y.prestationsRevenue,
    Merchandising: y.merchRevenue,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recettes</h1>
          <p className="text-muted-foreground text-sm mt-1">Détail par tier d&apos;abonnement et catégorie de revenu</p>
        </div>
        <ScenarioSwitcher />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des membres (mensuel)</CardTitle>
          </CardHeader>
          <CardContent>
            <MembersChart data={membersData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Décomposition CA par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueBreakdownChart data={breakdownData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CA par tier d&apos;abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">TTC</TableHead>
                <TableHead className="text-right">HT</TableHead>
                <TableHead className="text-right">Mix</TableHead>
                <TableHead className="text-right">FY25</TableHead>
                <TableHead className="text-right">FY26</TableHead>
                <TableHead className="text-right">FY27</TableHead>
                <TableHead className="text-right">FY28</TableHead>
                <TableHead className="text-right">FY29</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revPerTier.map(({ tier, yearlyRev, priceHT }) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.name}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(tier.monthlyPrice, { decimals: 2 })}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtCurrency(priceHT, { decimals: 2 })}</TableCell>
                  <TableCell className="text-right">{fmtPct(tier.mixPct)}</TableCell>
                  {yearlyRev.map((v, i) => (
                    <TableCell key={i} className="text-right">{fmtCurrency(v, { compact: true })}</TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow className="font-semibold border-t-2">
                <TableCell colSpan={4}>Total nouveaux abonnements (HT)</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.subsRevenue, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">Legacy Javelot</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.legacyRevenue, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">Prestations complémentaires</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.prestationsRevenue, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">Merchandising</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.merchRevenue, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow className="font-bold border-t-2 bg-muted/30">
                <TableCell colSpan={4}>CA Total</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.totalRevenue, { compact: true })}</TableCell>
                ))}
              </TableRow>
              <TableRow className="text-xs text-muted-foreground">
                <TableCell colSpan={4}>Croissance</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{i === 0 ? "—" : fmtPct(y.growthPct)}</TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacité (audit)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground">Heures coaching / mois</div>
              <div className="text-2xl font-bold">~362h</div>
              <div className="text-xs text-muted-foreground">(206 CFRG + 146 Hyrox + 10 sandbox)</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground">Membres actifs FY26 max</div>
              <div className="text-2xl font-bold">{fmtNum(result.monthly[11].subsCount + result.monthly[11].legacyCount)}</div>
              <div className="text-xs text-muted-foreground">Fin FY25</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-xs text-muted-foreground">Heures dispo / membre</div>
              <div className="text-2xl font-bold">
                {(362 / Math.max(1, result.monthly[11].subsCount + result.monthly[11].legacyCount)).toFixed(2)}h
              </div>
              <div className="text-xs text-muted-foreground">/ membre / mois — tension si {"<"} 1h</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
