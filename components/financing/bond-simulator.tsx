"use client";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { simulate, type BondInput } from "@/lib/bond";
import { fmtCurrency } from "@/lib/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  LineChart,
} from "recharts";

const BRAND = "#D32F2F";
const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "12px",
};

export function BondSimulator() {
  const [input, setInput] = useState<BondInput>({
    principal: 200000,
    annualRatePct: 6,
    termYears: 5,
    frequency: 1,
    amortization: "bullet",
    deferralYears: 2,
    capitalizeInterest: true,
    convertible: false,
    startDate: "2026-09-01",
  });

  const result = useMemo(() => simulate(input), [input]);

  const annualData = result.annual.map((a) => ({
    label: String(a.year),
    Coupon: a.couponPaid,
    Principal: a.principalRepaid,
    Capitalisé: a.capitalizedInterest,
  }));

  const balanceData = result.schedule.map((r) => ({
    label: r.date,
    Encours: r.closingBalance,
  }));

  const totalCost =
    result.totals.totalCouponPaid +
    result.totals.totalCapitalized +
    (result.totals.totalPrincipalRepaid - input.principal);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Simulateur d&apos;obligation</CardTitle>
          <p className="text-xs text-muted-foreground">
            Indépendant du BP. Pour tester un produit avant de l&apos;ajouter dans tes obligations.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Capital (€)</Label>
              <Input
                type="number"
                value={input.principal}
                onChange={(e) =>
                  setInput({ ...input, principal: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Taux annuel (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={input.annualRatePct}
                onChange={(e) =>
                  setInput({ ...input, annualRatePct: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Durée (années)</Label>
              <Input
                type="number"
                step="0.5"
                value={input.termYears}
                onChange={(e) =>
                  setInput({ ...input, termYears: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Différé (années)</Label>
              <Input
                type="number"
                step="0.5"
                value={input.deferralYears}
                onChange={(e) =>
                  setInput({ ...input, deferralYears: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Fréquence</Label>
              <select
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={input.frequency}
                onChange={(e) =>
                  setInput({ ...input, frequency: parseInt(e.target.value) as 1 | 2 | 4 })
                }
              >
                <option value={1}>Annuel</option>
                <option value={2}>Semestriel</option>
                <option value={4}>Trimestriel</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Remboursement</Label>
              <select
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={input.amortization}
                onChange={(e) =>
                  setInput({ ...input, amortization: e.target.value as "bullet" | "linear" })
                }
              >
                <option value="bullet">In fine</option>
                <option value="linear">Linéaire</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Date départ</Label>
              <Input
                type="date"
                value={input.startDate}
                onChange={(e) => setInput({ ...input, startDate: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 px-2 py-2 border rounded-md bg-background self-end">
              <Switch
                checked={input.capitalizeInterest}
                onCheckedChange={(v) => setInput({ ...input, capitalizeInterest: v })}
              />
              <Label className="text-xs">PIK (capitalisation)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Capital initial</div>
            <div className="text-xl font-bold mt-1">{fmtCurrency(input.principal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Capital après différé
            </div>
            <div className="text-xl font-bold mt-1">
              {fmtCurrency(result.totals.grownPrincipalAfterDeferral)}
            </div>
            {input.capitalizeInterest && (
              <div className="text-[10px] text-muted-foreground mt-1">PIK accumulé</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Coupons cash</div>
            <div className="text-xl font-bold mt-1">{fmtCurrency(result.totals.totalCouponPaid)}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#D32F2F]/5 border-[#D32F2F]/30">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Coût total</div>
            <div className="text-xl font-bold mt-1 text-[#D32F2F]">{fmtCurrency(totalCost)}</div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flux annuels</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={annualData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => fmtCurrency(v, { compact: true })} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Coupon" stackId="a" fill={BRAND} />
                <Bar dataKey="Principal" stackId="a" fill="#1a1a1a" />
                <Bar dataKey="Capitalisé" stackId="a" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Encours capital</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => fmtCurrency(v, { compact: true })} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
                <Line type="monotone" dataKey="Encours" stroke={BRAND} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Échéancier détaillé</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[60vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead className="text-right">Solde ouv.</TableHead>
                  <TableHead className="text-right">Intérêts</TableHead>
                  <TableHead className="text-right">Capitalisé</TableHead>
                  <TableHead className="text-right">Coupon</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Flux</TableHead>
                  <TableHead className="text-right">Solde clôt.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.schedule.map((r) => (
                  <TableRow
                    key={r.period}
                    className={r.phase === "deferral" ? "bg-amber-50/30" : ""}
                  >
                    <TableCell className="text-xs">{r.period}</TableCell>
                    <TableCell className="text-xs">{r.date}</TableCell>
                    <TableCell className="text-xs">
                      {r.phase === "deferral" ? "Différé" : "Service"}
                    </TableCell>
                    <TableCell className="text-right text-xs">{fmtCurrency(r.openingBalance)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtCurrency(r.interest)}</TableCell>
                    <TableCell className="text-right text-xs text-amber-700">
                      {r.capitalizedInterest > 0 ? fmtCurrency(r.capitalizedInterest) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {r.couponPaid > 0 ? fmtCurrency(r.couponPaid) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {r.principalRepaid > 0 ? fmtCurrency(r.principalRepaid) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {fmtCurrency(r.totalCashFlow)}
                    </TableCell>
                    <TableCell className="text-right text-xs">{fmtCurrency(r.closingBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
