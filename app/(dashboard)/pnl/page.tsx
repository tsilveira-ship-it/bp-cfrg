"use client";
import { Fragment, useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import {
  daBreakdown,
  interestBreakdown,
  recurringBreakdown,
  rentBreakdown,
  salariesBreakdown,
  type YearlyBreakdownRow,
} from "@/lib/model/breakdowns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { SynthesisCard } from "@/components/synthesis-card";
import { LineWithAnalysis } from "@/components/line-with-analysis";
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
import { fmtCurrency, fmtPct } from "@/lib/format";

const ROW_IDS = ["ca", "opex", "salaries", "rent", "recurring", "da", "interest"] as const;

export default function PnlPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const { isExpanded, toggle, expandAll, collapseAll, expanded } = useExpand("pnl");

  const salDetail = useMemo(() => salariesBreakdown(params), [params]);
  const rentDetail = useMemo(() => rentBreakdown(params), [params]);
  const recDetail = useMemo(() => recurringBreakdown(params), [params]);
  const daDetail = useMemo(() => daBreakdown(params), [params]);
  const intDetail = useMemo(() => interestBreakdown(params), [params]);

  const allExpanded = ROW_IDS.every((id) => expanded.has(id));

  const renderDetailRows = (
    rows: YearlyBreakdownRow[],
    opts: { negative?: boolean; indent?: "deep" | "normal" } = {}
  ) => {
    const padCls = opts.indent === "deep" ? "pl-14" : "pl-10";
    return rows.map((r) => (
      <TableRow key={r.id} className="text-xs">
        <TableCell className={padCls + " text-muted-foreground"}>↳ {r.label}</TableCell>
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
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compte de résultat (P&amp;L)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Income statement complet — du CA au résultat net après IS. Cliquer sur une ligne agrégée pour la détailler.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <SynthesisCard />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Compte de résultat annuel</CardTitle>
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
                {result.yearly.map((y) => (
                  <TableHead key={y.fy} className="text-right">
                    {y.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Chiffre d'affaires */}
              <TableRow className="font-bold border-b-2 bg-muted/30">
                <TableCell>
                  <CollapseToggle open={isExpanded("ca")} onToggle={() => toggle("ca")}>
                    <LineWithAnalysis label="Chiffre d'affaires" />
                  </CollapseToggle>
                </TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">
                    {fmtCurrency(y.totalRevenue, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="text-muted-foreground text-xs">
                <TableCell className="pl-6">Croissance vs N-1</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">
                    {i === 0 ? "—" : fmtPct(y.growthPct)}
                  </TableCell>
                ))}
              </TableRow>
              {isExpanded("ca") && (
                <Fragment>
                  <TableRow className="text-xs">
                    <TableCell className="pl-10 text-muted-foreground">↳ Nouveaux abos</TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-muted-foreground">
                        {fmtCurrency(y.subsRevenue, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="text-xs">
                    <TableCell className="pl-10 text-muted-foreground">↳ Legacy</TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-muted-foreground">
                        {fmtCurrency(y.legacyRevenue, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="text-xs">
                    <TableCell className="pl-10 text-muted-foreground">↳ Prestations</TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-muted-foreground">
                        {fmtCurrency(y.prestationsRevenue, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="text-xs">
                    <TableCell className="pl-10 text-muted-foreground">↳ Merchandising</TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-muted-foreground">
                        {fmtCurrency(y.merchRevenue, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                </Fragment>
              )}

              {/* Total OPEX */}
              <TableRow className="font-bold border-t-2 bg-muted/30">
                <TableCell>
                  <CollapseToggle open={isExpanded("opex")} onToggle={() => toggle("opex")}>
                    <LineWithAnalysis label="Total OPEX" />
                  </CollapseToggle>
                </TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    ({fmtCurrency(y.totalOpex, { compact: true })})
                  </TableCell>
                ))}
              </TableRow>

              {isExpanded("opex") && (
                <Fragment>
                  {/* Salaires */}
                  <TableRow>
                    <TableCell className="pl-6">
                      <CollapseToggle
                        open={isExpanded("salaries")}
                        onToggle={() => toggle("salaries")}
                      >
                        <LineWithAnalysis label="Salaires" />
                      </CollapseToggle>
                    </TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-red-700">
                        ({fmtCurrency(y.salaries, { compact: true })})
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded("salaries") &&
                    renderDetailRows(salDetail, { negative: true, indent: "deep" })}

                  {/* Loyer */}
                  <TableRow>
                    <TableCell className="pl-6">
                      <CollapseToggle open={isExpanded("rent")} onToggle={() => toggle("rent")}>
                        <LineWithAnalysis label="Loyer" />
                      </CollapseToggle>
                    </TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-red-700">
                        ({fmtCurrency(y.rent, { compact: true })})
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded("rent") &&
                    renderDetailRows(rentDetail, { negative: true, indent: "deep" })}

                  {/* Récurrent */}
                  <TableRow>
                    <TableCell className="pl-6">
                      {recDetail.length > 0 ? (
                        <CollapseToggle
                          open={isExpanded("recurring")}
                          onToggle={() => toggle("recurring")}
                        >
                          <LineWithAnalysis label="Récurrent" />
                        </CollapseToggle>
                      ) : (
                        <LineWithAnalysis label="Récurrent" />
                      )}
                    </TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-red-700">
                        ({fmtCurrency(y.recurring, { compact: true })})
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded("recurring") &&
                    renderDetailRows(recDetail, { negative: true, indent: "deep" })}

                  {/* Marketing */}
                  <TableRow>
                    <TableCell className="pl-6">
                      <LineWithAnalysis label="Marketing" />
                    </TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-red-700">
                        ({fmtCurrency(y.marketing, { compact: true })})
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Provisions */}
                  <TableRow>
                    <TableCell className="pl-6">
                      <LineWithAnalysis label="Provisions" />
                    </TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-red-700">
                        ({fmtCurrency(y.provisions, { compact: true })})
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Ponctuels */}
                  <TableRow>
                    <TableCell className="pl-6">
                      <LineWithAnalysis label="Ponctuels" />
                    </TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-red-700">
                        ({fmtCurrency(y.oneOff, { compact: true })})
                      </TableCell>
                    ))}
                  </TableRow>
                </Fragment>
              )}

              {/* EBITDA */}
              <TableRow className="font-bold bg-emerald-50/50">
                <TableCell><LineWithAnalysis label="EBITDA" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell
                    key={i}
                    className={"text-right " + (y.ebitda >= 0 ? "text-emerald-700" : "text-red-700")}
                  >
                    {fmtCurrency(y.ebitda, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="text-xs text-muted-foreground">
                <TableCell className="pl-6">Marge EBITDA</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">
                    {fmtPct(y.ebitdaMargin)}
                  </TableCell>
                ))}
              </TableRow>

              {/* D&A */}
              <TableRow>
                <TableCell>
                  {daDetail.length > 0 ? (
                    <CollapseToggle open={isExpanded("da")} onToggle={() => toggle("da")}>
                      <LineWithAnalysis label="D&A" />
                    </CollapseToggle>
                  ) : (
                    <LineWithAnalysis label="D&A" />
                  )}
                </TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    {y.da > 0 ? `(${fmtCurrency(y.da, { compact: true })})` : "—"}
                  </TableCell>
                ))}
              </TableRow>
              {isExpanded("da") && renderDetailRows(daDetail, { negative: true })}

              <TableRow className="font-semibold">
                <TableCell><LineWithAnalysis label="EBIT" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell
                    key={i}
                    className={"text-right " + (y.ebit >= 0 ? "" : "text-red-700")}
                  >
                    {fmtCurrency(y.ebit, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>

              {/* Intérêts */}
              <TableRow>
                <TableCell>
                  {intDetail.length > 0 ? (
                    <CollapseToggle open={isExpanded("interest")} onToggle={() => toggle("interest")}>
                      <LineWithAnalysis label="Intérêts" />
                    </CollapseToggle>
                  ) : (
                    <LineWithAnalysis label="Intérêts" />
                  )}
                </TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    {y.interestExpense > 0 ? `(${fmtCurrency(y.interestExpense, { compact: true })})` : "—"}
                  </TableCell>
                ))}
              </TableRow>
              {isExpanded("interest") && renderDetailRows(intDetail, { negative: true })}

              <TableRow className="font-semibold">
                <TableCell><LineWithAnalysis label="PBT" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell
                    key={i}
                    className={"text-right " + (y.pbt >= 0 ? "" : "text-red-700")}
                  >
                    {fmtCurrency(y.pbt, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              {params.tax.enableLossCarryForward !== false && result.yearly.some((y) => y.lossUsedThisYear > 0 || y.lossCarryForwardBalanceEnd > 0) && (
                <>
                  <TableRow className="text-xs">
                    <TableCell className="pl-6 text-muted-foreground">↳ Déficit reporté utilisé</TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-muted-foreground">
                        {y.lossUsedThisYear > 0 ? `(${fmtCurrency(y.lossUsedThisYear, { compact: true })})` : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="text-xs">
                    <TableCell className="pl-6 text-muted-foreground">↳ Base imposable après carry-forward</TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-muted-foreground">
                        {fmtCurrency(y.taxableIncomeAfterCarryForward, { compact: true })}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="text-xs">
                    <TableCell className="pl-6 text-muted-foreground">↳ Solde déficits reportables (fin FY)</TableCell>
                    {result.yearly.map((y, i) => (
                      <TableCell key={i} className="text-right text-muted-foreground">
                        {y.lossCarryForwardBalanceEnd > 0
                          ? fmtCurrency(y.lossCarryForwardBalanceEnd, { compact: true })
                          : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                </>
              )}
              <TableRow>
                <TableCell><LineWithAnalysis label="Impôts" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-red-700">
                    {y.tax > 0 ? `(${fmtCurrency(y.tax, { compact: true })})` : "—"}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-bold border-t-2 bg-[#D32F2F]/5">
                <TableCell><LineWithAnalysis label="Résultat net" /></TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell
                    key={i}
                    className={"text-right " + (y.netIncome >= 0 ? "text-emerald-700" : "text-red-700")}
                  >
                    {fmtCurrency(y.netIncome, { compact: true })}
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
