"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency } from "@/lib/format";
import type { ModelResult } from "@/lib/model/types";

type Flows = {
  inflow: number[];
  interestCash: number[];
  principalCash: number[];
  capitalized: number[];
};

const BRAND = "#D32F2F";
const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "12px",
};

export function FinancingTimeline({ flows, result }: { flows: Flows; result: ModelResult }) {
  // Aggregate per FY for readable summary
  const yearlyAgg = result.yearly.map((y, fy) => {
    const start = fy * 12;
    const end = (fy + 1) * 12;
    const inflow = flows.inflow.slice(start, end).reduce((s, x) => s + x, 0);
    const interestCash = flows.interestCash.slice(start, end).reduce((s, x) => s + x, 0);
    const principalCash = flows.principalCash.slice(start, end).reduce((s, x) => s + x, 0);
    const capitalized = flows.capitalized.slice(start, end).reduce((s, x) => s + x, 0);
    return {
      label: y.label,
      Inflow: inflow,
      "Intérêts cash": -interestCash,
      "Principal cash": -principalCash,
      Capitalisé: capitalized,
      net: inflow - interestCash - principalCash,
    };
  });

  const monthlyData = result.monthly.map((m, i) => ({
    label: m.label,
    Inflow: flows.inflow[i],
    "Intérêts cash": -flows.interestCash[i],
    "Principal cash": -flows.principalCash[i],
  }));

  const chartWidth = Math.max(monthlyData.length * 22, 800);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flux financiers — agrégé annuel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyAgg}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtCurrency(v, { compact: true })} tick={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#999" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Inflow" stackId="a" fill="#10b981" />
              <Bar dataKey="Intérêts cash" stackId="a" fill={BRAND} />
              <Bar dataKey="Principal cash" stackId="a" fill="#1a1a1a" />
              <Bar dataKey="Capitalisé" stackId="b" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail mensuel scrollable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2">
            <div style={{ width: chartWidth }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} angle={-45} textAnchor="end" height={50} />
                  <YAxis tickFormatter={(v) => fmtCurrency(v, { compact: true })} tick={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#999" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Inflow" stackId="a" fill="#10b981" />
                  <Bar dataKey="Intérêts cash" stackId="a" fill={BRAND} />
                  <Bar dataKey="Principal cash" stackId="a" fill="#1a1a1a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synthèse annuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Année</TableHead>
                <TableHead className="text-right">Inflow</TableHead>
                <TableHead className="text-right">Intérêts cash</TableHead>
                <TableHead className="text-right">Principal cash</TableHead>
                <TableHead className="text-right">Capitalisé (PIK)</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearlyAgg.map((y, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{y.label}</TableCell>
                  <TableCell className="text-right text-emerald-700">
                    {y.Inflow > 0 ? fmtCurrency(y.Inflow, { compact: true }) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-red-700">
                    {y["Intérêts cash"] < 0 ? fmtCurrency(y["Intérêts cash"], { compact: true }) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {y["Principal cash"] < 0 ? fmtCurrency(y["Principal cash"], { compact: true }) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-amber-700">
                    {y.Capitalisé > 0 ? fmtCurrency(y.Capitalisé, { compact: true }) : "—"}
                  </TableCell>
                  <TableCell className={"text-right font-semibold " + (y.net >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {fmtCurrency(y.net, { compact: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
