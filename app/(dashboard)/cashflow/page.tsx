"use client";
import { Fragment, useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import {
  capexBreakdown,
  fundraiseBreakdown,
  interestBreakdown,
  principalRepayBreakdown,
  type YearlyBreakdownRow,
} from "@/lib/model/breakdowns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashFlowChart } from "@/components/charts";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { LineWithAnalysis } from "@/components/line-with-analysis";
import { SynthesisCard } from "@/components/synthesis-card";
import { CollapseToggle, ExpandAllButton } from "@/components/collapse-toggle";
import { useExpand } from "@/lib/use-expand";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtCurrency } from "@/lib/format";

const ROW_IDS = ["capex", "interest", "fundraise", "principal"] as const;

export default function CashflowPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const { isExpanded, toggle, expandAll, collapseAll, expanded } = useExpand("cashflow");

  const capexDetail = useMemo(() => capexBreakdown(params), [params]);
  const intDetail = useMemo(() => interestBreakdown(params), [params]);
  const inflowDetail = useMemo(() => fundraiseBreakdown(params), [params]);
  const principalDetail = useMemo(() => principalRepayBreakdown(params), [params]);

  const allExpanded = ROW_IDS.every((id) => expanded.has(id));

  const cashData = result.monthly.map((m) => ({
    label: m.label,
    Trésorerie: m.cashBalance,
  }));

  // Montants annuels apports (somme equity+loans+bonds inflow par fy)
  const Y = result.yearly.length;
  const inflowByFy = new Array<number>(Y).fill(0);
  inflowDetail.forEach((r) => r.values.forEach((v, i) => (inflowByFy[i] += v)));

  const principalByFy = new Array<number>(Y).fill(0);
  principalDetail.forEach((r) => r.values.forEach((v, i) => (principalByFy[i] += v)));

  const interestByFy = result.yearly.map((y) => y.interestExpense);

  const renderDetail = (
    rows: YearlyBreakdownRow[],
    opts: { negative?: boolean } = {}
  ) =>
    rows.map((r) => (
      <TableRow key={r.id} className="text-xs">
        <TableCell className="pl-10 text-muted-foreground">↳ {r.label}</TableCell>
        {r.values.map((v, i) => (
          <TableCell
            key={i}
            className={"text-right text-muted-foreground " + (opts.negative ? "text-red-700/70" : "")}
          >
            {v === 0
              ? "—"
              : opts.negative
                ? `(${fmtCurrency(v, { compact: true })})`
                : fmtCurrency(v, { compact: true })}
          </TableCell>
        ))}
      </TableRow>
    ));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trésorerie</h1>
          <p className="text-muted-foreground text-sm mt-1">Flux de trésorerie consolidé et solde mensuel</p>
        </div>
        <ScenarioSwitcher />
      </header>

      <SynthesisCard />

      <Card>
        <CardHeader>
          <CardTitle>Solde de trésorerie cumulé</CardTitle>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={cashData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tableau de flux annuel</CardTitle>
          <ExpandAllButton
            allExpanded={allExpanded}
            onExpandAll={() => expandAll([...ROW_IDS])}
            onCollapseAll={collapseAll}
          />
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
                <TableCell><LineWithAnalysis label="EBITDA" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className={"text-right " + (y.ebitda >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {fmtCurrency(y.ebitda, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground"><LineWithAnalysis label="D&A" /> (info, non-cash)</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-muted-foreground">
                    {y.da > 0 ? `(${fmtCurrency(y.da, { compact: true }).replace("-", "")})` : "—"}
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
                <TableCell><LineWithAnalysis label="Cash Flow Opérationnel (CFO)" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.cfo, { compact: true })}</TableCell>
                ))}
              </TableRow>

              {/* CAPEX collapsible */}
              <TableRow>
                <TableCell>
                  {capexDetail.some((r) => r.values.some((v) => v !== 0)) ? (
                    <CollapseToggle open={isExpanded("capex")} onToggle={() => toggle("capex")}>
                      <span className="text-muted-foreground">CAPEX</span>
                    </CollapseToggle>
                  ) : (
                    <span className="text-muted-foreground">CAPEX</span>
                  )}
                </TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(-y.capex, { compact: true })}</TableCell>
                ))}
              </TableRow>
              {isExpanded("capex") && renderDetail(capexDetail, { negative: true })}

              <TableRow className="font-semibold">
                <TableCell><LineWithAnalysis label="Cash Flow Investissement (CFI)" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.cfi, { compact: true })}</TableCell>
                ))}
              </TableRow>

              {/* CFF detail */}
              <TableRow className="font-semibold">
                <TableCell><LineWithAnalysis label="Cash Flow Financement (CFF)" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">{fmtCurrency(y.cff, { compact: true })}</TableCell>
                ))}
              </TableRow>

              {/* Apports (entrants) */}
              <TableRow>
                <TableCell className="pl-6">
                  {inflowDetail.length > 0 ? (
                    <CollapseToggle open={isExpanded("fundraise")} onToggle={() => toggle("fundraise")}>
                      <span className="text-muted-foreground">+ Apports (equity + emprunts + obligations)</span>
                    </CollapseToggle>
                  ) : (
                    <span className="text-muted-foreground">+ Apports</span>
                  )}
                </TableCell>
                {inflowByFy.map((v, i) => (
                  <TableCell key={i} className="text-right text-muted-foreground">
                    {v > 0 ? fmtCurrency(v, { compact: true }) : "—"}
                  </TableCell>
                ))}
              </TableRow>
              {isExpanded("fundraise") &&
                inflowDetail.map((r) => (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell className="pl-12 text-muted-foreground">↳ {r.label}</TableCell>
                    {r.values.map((v, i) => (
                      <TableCell key={i} className="text-right text-muted-foreground">
                        {v === 0 ? "—" : fmtCurrency(v, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {/* Remboursement principal */}
              <TableRow>
                <TableCell className="pl-6">
                  {principalDetail.length > 0 ? (
                    <CollapseToggle open={isExpanded("principal")} onToggle={() => toggle("principal")}>
                      <span className="text-muted-foreground">– Remboursement principal</span>
                    </CollapseToggle>
                  ) : (
                    <span className="text-muted-foreground">– Remboursement principal</span>
                  )}
                </TableCell>
                {principalByFy.map((v, i) => (
                  <TableCell key={i} className="text-right text-muted-foreground">
                    {v > 0 ? `(${fmtCurrency(v, { compact: true })})` : "—"}
                  </TableCell>
                ))}
              </TableRow>
              {isExpanded("principal") && (
                <Fragment>
                  {principalDetail.map((r) => (
                    <TableRow key={r.id} className="text-xs">
                      <TableCell className="pl-12 text-muted-foreground">↳ {r.label}</TableCell>
                      {r.values.map((v, i) => (
                        <TableCell key={i} className="text-right text-muted-foreground text-red-700/70">
                          {v === 0 ? "—" : `(${fmtCurrency(v, { compact: true })})`}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              )}

              {/* Intérêts cash */}
              <TableRow>
                <TableCell className="pl-6">
                  {intDetail.length > 0 ? (
                    <CollapseToggle open={isExpanded("interest")} onToggle={() => toggle("interest")}>
                      <span className="text-muted-foreground">– Intérêts cash</span>
                    </CollapseToggle>
                  ) : (
                    <span className="text-muted-foreground">– Intérêts cash</span>
                  )}
                </TableCell>
                {interestByFy.map((v, i) => (
                  <TableCell key={i} className="text-right text-muted-foreground">
                    {v > 0 ? `(${fmtCurrency(v, { compact: true })})` : "—"}
                  </TableCell>
                ))}
              </TableRow>
              {isExpanded("interest") && (
                <Fragment>
                  {intDetail.map((r) => (
                    <TableRow key={r.id} className="text-xs">
                      <TableCell className="pl-12 text-muted-foreground">↳ {r.label}</TableCell>
                      {r.values.map((v, i) => (
                        <TableCell key={i} className="text-right text-muted-foreground text-red-700/70">
                          {v === 0 ? "—" : `(${fmtCurrency(v, { compact: true })})`}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              )}

              <TableRow className="font-bold border-t-2 bg-muted/40">
                <TableCell><LineWithAnalysis label="Variation de trésorerie" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className={"text-right " + (y.netCashFlow >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {fmtCurrency(y.netCashFlow, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-bold bg-muted/20">
                <TableCell><LineWithAnalysis label="Trésorerie fin d'exercice" /></TableCell>
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
