"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { fmtCurrency } from "@/lib/format";

const BRAND = "#84171d";
const PALETTE = [BRAND, "#5a0f14", "#c54552", "#3a3a3a", "#7a7a7a", "#b8a888"];

type Datum = Record<string, number | string>;

function compactCurrency(v: number) {
  return fmtCurrency(v, { compact: true });
}

const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "12px",
};

export function RevenueEbitdaChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => fmtCurrency(Number(v))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="CA" fill={BRAND} radius={[4, 4, 0, 0]} />
        <Bar dataKey="EBITDA" fill="#3a3a3a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CashFlowChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND} stopOpacity={0.4} />
            <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
        <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke="#999" />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
        <Area
          type="monotone"
          dataKey="Trésorerie"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#cashGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlyEbitdaChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
        <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke="#999" />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
        <Bar dataKey="EBITDA mensuel">
          {data.map((d, i) => (
            <Cell key={i} fill={(d.EBITDA_mensuel as number) >= 0 ? "#10b981" : "#dc2626"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueBreakdownChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }} stackOffset="sign">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Nouveaux abos" stackId="rev" fill={PALETTE[0]} />
        <Bar dataKey="Legacy" stackId="rev" fill={PALETTE[1]} />
        <Bar dataKey="Prestations" stackId="rev" fill={PALETTE[2]} />
        <Bar dataKey="Merchandising" stackId="rev" fill={PALETTE[3]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CostBreakdownChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtCurrency(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Salaires" stackId="c" fill={PALETTE[0]} />
        <Bar dataKey="Loyer" stackId="c" fill={PALETTE[1]} />
        <Bar dataKey="Récurrent" stackId="c" fill={PALETTE[2]} />
        <Bar dataKey="Marketing" stackId="c" fill={PALETTE[3]} />
        <Bar dataKey="Provisions" stackId="c" fill={PALETTE[4]} />
        <Bar dataKey="Ponctuels" stackId="c" fill={PALETTE[5]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MembersChart({ data }: { data: Datum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={5} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Nouveaux abos" stroke={BRAND} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Legacy" stroke="#3a3a3a" strokeWidth={2} dot={false} strokeDasharray="4 4" />
        <Line type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
