"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { fmtCurrency } from "@/lib/format";

const POSITIVE_COLOR = "#16a34a";
const NEGATIVE_COLOR = "#D32F2F";
const TOTAL_COLOR = "#1a1a1a";
const SUBTOTAL_COLOR = "#6b7280";

export type WaterfallStep = {
  label: string;
  /** Valeur (>0 positif, <0 négatif). Ignoré si type="total"|"subtotal". */
  value: number;
  /** Marqueur de total ou sous-total (la valeur est le résultat cumulé). */
  type?: "step" | "subtotal" | "total";
};

type Internal = {
  label: string;
  base: number;       // float (start of bar)
  delta: number;      // amount added on top of base
  display: number;    // value shown in tooltip (signed)
  cumulative: number; // running total after this step
  type: "step" | "subtotal" | "total";
  positive: boolean;
};

function buildSeries(steps: WaterfallStep[]): Internal[] {
  const out: Internal[] = [];
  let running = 0;
  for (const s of steps) {
    const t = s.type ?? "step";
    if (t === "total" || t === "subtotal") {
      // Bar from 0 to running (which should equal s.value typically)
      out.push({
        label: s.label,
        base: Math.min(0, running),
        delta: Math.abs(running),
        display: running,
        cumulative: running,
        type: t,
        positive: running >= 0,
      });
    } else {
      const before = running;
      running += s.value;
      const positive = s.value >= 0;
      // base = min(before, after), delta = |s.value|
      const base = Math.min(before, running);
      out.push({
        label: s.label,
        base,
        delta: Math.abs(s.value),
        display: s.value,
        cumulative: running,
        type: "step",
        positive,
      });
    }
  }
  return out;
}

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

export function WaterfallChart({ steps, height = 320 }: { steps: WaterfallStep[]; height?: number }) {
  const data = buildSeries(steps);

  const colorOf = (d: Internal) =>
    d.type === "total"
      ? TOTAL_COLOR
      : d.type === "subtotal"
        ? SUBTOTAL_COLOR
        : d.positive
          ? POSITIVE_COLOR
          : NEGATIVE_COLOR;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 11 }} />
        <ReferenceLine y={0} stroke="#9ca3af" />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(_v, _name, payload) => {
            const d = payload?.payload as Internal | undefined;
            if (!d) return "—";
            return [fmtCurrency(d.display), d.type === "step" ? (d.positive ? "Apport" : "Retrait") : "Total"];
          }}
          labelFormatter={(l) => l}
        />
        {/* Invisible base (transparent) + visible delta */}
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="delta" stackId="w" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorOf(d)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
