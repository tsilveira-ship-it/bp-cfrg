"use client";
import { useMemo } from "react";
import { fmtCurrency } from "@/lib/format";

export type SankeyNode = {
  id: string;
  label: string;
  value: number;
  column: 0 | 1 | 2;
  color: string;
};

export type SankeyLink = {
  from: string;
  to: string;
  value: number;
};

type Props = {
  nodes: SankeyNode[];
  links: SankeyLink[];
  height?: number;
};

const PADDING = 8;
const NODE_WIDTH = 18;

export function SankeyFunds({ nodes, links, height = 420 }: Props) {
  const layout = useMemo(() => {
    // Group nodes by column
    const cols: SankeyNode[][] = [[], [], []];
    for (const n of nodes) cols[n.column].push(n);

    const colTotals = cols.map((c) => c.reduce((s, n) => s + n.value, 0));
    const maxTotal = Math.max(1, ...colTotals);

    // Compute y positions for each column proportionally
    type LaidNode = SankeyNode & { y0: number; y1: number; x0: number; x1: number };
    const laid: Record<string, LaidNode> = {};

    cols.forEach((col, cIdx) => {
      const total = colTotals[cIdx];
      const usableHeight = height - PADDING * 2 - PADDING * Math.max(0, col.length - 1);
      const scale = usableHeight / Math.max(1, total);
      let y = PADDING;
      const x0 = cIdx === 0 ? 0 : cIdx === 1 ? 0.5 : 1;
      // converted to viewBox of 100 width units, columns at x=0, 50, 100
      const xUnit = cIdx * 50;
      for (const n of col) {
        const h = Math.max(2, n.value * scale);
        laid[n.id] = { ...n, y0: y, y1: y + h, x0: xUnit, x1: xUnit + NODE_WIDTH };
        y += h + PADDING;
      }
      // Center column if shorter than max
      if (total < maxTotal) {
        const ratio = total / maxTotal;
        const offset = ((1 - ratio) * (height - PADDING * 2)) / 2;
        for (const n of col) {
          const ln = laid[n.id];
          ln.y0 += offset;
          ln.y1 += offset;
        }
      }
    });

    // Build link paths
    type LaidLink = { d: string; value: number; from: LaidNode; to: LaidNode; idx: number };
    const fromOffsets: Record<string, number> = {};
    const toOffsets: Record<string, number> = {};
    const linkPaths: LaidLink[] = links.map((l, idx) => {
      const a = laid[l.from];
      const b = laid[l.to];
      if (!a || !b) return null as unknown as LaidLink;
      const aHeight = a.y1 - a.y0;
      const bHeight = b.y1 - b.y0;
      const aShare = (l.value / a.value) * aHeight;
      const bShare = (l.value / b.value) * bHeight;
      const aY0 = a.y0 + (fromOffsets[a.id] ?? 0);
      const aY1 = aY0 + aShare;
      fromOffsets[a.id] = (fromOffsets[a.id] ?? 0) + aShare;
      const bY0 = b.y0 + (toOffsets[b.id] ?? 0);
      const bY1 = bY0 + bShare;
      toOffsets[b.id] = (toOffsets[b.id] ?? 0) + bShare;
      const x0 = a.x1;
      const x1 = b.x0;
      const cx = (x0 + x1) / 2;
      const d = `M ${x0} ${aY0} C ${cx} ${aY0}, ${cx} ${bY0}, ${x1} ${bY0} L ${x1} ${bY1} C ${cx} ${bY1}, ${cx} ${aY1}, ${x0} ${aY1} Z`;
      return { d, value: l.value, from: a, to: b, idx };
    }).filter(Boolean);

    return { laidNodes: Object.values(laid), linkPaths };
  }, [nodes, links, height]);

  return (
    <svg
      viewBox={`0 0 118 ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      {layout.linkPaths.map((l) => (
        <path
          key={l.idx}
          d={l.d}
          fill={l.from.color}
          fillOpacity={0.18}
          stroke={l.from.color}
          strokeOpacity={0.05}
        >
          <title>
            {l.from.label} → {l.to.label}: {fmtCurrency(l.value, { compact: true })}
          </title>
        </path>
      ))}
      {layout.laidNodes.map((n) => (
        <g key={n.id}>
          <rect
            x={n.x0}
            y={n.y0}
            width={NODE_WIDTH}
            height={Math.max(0, n.y1 - n.y0)}
            fill={n.color}
            stroke={n.color}
          >
            <title>
              {n.label}: {fmtCurrency(n.value, { compact: true })}
            </title>
          </rect>
        </g>
      ))}
      {layout.laidNodes.map((n) => {
        const yMid = (n.y0 + n.y1) / 2;
        const anchor = n.column === 2 ? "end" : "start";
        const x = n.column === 2 ? n.x0 - 1.5 : n.x1 + 1.5;
        return (
          <text
            key={`t-${n.id}`}
            x={x}
            y={yMid}
            dominantBaseline="middle"
            textAnchor={anchor}
            fontSize="3.5"
            fill="#1a1a1a"
            fontWeight={500}
            style={{ paintOrder: "stroke" }}
            stroke="white"
            strokeWidth={0.6}
          >
            {n.label} ({fmtCurrency(n.value, { compact: true })})
          </text>
        );
      })}
    </svg>
  );
}
