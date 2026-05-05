"use client";
import { useMemo } from "react";
import { GitBranch } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { expandCapex } from "@/lib/model/types";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { SankeyFunds, type SankeyLink, type SankeyNode } from "@/components/sankey-funds";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency, fmtPct } from "@/lib/format";

const COL_EQUITY = "#16a34a";
const COL_LOAN = "#3b82f6";
const COL_BOND = "#f59e0b";
const COL_CAT_CAPEX = "#1a1a1a";
const COL_CAT_BUFFER = "#6b7280";
const COL_USE_EQUIP = "#0f766e";
const COL_USE_TRAV = "#7c3aed";
const COL_USE_LEGAL = "#be185d";
const COL_USE_DEPOT = "#0369a1";
const COL_USE_BUFFER = "#9ca3af";

export default function UseOfFundsPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  // Sources
  const equity = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const loans = (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0);
  const bonds = (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);
  const totalSources = equity + loans + bonds;

  // Uses (CAPEX par poste + buffer)
  const items = expandCapex(params);
  const totalCapex = items.reduce((s, it) => s + it.amount, 0);
  const buffer = Math.max(0, totalSources - totalCapex);
  const totalUses = totalCapex + buffer;

  // Categories (intermediate)
  const catCapex = totalCapex;
  const catBuffer = buffer;

  // Sankey nodes
  const nodes: SankeyNode[] = [];
  if (equity > 0) nodes.push({ id: "src-eq", label: "Equity", value: equity, column: 0, color: COL_EQUITY });
  if (loans > 0) nodes.push({ id: "src-loan", label: "Emprunts", value: loans, column: 0, color: COL_LOAN });
  if (bonds > 0) nodes.push({ id: "src-bond", label: "Obligations", value: bonds, column: 0, color: COL_BOND });
  if (catCapex > 0) nodes.push({ id: "cat-capex", label: "CAPEX", value: catCapex, column: 1, color: COL_CAT_CAPEX });
  if (catBuffer > 0) nodes.push({ id: "cat-buf", label: "Buffer tréso", value: catBuffer, column: 1, color: COL_CAT_BUFFER });

  const useColors: Record<string, string> = {
    equipment: COL_USE_EQUIP,
    travaux: COL_USE_TRAV,
    juridique: COL_USE_LEGAL,
    depots: COL_USE_DEPOT,
  };
  for (const it of items) {
    if (it.amount <= 0) continue;
    nodes.push({
      id: `use-${it.id}`,
      label: it.name,
      value: it.amount,
      column: 2,
      color: useColors[it.category] ?? COL_USE_EQUIP,
    });
  }
  if (buffer > 0) {
    nodes.push({
      id: "use-buf",
      label: "Buffer/BFR",
      value: buffer,
      column: 2,
      color: COL_USE_BUFFER,
    });
  }

  // Links: distribute proportionnellement chaque source aux catégories selon leur poids
  const links: SankeyLink[] = [];
  for (const src of [
    { id: "src-eq", value: equity },
    { id: "src-loan", value: loans },
    { id: "src-bond", value: bonds },
  ]) {
    if (src.value <= 0) continue;
    const toCapex = (src.value / totalSources) * catCapex;
    const toBuf = (src.value / totalSources) * catBuffer;
    if (toCapex > 0) links.push({ from: src.id, to: "cat-capex", value: toCapex });
    if (toBuf > 0) links.push({ from: src.id, to: "cat-buf", value: toBuf });
  }
  // CAPEX → postes
  for (const it of items) {
    if (it.amount <= 0) continue;
    links.push({ from: "cat-capex", to: `use-${it.id}`, value: it.amount });
  }
  if (buffer > 0) links.push({ from: "cat-buf", to: "use-buf", value: buffer });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="h-7 w-7 text-[#D32F2F]" /> Use of funds
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Diagramme Sankey: sources de financement → catégories → postes d&apos;utilisation.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Sources totales
            </div>
            <div className="text-2xl font-heading font-bold">
              {fmtCurrency(totalSources, { compact: true })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Equity {fmtPct(totalSources > 0 ? equity / totalSources : 0, 0)} · Loans{" "}
              {fmtPct(totalSources > 0 ? loans / totalSources : 0, 0)} · Bonds{" "}
              {fmtPct(totalSources > 0 ? bonds / totalSources : 0, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              CAPEX initial
            </div>
            <div className="text-2xl font-heading font-bold">
              {fmtCurrency(totalCapex, { compact: true })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {items.filter((i) => i.amount > 0).length} poste(s)
            </p>
          </CardContent>
        </Card>
        <Card className={buffer < 0 ? "border-red-300" : ""}>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Buffer trésorerie
            </div>
            <div className={"text-2xl font-heading font-bold " + (buffer < 0 ? "text-red-700" : "")}>
              {fmtCurrency(buffer, { compact: true })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sources − CAPEX. Couvre le ramp-up et BFR.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagramme Sankey</CardTitle>
          <p className="text-xs text-muted-foreground">
            Largeur des flots ∝ montants. Survole pour voir les valeurs exactes.
          </p>
        </CardHeader>
        <CardContent>
          {nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Pas de financement ni CAPEX configurés.
            </p>
          ) : (
            <SankeyFunds nodes={nodes} links={links} height={Math.max(420, nodes.length * 30)} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail tabulaire</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Poste</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">% sources</TableHead>
                <TableHead>Justification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {it.category}
                  </TableCell>
                  <TableCell className="text-right font-mono">{fmtCurrency(it.amount)}</TableCell>
                  <TableCell className="text-right text-xs">
                    {fmtPct(totalSources > 0 ? it.amount / totalSources : 0, 1)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {it.amortYears > 0 ? `Amorti ${it.amortYears} ans` : "Non amorti"}
                  </TableCell>
                </TableRow>
              ))}
              {buffer > 0 && (
                <TableRow className="bg-muted/20">
                  <TableCell className="font-medium">Buffer trésorerie</TableCell>
                  <TableCell className="text-xs text-muted-foreground">cash</TableCell>
                  <TableCell className="text-right font-mono">{fmtCurrency(buffer)}</TableCell>
                  <TableCell className="text-right text-xs">
                    {fmtPct(totalSources > 0 ? buffer / totalSources : 0, 1)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Couverture ramp-up + BFR + sécurité
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="font-bold border-t-2">
                <TableCell>Total emplois</TableCell>
                <TableCell />
                <TableCell className="text-right font-mono">{fmtCurrency(totalUses)}</TableCell>
                <TableCell className="text-right">
                  {fmtPct(totalSources > 0 ? totalUses / totalSources : 0, 0)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
