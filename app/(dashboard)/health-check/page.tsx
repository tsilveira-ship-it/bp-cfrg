"use client";
import { useMemo } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, HeartPulse, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { runHealthCheck, summarizeIssues, type HealthIssue, type Severity } from "@/lib/health-check";

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2, ok: 3 };

const SEV_STYLE: Record<Severity, { bg: string; border: string; text: string; Icon: typeof AlertCircle }> = {
  critical: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", Icon: AlertCircle },
  warning: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", Icon: AlertTriangle },
  info: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", Icon: Info },
  ok: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", Icon: CheckCircle2 },
};

export default function HealthCheckPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const issues = useMemo(() => runHealthCheck(params, result), [params, result]);
  const sorted = useMemo(
    () => [...issues].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [issues]
  );
  const summary = summarizeIssues(issues);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HeartPulse className="h-7 w-7 text-[#D32F2F]" /> Health check
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Diagnostic 360° du scénario actif. Corriger les alertes critiques avant tout partage investisseur/banque.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-red-300 bg-red-50/40">
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-red-700">Critiques</div>
            <div className="text-3xl font-heading font-bold text-red-700">{summary.critical}</div>
            <p className="text-xs text-red-700/70 mt-1">À corriger avant partage</p>
          </CardContent>
        </Card>
        <Card className="border-amber-300 bg-amber-50/40">
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-amber-700">Warnings</div>
            <div className="text-3xl font-heading font-bold text-amber-700">{summary.warnings}</div>
            <p className="text-xs text-amber-700/70 mt-1">Vérifier la cohérence</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-300 bg-emerald-50/40">
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-emerald-700">Vérifications OK</div>
            <div className="text-3xl font-heading font-bold text-emerald-700">{summary.ok}</div>
            <p className="text-xs text-emerald-700/70 mt-1">Bonnes pratiques respectées</p>
          </CardContent>
        </Card>
      </div>

      {summary.healthy && (
        <Card className="border-emerald-300 bg-emerald-50/30">
          <CardContent className="pt-5 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <div className="font-semibold text-emerald-800">Tout est vert ✓</div>
              <p className="text-sm text-emerald-700/80">
                Aucune alerte. Le scénario passe les contrôles de cohérence et plausibilité.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagnostics ({issues.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.map((iss) => (
            <IssueCard key={iss.id} issue={iss} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function IssueCard({ issue }: { issue: HealthIssue }) {
  const s = SEV_STYLE[issue.severity];
  return (
    <div className={`flex gap-3 p-3 rounded-md border ${s.border} ${s.bg}`}>
      <s.Icon className={`h-5 w-5 mt-0.5 shrink-0 ${s.text}`} />
      <div className="flex-1 space-y-1">
        <div className={`font-semibold text-sm ${s.text}`}>{issue.title}</div>
        <p className="text-xs text-muted-foreground">{issue.message}</p>
        {issue.hint && <p className="text-xs italic text-muted-foreground">💡 {issue.hint}</p>}
        {issue.paths && issue.paths.length > 0 && (
          <div className="text-[10px] font-mono text-muted-foreground/70">
            {issue.paths.slice(0, 3).join(" · ")}
            {issue.paths.length > 3 && ` · +${issue.paths.length - 3}`}
          </div>
        )}
        {issue.link && (
          <Link
            href={issue.link.href}
            className="inline-flex items-center gap-1 text-xs text-[#D32F2F] hover:underline mt-1"
          >
            <ExternalLink className="h-3 w-3" />
            {issue.link.label}
          </Link>
        )}
      </div>
    </div>
  );
}
