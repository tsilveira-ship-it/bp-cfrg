"use client";
import { useMemo, useState } from "react";
import type { ScenarioRow } from "@/app/actions/scenarios";
import { computeModel } from "@/lib/model/compute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { ArrowRight } from "lucide-react";

type DiffEntry = { path: string; a: unknown; b: unknown };

function flatten(obj: unknown, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (obj === null || obj === undefined || typeof obj !== "object") {
    out[prefix] = obj as unknown;
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      Object.assign(out, flatten(v, `${prefix}[${i}]`));
    });
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, flatten(v, p));
    else out[p] = v;
  }
  return out;
}

function diffParams(a: unknown, b: unknown): DiffEntry[] {
  const fa = flatten(a);
  const fb = flatten(b);
  const keys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  const out: DiffEntry[] = [];
  for (const k of keys) {
    const va = fa[k];
    const vb = fb[k];
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      out.push({ path: k, a: va, b: vb });
    }
  }
  return out.sort((x, y) => x.path.localeCompare(y.path));
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "number") {
    if (Number.isInteger(v) && Math.abs(v) < 100) return String(v);
    if (Math.abs(v) < 1) return (v * 100).toFixed(2) + "%";
    return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
  return String(v);
}

export function CompareView({ a, b }: { a: ScenarioRow; b: ScenarioRow }) {
  const ra = useMemo(() => computeModel(a.params), [a.params]);
  const rb = useMemo(() => computeModel(b.params), [b.params]);
  const [includeNotes, setIncludeNotes] = useState(false);
  const allDiffs = useMemo(() => diffParams(a.params, b.params), [a.params, b.params]);
  const diffs = useMemo(
    () =>
      includeNotes
        ? allDiffs
        : allDiffs.filter((d) => !d.path.startsWith("fieldNotes") && !d.path.startsWith("notes")),
    [allDiffs, includeNotes]
  );
  const grouped = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of diffs) {
      const top = d.path.split(/[.[]/)[0];
      map[top] = (map[top] ?? 0) + 1;
    }
    return map;
  }, [diffs]);

  const lastA = ra.yearly[ra.yearly.length - 1];
  const lastB = rb.yearly[rb.yearly.length - 1];
  const lblA = lastA?.label ?? "";
  const lblB = lastB?.label ?? "";
  const finalLbl = lblA === lblB ? lblA : `${lblA}/${lblB}`;

  const kpis = [
    { label: `CA ${finalLbl}`, a: lastA.totalRevenue, b: lastB.totalRevenue, kind: "currency" as const },
    { label: `EBITDA ${finalLbl}`, a: lastA.ebitda, b: lastB.ebitda, kind: "currency" as const },
    {
      label: `Marge EBITDA ${finalLbl}`,
      a: lastA.ebitdaMargin,
      b: lastB.ebitdaMargin,
      kind: "percent" as const,
    },
    { label: `Résultat net ${finalLbl}`, a: lastA.netIncome, b: lastB.netIncome, kind: "currency" as const },
    { label: "Trésorerie min", a: ra.cashTroughValue, b: rb.cashTroughValue, kind: "currency" as const },
    { label: `Trésorerie fin ${finalLbl}`, a: lastA.cashEnd, b: lastB.cashEnd, kind: "currency" as const },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Versions comparées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">A</span>
                {a.is_master ? (
                  <Badge className="bg-[#D32F2F]">v{a.version}</Badge>
                ) : (
                  <Badge variant="secondary">Fork</Badge>
                )}
              </div>
              <div className="font-semibold">{a.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {a.author_email ?? "—"} · {new Date(a.updated_at).toLocaleString("fr-FR")}
              </div>
            </div>
            <div className="p-4 border rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">B</span>
                {b.is_master ? (
                  <Badge className="bg-[#D32F2F]">v{b.version}</Badge>
                ) : (
                  <Badge variant="secondary">Fork</Badge>
                )}
              </div>
              <div className="font-semibold">{b.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {b.author_email ?? "—"} · {new Date(b.updated_at).toLocaleString("fr-FR")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Indicateurs clés FY29</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicateur</TableHead>
                <TableHead className="text-right">A</TableHead>
                <TableHead className="text-right">B</TableHead>
                <TableHead className="text-right">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.map((k, i) => {
                const fmt = k.kind === "percent" ? fmtPct : (v: number) => fmtCurrency(v, { compact: true });
                const delta = k.b - k.a;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{k.label}</TableCell>
                    <TableCell className="text-right">{fmt(k.a)}</TableCell>
                    <TableCell className="text-right">{fmt(k.b)}</TableCell>
                    <TableCell
                      className={
                        "text-right font-medium " + (delta >= 0 ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {delta >= 0 ? "+" : ""}
                      {fmt(delta)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">Paramètres modifiés ({diffs.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Switch checked={includeNotes} onCheckedChange={setIncludeNotes} id="incl-notes" />
              <Label htmlFor="incl-notes" className="text-xs cursor-pointer">
                Inclure notes/annotations
              </Label>
            </div>
          </div>
          {Object.keys(grouped).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(grouped).map(([k, n]) => (
                <Badge key={k} variant="secondary" className="text-[10px]">
                  {k} ({n})
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {diffs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Paramètres identiques.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paramètre</TableHead>
                  <TableHead className="text-right">A</TableHead>
                  <TableHead></TableHead>
                  <TableHead className="text-right">B</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diffs.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{d.path}</TableCell>
                    <TableCell className="text-right text-red-600">{fmtVal(d.a)}</TableCell>
                    <TableCell>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">{fmtVal(d.b)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
