"use client";
import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency } from "@/lib/format";

type Fortnight = {
  label: string;
  monthLabel: string;
  half: 1 | 2;
  monthIdx: number;
  revenue: number;
  salaries: number;
  rent: number;
  recurring: number;
  marketing: number;
  oneOff: number;
  capex: number;
  fundraise: number;
  loanRepay: number;
  interestCash: number;
  taxCash: number;
  vatCashOut: number;
  netCashFlow: number;
  cashBalance: number;
};

export default function PlanQuinzainesPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);

  const { fortnights, totals } = useMemo(() => {
    const months = result.monthly.slice(0, 12);
    const fns: Fortnight[] = [];
    let cash = params.openingCash;

    for (const m of months) {
      // Q1: 1ère quinzaine — encaisse loyer (TLP1) + CAPEX (M0) + 50% du reste; salaires en Q2
      // Q2: 2ème quinzaine — salaires + 50% du reste
      const half1Salaries = 0;
      const half2Salaries = m.salaries;
      const splitHalf = (v: number) => v / 2;

      const half1Rent = m.rent;        // payé début de mois
      const half2Rent = 0;
      const half1Capex = m.capex;      // M0 fortement front-loaded
      const half2Capex = 0;
      const half1Fundraise = m.fundraise; // apports en début de mois
      const half2Fundraise = 0;

      const half1: Fortnight = {
        label: `${m.label} — Q1`,
        monthLabel: m.label,
        half: 1,
        monthIdx: m.month,
        revenue: splitHalf(m.totalRevenue),
        salaries: half1Salaries,
        rent: half1Rent,
        recurring: splitHalf(m.recurringEntretien + m.recurringFraisOp),
        marketing: splitHalf(m.marketing),
        oneOff: splitHalf(m.oneOff),
        capex: half1Capex,
        fundraise: half1Fundraise,
        loanRepay: splitHalf(m.loanPrincipalRepay),
        interestCash: splitHalf(m.interestExpense),
        taxCash: splitHalf(m.taxCash),
        vatCashOut: splitHalf(m.vatCashOut),
        netCashFlow: 0,
        cashBalance: 0,
      };
      half1.netCashFlow =
        half1.revenue +
        half1.fundraise -
        (half1.salaries +
          half1.rent +
          half1.recurring +
          half1.marketing +
          half1.oneOff +
          half1.capex +
          half1.loanRepay +
          half1.interestCash +
          half1.taxCash +
          half1.vatCashOut);
      cash += half1.netCashFlow;
      half1.cashBalance = cash;
      fns.push(half1);

      const half2: Fortnight = {
        label: `${m.label} — Q2`,
        monthLabel: m.label,
        half: 2,
        monthIdx: m.month,
        revenue: splitHalf(m.totalRevenue),
        salaries: half2Salaries,
        rent: half2Rent,
        recurring: splitHalf(m.recurringEntretien + m.recurringFraisOp),
        marketing: splitHalf(m.marketing),
        oneOff: splitHalf(m.oneOff),
        capex: half2Capex,
        fundraise: half2Fundraise,
        loanRepay: splitHalf(m.loanPrincipalRepay),
        interestCash: splitHalf(m.interestExpense),
        taxCash: splitHalf(m.taxCash),
        vatCashOut: splitHalf(m.vatCashOut),
        netCashFlow: 0,
        cashBalance: 0,
      };
      half2.netCashFlow =
        half2.revenue +
        half2.fundraise -
        (half2.salaries +
          half2.rent +
          half2.recurring +
          half2.marketing +
          half2.oneOff +
          half2.capex +
          half2.loanRepay +
          half2.interestCash +
          half2.taxCash +
          half2.vatCashOut);
      cash += half2.netCashFlow;
      half2.cashBalance = cash;
      fns.push(half2);
    }

    const tot = {
      revenue: fns.reduce((s, f) => s + f.revenue, 0),
      salaries: fns.reduce((s, f) => s + f.salaries, 0),
      rent: fns.reduce((s, f) => s + f.rent, 0),
      recurring: fns.reduce((s, f) => s + f.recurring, 0),
      marketing: fns.reduce((s, f) => s + f.marketing, 0),
      oneOff: fns.reduce((s, f) => s + f.oneOff, 0),
      capex: fns.reduce((s, f) => s + f.capex, 0),
      fundraise: fns.reduce((s, f) => s + f.fundraise, 0),
      loanRepay: fns.reduce((s, f) => s + f.loanRepay, 0),
      interestCash: fns.reduce((s, f) => s + f.interestCash, 0),
      taxCash: fns.reduce((s, f) => s + f.taxCash, 0),
      vatCashOut: fns.reduce((s, f) => s + f.vatCashOut, 0),
      netCashFlow: fns.reduce((s, f) => s + f.netCashFlow, 0),
    };

    return { fortnights: fns, totals: tot };
  }, [params, result]);

  const minCash = Math.min(...fortnights.map((f) => f.cashBalance));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-[#D32F2F]" /> Plan de financement an 1 — quinzaines
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Décaissements/encaissements par quinzaine (24 lignes) sur les 12 premiers mois.
            Critique pour dossier banque & BPI.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Tréso ouverture
            </div>
            <div className="text-2xl font-heading font-bold">
              {fmtCurrency(params.openingCash, { compact: true })}
            </div>
          </CardContent>
        </Card>
        <Card className={minCash < 0 ? "border-red-300 bg-red-50/30" : ""}>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Creux tréso (24 quinzaines)
            </div>
            <div className={"text-2xl font-heading font-bold " + (minCash < 0 ? "text-red-700" : "")}>
              {fmtCurrency(minCash, { compact: true })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Tréso fin Q24
            </div>
            <div className="text-2xl font-heading font-bold">
              {fmtCurrency(fortnights[fortnights.length - 1]?.cashBalance ?? 0, { compact: true })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail par quinzaine</CardTitle>
          <p className="text-xs text-muted-foreground">
            Conventions: Loyer & apports en Q1 du mois ; salaires en Q2 ; CAPEX en Q1 du M0.
            Le reste est lissé 50/50.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quinzaine</TableHead>
                <TableHead className="text-right">+ Recettes</TableHead>
                <TableHead className="text-right">+ Apports</TableHead>
                <TableHead className="text-right">− Salaires</TableHead>
                <TableHead className="text-right">− Loyer</TableHead>
                <TableHead className="text-right">− OPEX divers</TableHead>
                <TableHead className="text-right">− CAPEX</TableHead>
                <TableHead className="text-right">− Service dette</TableHead>
                <TableHead className="text-right">− IS/TVA cash</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Solde cumulé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fortnights.map((f, i) => {
                const opexDiv = f.recurring + f.marketing + f.oneOff;
                const debt = f.loanRepay + f.interestCash;
                const fiscalCash = f.taxCash + f.vatCashOut;
                return (
                  <TableRow
                    key={i}
                    className={
                      f.cashBalance < 0
                        ? "bg-red-50/40"
                        : f.half === 1
                          ? "bg-muted/20"
                          : ""
                    }
                  >
                    <TableCell className="text-xs font-mono whitespace-nowrap">{f.label}</TableCell>
                    <TableCell className="text-right text-xs">
                      {f.revenue ? fmtCurrency(f.revenue, { compact: true }) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {f.fundraise ? fmtCurrency(f.fundraise, { compact: true }) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-red-700">
                      {f.salaries ? `(${fmtCurrency(f.salaries, { compact: true })})` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-red-700">
                      {f.rent ? `(${fmtCurrency(f.rent, { compact: true })})` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-red-700">
                      {opexDiv ? `(${fmtCurrency(opexDiv, { compact: true })})` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-red-700">
                      {f.capex ? `(${fmtCurrency(f.capex, { compact: true })})` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-red-700">
                      {debt ? `(${fmtCurrency(debt, { compact: true })})` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-red-700">
                      {fiscalCash ? `(${fmtCurrency(fiscalCash, { compact: true })})` : "—"}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right text-xs font-semibold " +
                        (f.netCashFlow >= 0 ? "text-emerald-700" : "text-red-700")
                      }
                    >
                      {fmtCurrency(f.netCashFlow, { compact: true })}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right text-xs font-bold " +
                        (f.cashBalance < 0 ? "text-red-700" : "")
                      }
                    >
                      {fmtCurrency(f.cashBalance, { compact: true })}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-bold border-t-2 bg-muted/40">
                <TableCell>Total an 1</TableCell>
                <TableCell className="text-right">{fmtCurrency(totals.revenue, { compact: true })}</TableCell>
                <TableCell className="text-right">{fmtCurrency(totals.fundraise, { compact: true })}</TableCell>
                <TableCell className="text-right text-red-700">({fmtCurrency(totals.salaries, { compact: true })})</TableCell>
                <TableCell className="text-right text-red-700">({fmtCurrency(totals.rent, { compact: true })})</TableCell>
                <TableCell className="text-right text-red-700">
                  ({fmtCurrency(totals.recurring + totals.marketing + totals.oneOff, { compact: true })})
                </TableCell>
                <TableCell className="text-right text-red-700">({fmtCurrency(totals.capex, { compact: true })})</TableCell>
                <TableCell className="text-right text-red-700">
                  ({fmtCurrency(totals.loanRepay + totals.interestCash, { compact: true })})
                </TableCell>
                <TableCell className="text-right text-red-700">
                  ({fmtCurrency(totals.taxCash + totals.vatCashOut, { compact: true })})
                </TableCell>
                <TableCell className="text-right">
                  {fmtCurrency(totals.netCashFlow, { compact: true })}
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
