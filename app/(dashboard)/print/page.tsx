"use client";
import { useMemo } from "react";
import Image from "next/image";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { generateSynthesis } from "@/lib/synthesis";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { Printer } from "lucide-react";

export default function PrintPage() {
  const params = useModelStore((s) => s.params);
  const loaded = useModelStore((s) => s.loaded);
  const result = useMemo(() => computeModel(params), [params]);
  const synthesis = generateSynthesis(result, params);

  const totalEquity = (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const totalLoans = (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0);
  const totalBonds = (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Vue impression / export PDF</h1>
          <p className="text-sm text-muted-foreground">
            Utilise Ctrl+P (Cmd+P sur Mac) → "Enregistrer au format PDF".
          </p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimer / PDF
        </Button>
      </div>

      <div className="space-y-6 print:text-[11px]">
        <header className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-[#111] rounded p-1.5">
              <Image src="/logo-rg.svg" alt="CFRG" width={36} height={36} />
            </div>
            <div>
              <h1 className="font-heading uppercase text-2xl font-bold tracking-wide">
                CrossFit Rive Gauche
              </h1>
              <p className="text-sm text-muted-foreground">
                Business Plan {result.yearly[0].label} → {result.yearly[result.yearly.length - 1].label}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>
              {loaded.kind === "master"
                ? `Master v${loaded.version}`
                : loaded.kind === "fork"
                ? `Fork: ${loaded.name}`
                : "Local"}
            </div>
            <div>{new Date().toLocaleDateString("fr-FR")}</div>
          </div>
        </header>

        <section>
          <h2 className="font-heading uppercase text-base font-bold tracking-wider border-b mb-2">
            Synthèse
          </h2>
          <p className="text-sm leading-relaxed">{synthesis}</p>
        </section>

        <section>
          <h2 className="font-heading uppercase text-base font-bold tracking-wider border-b mb-2">
            Indicateurs clés
          </h2>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="border rounded p-2">
              <div className="text-muted-foreground uppercase text-[9px]">CA final</div>
              <div className="font-bold text-base">
                {fmtCurrency(result.yearly[result.yearly.length - 1].totalRevenue, { compact: true })}
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="text-muted-foreground uppercase text-[9px]">EBITDA final</div>
              <div className="font-bold text-base">
                {fmtCurrency(result.yearly[result.yearly.length - 1].ebitda, { compact: true })}
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="text-muted-foreground uppercase text-[9px]">Trésorerie min</div>
              <div className="font-bold text-base">
                {fmtCurrency(result.cashTroughValue, { compact: true })}
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="text-muted-foreground uppercase text-[9px]">Total levé</div>
              <div className="font-bold text-base">
                {fmtCurrency(totalEquity + totalLoans + totalBonds, { compact: true })}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-heading uppercase text-base font-bold tracking-wider border-b mb-2">
            Compte de résultat
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ligne</TableHead>
                {result.yearly.map((y) => (
                  <TableHead key={y.fy} className="text-right text-xs">
                    {y.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-semibold">
                <TableCell>CA HT</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-xs">
                    {fmtCurrency(y.totalRevenue, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>OPEX</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-xs">
                    ({fmtCurrency(y.totalOpex, { compact: true })})
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-bold bg-muted/30">
                <TableCell>EBITDA</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-xs">
                    {fmtCurrency(y.ebitda, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="text-xs text-muted-foreground">
                <TableCell>Marge EBITDA</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right">
                    {fmtPct(y.ebitdaMargin)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>Résultat net</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-xs">
                    {fmtCurrency(y.netIncome, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </section>

        <section className="break-inside-avoid">
          <h2 className="font-heading uppercase text-base font-bold tracking-wider border-b mb-2">
            Trésorerie & financement
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flux</TableHead>
                {result.yearly.map((y) => (
                  <TableHead key={y.fy} className="text-right text-xs">
                    {y.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>CFO</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-xs">
                    {fmtCurrency(y.cfo, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>CFI</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-xs">
                    {fmtCurrency(y.cfi, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell>CFF</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-xs">
                    {fmtCurrency(y.cff, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="font-bold bg-muted/30">
                <TableCell>Tréso fin</TableCell>
                {result.yearly.map((y, i) => (
                  <TableCell key={i} className="text-right text-xs">
                    {fmtCurrency(y.cashEnd, { compact: true })}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </section>

        <section className="break-inside-avoid">
          <h2 className="font-heading uppercase text-base font-bold tracking-wider border-b mb-2">
            Plan de financement
          </h2>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="border rounded p-2">
              <div className="text-muted-foreground">Apports / Equity</div>
              <div className="font-bold">{fmtCurrency(totalEquity)}</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-muted-foreground">Emprunts bancaires</div>
              <div className="font-bold">{fmtCurrency(totalLoans)}</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-muted-foreground">Obligations</div>
              <div className="font-bold">{fmtCurrency(totalBonds)}</div>
            </div>
          </div>
        </section>

        {params.notes && Object.keys(params.notes).length > 0 && (
          <section className="break-inside-avoid">
            <h2 className="font-heading uppercase text-base font-bold tracking-wider border-b mb-2">
              Notes
            </h2>
            <div className="space-y-2 text-xs">
              {Object.entries(params.notes).map(([k, v]) => (
                <div key={k}>
                  <div className="font-semibold">{k}</div>
                  <p className="text-muted-foreground">{v}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="border-t pt-3 text-[9px] text-muted-foreground">
          BP CFRG — Généré le {new Date().toLocaleString("fr-FR")} · Confidentiel
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          aside,
          nav,
          .print\\:hidden {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 1cm !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
