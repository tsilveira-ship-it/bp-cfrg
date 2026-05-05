"use client";
import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { runCrossChecks, summarizeChecks, type CrossCheck } from "@/lib/cross-checks";
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
import { fmtCurrency, fmtPct } from "@/lib/format";

export default function CrossChecksPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const checks = useMemo(() => runCrossChecks(params, result), [params, result]);
  const summary = useMemo(() => summarizeChecks(checks), [checks]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, CrossCheck[]> = {};
    for (const c of checks) {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    }
    return map;
  }, [checks]);

  const allOk = summary.error === 0 && summary.warning === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-[#D32F2F]" /> Cross-checks comptables
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Validation automatique de la cohérence interne du modèle (P&L → cashflow → bilan).
            Tolérance: ±1€ ou ±0.1%.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className={summary.ok > 0 ? "border-emerald-300 bg-emerald-50/30" : ""}>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-emerald-700">OK</div>
            <div className="text-3xl font-heading font-bold text-emerald-700">{summary.ok}</div>
          </CardContent>
        </Card>
        <Card className={summary.warning > 0 ? "border-amber-300 bg-amber-50/30" : ""}>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-amber-700">Warnings</div>
            <div className="text-3xl font-heading font-bold text-amber-700">{summary.warning}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Écart 0.1% – 1%</p>
          </CardContent>
        </Card>
        <Card className={summary.error > 0 ? "border-red-300 bg-red-50/30" : ""}>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-red-700">Erreurs</div>
            <div className="text-3xl font-heading font-bold text-red-700">{summary.error}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Écart &gt; 1%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="text-3xl font-heading font-bold">{summary.total}</div>
            <p className="text-[10px] text-muted-foreground mt-1">checks exécutés</p>
          </CardContent>
        </Card>
      </div>

      {allOk && (
        <Card className="border-emerald-300 bg-emerald-50/30">
          <CardContent className="pt-5 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <div className="font-semibold text-emerald-800">Cohérence comptable parfaite ✓</div>
              <p className="text-sm text-emerald-700/80">
                Tous les contrôles passent. Le modèle est mathématiquement cohérent (P&L ↔ cashflow ↔ bilan).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">
              {cat}{" "}
              <span className="text-xs text-muted-foreground font-normal">
                ({items.filter((i) => i.severity === "ok").length}/{items.length} OK)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Contrôle</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Attendu</TableHead>
                  <TableHead className="text-right">Calculé</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead className="text-right">Δ%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow
                    key={c.id}
                    className={
                      c.severity === "error"
                        ? "bg-red-50/50"
                        : c.severity === "warning"
                          ? "bg-amber-50/40"
                          : ""
                    }
                  >
                    <TableCell>
                      {c.severity === "ok" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : c.severity === "warning" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{c.label}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {c.scope ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {fmtCurrency(c.expected, { compact: true })}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {fmtCurrency(c.actual, { compact: true })}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right text-xs font-mono " +
                        (c.severity !== "ok" ? "font-semibold" : "text-muted-foreground")
                      }
                    >
                      {Math.abs(c.delta) < 1 ? "—" : fmtCurrency(c.delta, { compact: true })}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right text-xs " +
                        (c.severity === "error"
                          ? "text-red-700 font-semibold"
                          : c.severity === "warning"
                            ? "text-amber-700"
                            : "text-muted-foreground")
                      }
                    >
                      {c.pctDelta < 0.0001 ? "—" : fmtPct(c.pctDelta, 3)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
