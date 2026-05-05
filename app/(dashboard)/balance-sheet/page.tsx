"use client";
import { Fragment, useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { capexBreakdown, principalRepayBreakdown } from "@/lib/model/breakdowns";
import { expandCapex } from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { SynthesisCard } from "@/components/synthesis-card";
import { CollapseToggle, ExpandAllButton } from "@/components/collapse-toggle";
import { useExpand } from "@/lib/use-expand";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtCurrency } from "@/lib/format";

const ROW_IDS = ["immo", "equity", "debt"] as const;

export default function BalanceSheetPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const { isExpanded, toggle, expandAll, collapseAll, expanded } = useExpand("bs");
  const allExpanded = ROW_IDS.every((id) => expanded.has(id));

  const capexDetail = useMemo(() => capexBreakdown(params), [params]);
  const principalDetail = useMemo(() => principalRepayBreakdown(params), [params]);

  const capexItems = expandCapex(params);
  const totalCapex = capexItems.reduce((s, it) => s + it.amount, 0);

  const bilan = result.yearly.map((y, fy) => {
    const monthsToEnd = (fy + 1) * 12;
    let cumAmort = 0;
    let cumAmortEquip = 0;
    let cumAmortTrav = 0;
    if (params.tax.enableDA) {
      for (const it of capexItems) {
        if (it.amortYears <= 0 || it.amount <= 0) continue;
        const monthlyAmort = it.amount / Math.max(1, it.amortYears * 12);
        const cum = Math.min(it.amount, monthlyAmort * monthsToEnd);
        cumAmort += cum;
        if (it.category === "equipment") cumAmortEquip += cum;
        else if (it.category === "travaux") cumAmortTrav += cum;
      }
    }

    const immoBrute = totalCapex;
    const immoNette = immoBrute - cumAmort;
    const tresorerie = y.cashEnd;
    const bfr = (y.totalRevenue / 12) * (params.bfr.daysOfRevenue / 30);
    const totalActif = immoNette + tresorerie + bfr;

    const equityRaised = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
    const cumNetIncome = result.yearly.slice(0, fy + 1).reduce((s, x) => s + x.netIncome, 0);
    const capitauxPropres = equityRaised + cumNetIncome;

    const slice = result.monthly.slice(0, monthsToEnd);
    const bondPrincipalRepaid = slice.reduce((s, m) => s + m.bondPrincipalRepay, 0);
    const loanPrincipalRepaid = slice.reduce((s, m) => s + m.loanPrincipalRepay, 0);
    const dette =
      (params.financing.bonds ?? []).reduce((s, b) => s + b.principal, 0) -
      bondPrincipalRepaid +
      (params.financing.loans ?? []).reduce((s, l) => s + l.principal, 0) -
      loanPrincipalRepaid;

    const totalPassif = capitauxPropres + Math.max(0, dette);
    const ecart = totalActif - totalPassif;

    return {
      label: y.label,
      immoBrute,
      cumAmort,
      cumAmortEquip,
      cumAmortTrav,
      immoNette,
      tresorerie,
      bfr,
      totalActif,
      capitauxPropres,
      cumNetIncome,
      equityRaised,
      dette: Math.max(0, dette),
      totalPassif,
      ecart,
    };
  });

  // Detail dettes par instrument: outstanding = principal - cumulative repaid
  const Y = result.yearly.length;
  const debtDetailRows = useMemo(() => {
    const rows: { id: string; label: string; values: number[] }[] = [];
    for (const loan of params.financing.loans ?? []) {
      const repaid = principalDetail.find((r) => r.id === `loan-pr-${loan.id}`);
      const cumByFy = cumulative(repaid?.values ?? new Array<number>(Y).fill(0));
      const values = cumByFy.map((c) => Math.max(0, loan.principal - c));
      rows.push({ id: `debt-loan-${loan.id}`, label: loan.name, values });
    }
    for (const bond of params.financing.bonds ?? []) {
      const repaid = principalDetail.find((r) => r.id === `bond-pr-${bond.id}`);
      const cumByFy = cumulative(repaid?.values ?? new Array<number>(Y).fill(0));
      const values = cumByFy.map((c) => Math.max(0, bond.principal - c));
      rows.push({ id: `debt-bond-${bond.id}`, label: bond.name, values });
    }
    return rows;
  }, [params, principalDetail, Y]);

  const equityDetailRows = useMemo(() => {
    const rows: { id: string; label: string; values: number[] }[] = [];
    for (const eq of params.financing.equity ?? []) {
      const fyIn = Math.floor(eq.startMonth / 12);
      const values = new Array<number>(Y).fill(0).map((_, fy) => (fy >= fyIn ? eq.amount : 0));
      rows.push({ id: `eq-${eq.id}`, label: eq.name, values });
    }
    return rows;
  }, [params, Y]);

  const totalEquity = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const totalLoans = (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0);
  const totalBonds = (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);
  const totalRessources = totalEquity + totalLoans + totalBonds;
  const trésoBuffer = totalRessources - totalCapex;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bilan & Emplois/Ressources</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bilan prévisionnel simplifié + plan de financement initial
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <SynthesisCard />

      <Tabs defaultValue="emplois" className="space-y-4">
        <TabsList>
          <TabsTrigger value="emplois">Emplois / Ressources</TabsTrigger>
          <TabsTrigger value="bilan">Bilan annuel</TabsTrigger>
        </TabsList>

        <TabsContent value="emplois">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emplois (utilisation des fonds)</CardTitle>
                <p className="text-xs text-muted-foreground">À quoi sert l&apos;argent levé.</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {capexItems.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          {it.name}
                          {it.amortYears > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({it.amortYears}y amort)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmtCurrency(it.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold border-t-2">
                      <TableCell>Sous-total CAPEX</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtCurrency(totalCapex)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">
                        + Buffer trésorerie (BFR + ramp-up)
                      </TableCell>
                      <TableCell
                        className={
                          "text-right font-mono " + (trésoBuffer < 0 ? "text-red-600" : "text-emerald-600")
                        }
                      >
                        {fmtCurrency(trésoBuffer)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-bold border-t-2 bg-muted/30">
                      <TableCell>TOTAL EMPLOIS</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtCurrency(totalRessources)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ressources (origine des fonds)</CardTitle>
                <p className="text-xs text-muted-foreground">D&apos;où vient l&apos;argent.</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold text-emerald-700 bg-emerald-50/40">
                        Fonds propres
                      </TableCell>
                    </TableRow>
                    {(params.financing.equity ?? []).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="pl-6">{e.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {fmtCurrency(e.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium border-t">
                      <TableCell className="pl-3">Sous-total equity</TableCell>
                      <TableCell className="text-right font-mono">{fmtCurrency(totalEquity)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold bg-blue-50/40 text-blue-700">
                        Dette bancaire
                      </TableCell>
                    </TableRow>
                    {(params.financing.loans ?? []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="pl-6">
                          {l.name} ({l.annualRatePct}% / {l.termMonths}mo)
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmtCurrency(l.principal)}
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold bg-amber-50/40 text-amber-700">
                        Dette obligataire
                      </TableCell>
                    </TableRow>
                    {(params.financing.bonds ?? []).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="pl-6">
                          {b.name} ({b.annualRatePct}% / {b.termYears}y{" "}
                          {b.amortization === "bullet" ? "in fine" : "linéaire"})
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {fmtCurrency(b.principal)}
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow className="font-bold border-t-2 bg-muted/30">
                      <TableCell>TOTAL RESSOURCES</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtCurrency(totalRessources)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bilan">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Bilan simplifié — fin d&apos;exercice</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Actif et passif au {bilan[bilan.length - 1]?.label}. Cliquer sur une ligne pour la détailler.
                </p>
              </div>
              <ExpandAllButton
                allExpanded={allExpanded}
                onExpandAll={() => expandAll([...ROW_IDS])}
                onCollapseAll={collapseAll}
              />
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ligne</TableHead>
                    {bilan.map((b) => (
                      <TableHead key={b.label} className="text-right">
                        {b.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="font-semibold bg-emerald-50/30">
                    <TableCell>ACTIF</TableCell>
                    {bilan.map((_, i) => (
                      <TableCell key={i} />
                    ))}
                  </TableRow>

                  {/* Immobilisations */}
                  <TableRow>
                    <TableCell className="pl-6">
                      <CollapseToggle open={isExpanded("immo")} onToggle={() => toggle("immo")}>
                        Immobilisations brutes
                      </CollapseToggle>
                    </TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right text-xs">
                        {fmtCurrency(b.immoBrute, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded("immo") && (
                    <Fragment>
                      {capexDetail.map((r) => (
                        <TableRow key={r.id} className="text-xs">
                          <TableCell className="pl-12 text-muted-foreground">↳ {r.label}</TableCell>
                          {bilan.map((_, i) => (
                            <TableCell key={i} className="text-right text-muted-foreground">
                              {/* Brut constant après M0 */}
                              {fmtCurrency(r.values[0], { compact: true })}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      <TableRow className="text-xs">
                        <TableCell className="pl-12 text-muted-foreground">↳ Amort. équipement</TableCell>
                        {bilan.map((b, i) => (
                          <TableCell key={i} className="text-right text-muted-foreground">
                            ({fmtCurrency(b.cumAmortEquip, { compact: true })})
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow className="text-xs">
                        <TableCell className="pl-12 text-muted-foreground">↳ Amort. travaux</TableCell>
                        {bilan.map((b, i) => (
                          <TableCell key={i} className="text-right text-muted-foreground">
                            ({fmtCurrency(b.cumAmortTrav, { compact: true })})
                          </TableCell>
                        ))}
                      </TableRow>
                    </Fragment>
                  )}
                  {!isExpanded("immo") && (
                    <TableRow>
                      <TableCell className="pl-12 text-muted-foreground text-xs">
                        ↳ Amort. cumulé
                      </TableCell>
                      {bilan.map((b, i) => (
                        <TableCell key={i} className="text-right text-xs text-muted-foreground">
                          ({fmtCurrency(b.cumAmort, { compact: true })})
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                  <TableRow className="font-medium">
                    <TableCell className="pl-6">Immo nettes</TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right text-xs">
                        {fmtCurrency(b.immoNette, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Trésorerie</TableCell>
                    {bilan.map((b, i) => (
                      <TableCell
                        key={i}
                        className={"text-right text-xs " + (b.tresorerie < 0 ? "text-red-700" : "")}
                      >
                        {fmtCurrency(b.tresorerie, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">BFR (créances clients)</TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right text-xs">
                        {fmtCurrency(b.bfr, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total Actif</TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right text-xs">
                        {fmtCurrency(b.totalActif, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>

                  <TableRow className="font-semibold bg-[#D32F2F]/5">
                    <TableCell>PASSIF</TableCell>
                    {bilan.map((_, i) => (
                      <TableCell key={i} />
                    ))}
                  </TableRow>

                  {/* Capitaux propres */}
                  <TableRow>
                    <TableCell className="pl-6">
                      {equityDetailRows.length > 0 ? (
                        <CollapseToggle open={isExpanded("equity")} onToggle={() => toggle("equity")}>
                          Capitaux propres
                        </CollapseToggle>
                      ) : (
                        "Capitaux propres"
                      )}
                    </TableCell>
                    {bilan.map((b, i) => (
                      <TableCell
                        key={i}
                        className={
                          "text-right text-xs " + (b.capitauxPropres < 0 ? "text-red-700" : "")
                        }
                      >
                        {fmtCurrency(b.capitauxPropres, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded("equity") && (
                    <Fragment>
                      {equityDetailRows.map((r) => (
                        <TableRow key={r.id} className="text-xs">
                          <TableCell className="pl-12 text-muted-foreground">↳ {r.label}</TableCell>
                          {r.values.map((v, i) => (
                            <TableCell key={i} className="text-right text-muted-foreground">
                              {v === 0 ? "—" : fmtCurrency(v, { compact: true })}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      <TableRow className="text-xs">
                        <TableCell className="pl-12 text-muted-foreground">
                          ↳ Résultat cumulé
                        </TableCell>
                        {bilan.map((b, i) => (
                          <TableCell key={i} className="text-right text-muted-foreground">
                            {fmtCurrency(b.cumNetIncome, { compact: true })}
                          </TableCell>
                        ))}
                      </TableRow>
                    </Fragment>
                  )}
                  {!isExpanded("equity") && (
                    <TableRow>
                      <TableCell className="pl-12 text-muted-foreground text-xs">
                        ↳ Résultat cumulé
                      </TableCell>
                      {bilan.map((b, i) => (
                        <TableCell key={i} className="text-right text-xs text-muted-foreground">
                          {fmtCurrency(b.cumNetIncome, { compact: true })}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}

                  {/* Dettes */}
                  <TableRow>
                    <TableCell className="pl-6">
                      {debtDetailRows.length > 0 ? (
                        <CollapseToggle open={isExpanded("debt")} onToggle={() => toggle("debt")}>
                          Dettes (emprunts + obligations)
                        </CollapseToggle>
                      ) : (
                        "Dettes (emprunts + obligations)"
                      )}
                    </TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right text-xs">
                        {fmtCurrency(b.dette, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded("debt") &&
                    debtDetailRows.map((r) => (
                      <TableRow key={r.id} className="text-xs">
                        <TableCell className="pl-12 text-muted-foreground">↳ {r.label}</TableCell>
                        {r.values.map((v, i) => (
                          <TableCell key={i} className="text-right text-muted-foreground">
                            {v === 0 ? "—" : fmtCurrency(v, { compact: true })}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total Passif</TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right text-xs">
                        {fmtCurrency(b.totalPassif, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="text-xs text-muted-foreground">
                    <TableCell>Écart (équilibrage)</TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right">
                        {fmtCurrency(b.ecart, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cumulative(arr: number[]): number[] {
  let s = 0;
  return arr.map((v) => (s += v));
}
