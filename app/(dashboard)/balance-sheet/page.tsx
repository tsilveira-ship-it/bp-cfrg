"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { SynthesisCard } from "@/components/synthesis-card";
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

export default function BalanceSheetPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  // Bilan simplifié: actif immo + tréso + BFR client | passif equity + dette + résultat cumul
  const totalCapex = params.capex.equipment + params.capex.travaux + params.capex.juridique + params.capex.depots;

  const bilan = result.yearly.map((y, fy) => {
    const monthsToEnd = (fy + 1) * 12;
    // Amort cumulé
    const yEquip = params.tax.amortYearsEquipment ?? params.tax.daYears ?? 5;
    const yTrav = params.tax.amortYearsTravaux ?? 10;
    const cumAmortEquip = params.tax.enableDA
      ? Math.min(params.capex.equipment, (params.capex.equipment / Math.max(1, yEquip * 12)) * monthsToEnd)
      : 0;
    const cumAmortTrav = params.tax.enableDA
      ? Math.min(params.capex.travaux, (params.capex.travaux / Math.max(1, yTrav * 12)) * monthsToEnd)
      : 0;
    const cumAmort = cumAmortEquip + cumAmortTrav;

    const immoBrute = totalCapex;
    const immoNette = immoBrute - cumAmort;
    const tresorerie = y.cashEnd;
    const bfr = (y.totalRevenue / 12) * (params.bfr.daysOfRevenue / 30);
    const totalActif = immoNette + tresorerie + bfr;

    // Passif
    const equityRaised = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
    const cumNetIncome = result.yearly.slice(0, fy + 1).reduce((s, x) => s + x.netIncome, 0);
    const capitauxPropres = equityRaised + cumNetIncome;

    // Dette restant: somme bonds + loans - principal remboursé cumulé
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
      immoNette,
      tresorerie,
      bfr,
      totalActif,
      capitauxPropres,
      cumNetIncome,
      dette: Math.max(0, dette),
      totalPassif,
      ecart,
    };
  });

  // Emplois/ressources année 0 (M0)
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
                    <TableRow>
                      <TableCell>Équipement (mobilier, racks, machines)</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtCurrency(params.capex.equipment)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Travaux & aménagement</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtCurrency(params.capex.travaux)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Juridique & frais création</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtCurrency(params.capex.juridique)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Dépôts de garantie</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtCurrency(params.capex.depots)}
                      </TableCell>
                    </TableRow>
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
            <CardHeader>
              <CardTitle className="text-base">Bilan simplifié — fin d&apos;exercice</CardTitle>
              <p className="text-xs text-muted-foreground">
                Actif et passif au {bilan[bilan.length - 1]?.label}. Bilan dynamique sur tout l&apos;horizon.
              </p>
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
                    {bilan.map((b, i) => (
                      <TableCell key={i} />
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Immobilisations brutes</TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right text-xs">
                        {fmtCurrency(b.immoBrute, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6 text-muted-foreground">↳ Amort. cumulé</TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right text-xs text-muted-foreground">
                        ({fmtCurrency(b.cumAmort, { compact: true })})
                      </TableCell>
                    ))}
                  </TableRow>
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
                    {bilan.map((b, i) => (
                      <TableCell key={i} />
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-6">Capitaux propres</TableCell>
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
                  <TableRow>
                    <TableCell className="pl-6">Dettes (emprunts + obligations)</TableCell>
                    {bilan.map((b, i) => (
                      <TableCell key={i} className="text-right text-xs">
                        {fmtCurrency(b.dette, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
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
