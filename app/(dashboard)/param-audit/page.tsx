"use client";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  TrendingDown,
  Database,
  ShieldQuestion,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { useModelStore } from "@/lib/store";
import { buildParamAuditReport, type ParamAuditRow } from "@/lib/param-audit-report";
import { buildReverseStressReport } from "@/lib/reverse-stress-report";

const CRIT_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  unknown: 4,
};

const CRIT_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-blue-100 text-blue-800 border-blue-300",
  unknown: "bg-gray-100 text-gray-700 border-gray-300",
};

const SRC_BADGE: Record<string, string> = {
  validated: "bg-emerald-100 text-emerald-800 border-emerald-300",
  "to-validate": "bg-amber-100 text-amber-800 border-amber-300",
  missing: "bg-red-100 text-red-800 border-red-300",
  estimated: "bg-blue-100 text-blue-800 border-blue-300",
  unmapped: "bg-gray-100 text-gray-700 border-gray-300",
};

const VAL_BADGE: Record<string, string> = {
  validated: "bg-emerald-100 text-emerald-800 border-emerald-300",
  level1: "bg-amber-100 text-amber-800 border-amber-300",
  "validated-stale": "bg-orange-100 text-orange-800 border-orange-300",
  "level1-stale": "bg-orange-100 text-orange-800 border-orange-300",
  flagged: "bg-red-100 text-red-800 border-red-300",
  none: "bg-gray-100 text-gray-700 border-gray-300",
};

const VERDICT_BADGE: Record<string, string> = {
  "in-range": "bg-emerald-100 text-emerald-800 border-emerald-300",
  below: "bg-red-100 text-red-800 border-red-300",
  above: "bg-red-100 text-red-800 border-red-300",
  "n/a": "bg-gray-100 text-gray-600 border-gray-300",
  robuste: "bg-emerald-100 text-emerald-800 border-emerald-300",
  moyen: "bg-amber-100 text-amber-800 border-amber-300",
  fragile: "bg-red-100 text-red-800 border-red-300",
  "déjà-cassé": "bg-red-200 text-red-900 border-red-400",
};

export default function ParamAuditPage() {
  const params = useModelStore((s) => s.params);
  const scenario = useModelStore((s) => s.scenario);

  const auditReport = useMemo(
    () => buildParamAuditReport(params, `scénario ${scenario}`),
    [params, scenario]
  );
  const reverseReport = useMemo(
    () => buildReverseStressReport(params, undefined, undefined, `scénario ${scenario}`),
    [params, scenario]
  );

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCriticality, setFilterCriticality] = useState<string>("all");
  const [filterSourceState, setFilterSourceState] = useState<string>("all");
  const [filterValidation, setFilterValidation] = useState<string>("all");
  const [onlyGaps, setOnlyGaps] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(auditReport.rows.map((r) => r.category));
    return Array.from(set).sort();
  }, [auditReport]);

  const filteredRows = useMemo(() => {
    let rows = auditReport.rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.path.toLowerCase().includes(q) ||
          r.sourceRef.toLowerCase().includes(q) ||
          r.rationale.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== "all") rows = rows.filter((r) => r.category === filterCategory);
    if (filterCriticality !== "all") rows = rows.filter((r) => r.criticality === filterCriticality);
    if (filterSourceState !== "all") rows = rows.filter((r) => r.sourceState === filterSourceState);
    if (filterValidation !== "all") rows = rows.filter((r) => r.validationStatus === filterValidation);
    if (onlyGaps) {
      rows = rows.filter(
        (r) =>
          r.sourceState === "missing" ||
          r.sourceState === "unmapped" ||
          r.benchmarkVerdict === "below" ||
          r.benchmarkVerdict === "above" ||
          ((r.criticality === "critical" || r.criticality === "high") && r.validationStatus !== "validated")
      );
    }
    // Sort: criticité asc, puis path
    return [...rows].sort((a, b) => {
      const ca = CRIT_ORDER[a.criticality] ?? 99;
      const cb = CRIT_ORDER[b.criticality] ?? 99;
      if (ca !== cb) return ca - cb;
      return a.path.localeCompare(b.path);
    });
  }, [auditReport, search, filterCategory, filterCriticality, filterSourceState, filterValidation, onlyGaps]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wider">
            Audit param-par-param
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inventaire exhaustif des paramètres du modèle, croisé avec sources, benchmarks
            sectoriels, validations 4-eyes, et reverse stress par driver.
          </p>
        </div>
        <ScenarioSwitcher />
      </div>

      {/* KPIs résumé */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          icon={Database}
          label="Paramètres business"
          value={auditReport.summary.businessParams.toString()}
          sub={`sur ${auditReport.summary.totalParams} totaux`}
        />
        <KPICard
          icon={ShieldQuestion}
          label="Sans source"
          value={auditReport.summary.gaps.missingSource.toString()}
          sub="à documenter"
          tone={auditReport.summary.gaps.missingSource > 50 ? "warn" : "ok"}
        />
        <KPICard
          icon={AlertTriangle}
          label="Critiques non validés"
          value={auditReport.summary.gaps.criticalUnvalidated.toString()}
          sub="critical/high sans 4-eyes"
          tone={auditReport.summary.gaps.criticalUnvalidated > 0 ? "warn" : "ok"}
        />
        <KPICard
          icon={TrendingDown}
          label="Hors benchmark"
          value={auditReport.summary.gaps.benchmarkBreaches.toString()}
          sub="leaf below/above range"
          tone={auditReport.summary.gaps.benchmarkBreaches > 0 ? "warn" : "ok"}
        />
      </div>

      {/* Benchmarks agrégés */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Benchmarks agrégés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-2">Métrique</th>
                  <th className="text-right py-2 px-2">Valeur</th>
                  <th className="text-left py-2 px-2">Formule</th>
                  <th className="text-left py-2 px-2">Range bench</th>
                  <th className="text-left py-2 px-2">Verdict</th>
                  <th className="text-left py-2 px-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {auditReport.aggregateBenchmarks.map((a) => {
                  const fmt =
                    Math.abs(a.computedValue) < 1 && a.computedValue !== 0
                      ? (a.computedValue * 100).toFixed(2) + "%"
                      : a.computedValue.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
                  return (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 px-2 font-medium">{a.label}</td>
                      <td className="py-2 px-2 text-right font-mono">{fmt}</td>
                      <td className="py-2 px-2 text-xs font-mono text-muted-foreground">{a.computedFormula}</td>
                      <td className="py-2 px-2 text-xs">
                        {a.benchmarkRange.low}–{a.benchmarkRange.high}
                      </td>
                      <td className="py-2 px-2">
                        <Badge className={VERDICT_BADGE[a.verdict] ?? ""} variant="outline">
                          {a.verdict}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{a.comment}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reverse stress — heatmap drivers × métriques */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Reverse stress — marge avant rupture
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Bisection automatique : pour chaque driver, valeur de rupture qui fait basculer
            une métrique-clé. Marge relative = robustesse du BP.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-2">Driver</th>
                  <th className="text-center py-2 px-2">Trésorerie ≥ 0</th>
                  <th className="text-center py-2 px-2">Break-even atteint</th>
                  <th className="text-center py-2 px-2">EBITDA Y_last ≥ 0</th>
                  <th className="text-center py-2 px-2">DSCR ≥ 1</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(new Set(reverseReport.rows.map((r) => r.driverId))).map((did) => {
                  const driverLabel = reverseReport.rows.find((r) => r.driverId === did)!.driverLabel;
                  return (
                    <tr key={did} className="border-b last:border-0">
                      <td className="py-2 px-2 font-medium">{driverLabel}</td>
                      {["cashTroughZero", "noBreakEven", "ebitdaLastNegative", "dscrYearBelowOne"].map(
                        (m) => {
                          const r = reverseReport.rows.find(
                            (x) => x.driverId === did && x.metric === m
                          );
                          if (!r) return <td key={m} className="py-2 px-2 text-center">—</td>;
                          const marge = isFinite(r.marginPct)
                            ? (r.marginPct * 100).toFixed(0) + "%"
                            : "—";
                          return (
                            <td key={m} className="py-2 px-2 text-center">
                              <Badge className={VERDICT_BADGE[r.verdict] ?? ""} variant="outline">
                                {marge} {r.verdict}
                              </Badge>
                            </td>
                          );
                        }
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Filtres tableau paramètres */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Tous les paramètres ({filteredRows.length} / {auditReport.rows.length})
          </CardTitle>
          <div className="flex flex-wrap gap-2 mt-3">
            <Input
              placeholder="Recherche path / source / rationale…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <FilterSelect value={filterCategory} onChange={setFilterCategory} options={["all", ...categories]} placeholder="Catégorie" />
            <FilterSelect value={filterCriticality} onChange={setFilterCriticality} options={["all", "critical", "high", "medium", "low", "unknown"]} placeholder="Criticité" />
            <FilterSelect value={filterSourceState} onChange={setFilterSourceState} options={["all", "validated", "to-validate", "missing", "estimated", "unmapped"]} placeholder="Source" />
            <FilterSelect value={filterValidation} onChange={setFilterValidation} options={["all", "none", "level1", "validated", "validated-stale", "level1-stale", "flagged"]} placeholder="Validation" />
            <button
              type="button"
              onClick={() => setOnlyGaps(!onlyGaps)}
              className={`px-3 py-1.5 rounded-md text-xs border ${onlyGaps ? "bg-amber-50 border-amber-300 text-amber-800" : "border-input bg-background"}`}
            >
              {onlyGaps ? "✓ " : ""}Trous raquette
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-2">Path</th>
                  <th className="text-left py-2 px-2">Catégorie</th>
                  <th className="text-right py-2 px-2">Valeur</th>
                  <th className="text-left py-2 px-2">Criticité</th>
                  <th className="text-left py-2 px-2">Source</th>
                  <th className="text-left py-2 px-2">État</th>
                  <th className="text-left py-2 px-2">Validation</th>
                  <th className="text-left py-2 px-2">Bench</th>
                  <th className="text-left py-2 px-2">Tests recommandés</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <ParamRow key={r.path} row={r} />
                ))}
              </tbody>
            </table>
          </div>
          {filteredRows.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Aucun paramètre ne correspond aux filtres.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ParamRow({ row }: { row: ParamAuditRow }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="py-1.5 px-2 font-mono text-[11px]">{row.path}</td>
      <td className="py-1.5 px-2 text-[10px] text-muted-foreground">{row.category}</td>
      <td className="py-1.5 px-2 text-right font-mono">{row.valueDisplay}</td>
      <td className="py-1.5 px-2">
        <Badge className={CRIT_BADGE[row.criticality] ?? ""} variant="outline">
          {row.criticality}
        </Badge>
      </td>
      <td className="py-1.5 px-2 max-w-[200px] truncate" title={row.sourceRef}>
        {row.sourceRef}
      </td>
      <td className="py-1.5 px-2">
        <Badge className={SRC_BADGE[row.sourceState] ?? ""} variant="outline">
          {row.sourceState}
        </Badge>
      </td>
      <td className="py-1.5 px-2">
        <Badge className={VAL_BADGE[row.validationStatus] ?? ""} variant="outline">
          {row.validationStatus}
        </Badge>
      </td>
      <td className="py-1.5 px-2">
        {row.benchmarkRange ? (
          <span className="text-[10px]">
            <Badge className={VERDICT_BADGE[row.benchmarkVerdict] ?? ""} variant="outline">
              {row.benchmarkVerdict}
            </Badge>
            <span className="ml-1 text-muted-foreground">
              {row.benchmarkRef} {row.benchmarkRange.low}–{row.benchmarkRange.high}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground text-[10px]">—</span>
        )}
      </td>
      <td className="py-1.5 px-2 text-[10px] text-muted-foreground max-w-[220px]">
        {row.testsRecommended.length > 0 ? row.testsRecommended.join("; ") : "—"}
      </td>
    </tr>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof AlertCircle;
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn" | "err";
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-300 bg-amber-50"
      : tone === "err"
      ? "border-red-300 bg-red-50"
      : "";
  return (
    <Card className={toneClass}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider">{label}</span>
        </div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "all")}>
      <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">
            {o === "all" ? `Tous (${placeholder.toLowerCase()})` : o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Lint helpers — utilise CheckCircle2 / AlertCircle pour pas que les imports soient orphelins
// (gardés exportés en cas d'extensions futures de KPICard avec icônes différentes).
void CheckCircle2;
void AlertCircle;
