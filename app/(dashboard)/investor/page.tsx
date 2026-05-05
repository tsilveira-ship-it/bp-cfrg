"use client";
import { useMemo, useState } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel, computeFinanceFlows } from "@/lib/model/compute";
import {
  computeDSCRDetailed,
  equityInvestorReturn,
  bondInvestorReturn,
  ltvCac,
  npv,
  paybackPeriodMonths,
} from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { SynthesisCard } from "@/components/synthesis-card";
import { LineWithAnalysis } from "@/components/line-with-analysis";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency, fmtPct, fmtNum } from "@/lib/format";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function InvestorMetricsPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const finFlows = useMemo(
    () => computeFinanceFlows(params, result.horizonMonths),
    [params, result.horizonMonths]
  );

  const [exitMultiple, setExitMultiple] = useState(5);
  const [discountRate, setDiscountRate] = useState(0.10);
  const [retentionMonths, setRetentionMonths] = useState(24);

  const dscrEntries = computeDSCRDetailed(result);
  const equityRet = equityInvestorReturn(result, params, exitMultiple);

  const operatingCF = result.monthly.map((m) => m.cfo + m.cfi);
  const npvOp = npv(operatingCF, discountRate);
  const paybackMo = paybackPeriodMonths(operatingCF);
  const ltv = ltvCac(params, result, retentionMonths);

  // Bond holders IRR
  const bondReturns = (params.financing.bonds ?? []).map((b) => {
    const flowsForThisBond: number[] = new Array(result.horizonMonths).fill(0);
    // Approx: réutiliser computeFinanceFlows global ne distingue pas les bonds individuels
    // Simulation locale du bond
    const totalPeriods = Math.round(b.termYears * b.frequency);
    const deferralPeriods = Math.min(
      Math.round(b.deferralYears * b.frequency),
      totalPeriods
    );
    const monthsPerPeriod = 12 / b.frequency;
    const periodRate = b.annualRatePct / 100 / b.frequency;
    let balance = b.principal;
    for (let i = 1; i <= deferralPeriods; i++) {
      const interest = balance * periodRate;
      const m = b.startMonth + Math.round(i * monthsPerPeriod);
      if (m < result.horizonMonths) {
        if (b.capitalizeInterest) balance += interest;
        else flowsForThisBond[m] += interest;
      } else if (b.capitalizeInterest) {
        balance += interest;
      }
    }
    const remaining = totalPeriods - deferralPeriods;
    const linearP = b.amortization === "linear" && remaining > 0 ? balance / remaining : 0;
    for (let j = 1; j <= remaining; j++) {
      const interest = balance * periodRate;
      const principalRepaid =
        b.amortization === "bullet"
          ? j === remaining
            ? balance
            : 0
          : j === remaining
          ? balance
          : linearP;
      balance -= principalRepaid;
      const m = b.startMonth + Math.round((deferralPeriods + j) * monthsPerPeriod);
      if (m < result.horizonMonths) flowsForThisBond[m] += interest + principalRepaid;
    }
    const ret = bondInvestorReturn(b.principal, flowsForThisBond);
    return { bond: b, ...ret };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métriques investisseur</h1>
          <p className="text-muted-foreground text-sm mt-1">
            IRR, multiples, NPV, payback, DSCR, LTV/CAC
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <SynthesisCard />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              IRR equity
            </div>
            <div
              className={
                "text-2xl font-bold mt-1 " +
                (equityRet.irr === null
                  ? ""
                  : equityRet.irr > 0.15
                  ? "text-emerald-600"
                  : equityRet.irr > 0
                  ? "text-amber-600"
                  : "text-red-600")
              }
            >
              {equityRet.irr !== null ? fmtPct(equityRet.irr) : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Annualisé</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Multiple equity
            </div>
            <div className="text-2xl font-bold mt-1">{equityRet.multiple.toFixed(2)}x</div>
            <div className="text-xs text-muted-foreground mt-1">
              Sortie EBITDA × {exitMultiple}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              NPV (op)
            </div>
            <div className={"text-2xl font-bold mt-1 " + (npvOp >= 0 ? "" : "text-red-600")}>
              {fmtCurrency(npvOp, { compact: true })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              @{fmtPct(discountRate, 0)} discount
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Payback</div>
            <div className="text-2xl font-bold mt-1">
              {paybackMo !== null ? `${(paybackMo / 12).toFixed(1)} ans` : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">CFO + CFI cumulé ≥ 0</div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hypothèses de calcul</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Multiple sortie EBITDA</Label>
              <Input
                type="number"
                step="0.5"
                value={exitMultiple}
                onChange={(e) => setExitMultiple(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Valorisation = EBITDA dernière année × multiple. Secteur fitness: 4-7x.
              </p>
            </div>
            <div>
              <Label className="text-xs">Taux d&apos;actualisation NPV</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  value={(discountRate * 100).toFixed(1)}
                  onChange={(e) => setDiscountRate((parseFloat(e.target.value) || 0) / 100)}
                  className="pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Coût du capital cible (8-15% PME).
              </p>
            </div>
            <div>
              <Label className="text-xs">Rétention moyenne membre (mois)</Label>
              <Input
                type="number"
                value={retentionMonths}
                onChange={(e) => setRetentionMonths(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Durée moyenne d&apos;abonnement. Industrie: 18-30 mois.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">DSCR — Couverture du service de la dette</CardTitle>
          <p className="text-xs text-muted-foreground">
            CFO ÷ (intérêts + remboursement capital). Banque exige typiquement &gt; 1.2x.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Année</TableHead>
                <TableHead className="text-right">CFO</TableHead>
                <TableHead className="text-right">Service dette</TableHead>
                <TableHead className="text-right">DSCR</TableHead>
                <TableHead className="text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dscrEntries.map((d) => (
                <TableRow key={d.fy}>
                  <TableCell className="font-medium">{d.label}</TableCell>
                  <TableCell className="text-right">
                    {fmtCurrency(d.cfo, { compact: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtCurrency(d.debtService, { compact: true })}
                  </TableCell>
                  <TableCell
                    className={
                      "text-right font-mono " +
                      (d.dscr === Infinity
                        ? ""
                        : d.dscr >= 1.2
                        ? "text-emerald-700"
                        : d.dscr >= 1
                        ? "text-amber-700"
                        : "text-red-700")
                    }
                  >
                    {d.dscr === Infinity ? "—" : d.dscr.toFixed(2)}x
                  </TableCell>
                  <TableCell className="text-right">
                    {d.dscr === Infinity ? (
                      <span className="text-xs text-muted-foreground">Pas de dette</span>
                    ) : d.dscr >= 1.2 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />
                    ) : d.dscr >= 1 ? (
                      <span className="text-xs text-amber-700">Limite</span>
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600 inline" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retour investisseur equity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Capital investi</span>
              <span className="font-mono">{fmtCurrency(equityRet.invested)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valorisation sortie</span>
              <span className="font-mono">{fmtCurrency(equityRet.exitValuation)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Multiple</span>
              <span className="font-mono font-bold">{equityRet.multiple.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-semibold">IRR annualisé</span>
              <span className="font-mono font-bold">
                {equityRet.irr !== null ? fmtPct(equityRet.irr) : "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Hypothèse: investisseur entre M0, sortie en {result.yearly[result.yearly.length - 1].label} à EBITDA × {exitMultiple}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">LTV / CAC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prix moyen TTC</span>
              <span className="font-mono">{fmtCurrency(ltv.avgPriceTTC)}/mo</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rétention moyenne</span>
              <span className="font-mono">{ltv.avgRetentionMonths} mois</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">LTV par membre</span>
              <span className="font-mono font-bold">{fmtCurrency(ltv.ltv)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">CAC année 1</span>
              <span className="font-mono">{fmtCurrency(ltv.cac)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold">Ratio LTV/CAC</span>
              <span
                className={
                  "font-mono font-bold " +
                  (ltv.ratio >= 3
                    ? "text-emerald-700"
                    : ltv.ratio >= 1
                    ? "text-amber-700"
                    : "text-red-700")
                }
              >
                {ltv.ratio === Infinity ? "—" : `${ltv.ratio.toFixed(1)}x`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Cible secteur fitness: ratio &gt; 3x = sain. &lt; 1x = perte sur acquisition.
            </p>
          </CardContent>
        </Card>
      </div>

      {bondReturns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retour investisseur obligataire (par émission)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Émission</TableHead>
                  <TableHead className="text-right">Capital</TableHead>
                  <TableHead className="text-right">Total reçu</TableHead>
                  <TableHead className="text-right">Multiple</TableHead>
                  <TableHead className="text-right">IRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bondReturns.map((br) => (
                  <TableRow key={br.bond.id}>
                    <TableCell className="font-medium">{br.bond.name}</TableCell>
                    <TableCell className="text-right">{fmtCurrency(br.invested)}</TableCell>
                    <TableCell className="text-right">{fmtCurrency(br.totalReturn)}</TableCell>
                    <TableCell className="text-right font-mono">{br.multiple.toFixed(2)}x</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {br.irr !== null ? fmtPct(br.irr) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
