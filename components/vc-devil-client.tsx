"use client";
import { useMemo, useState } from "react";
import { Check, Copy, Skull, ShieldAlert, Flame, Eye, FileLock2 } from "lucide-react";
import { computeModel } from "@/lib/model/compute";
import type { ModelParams } from "@/lib/model/types";
import { getAuditThresholds } from "@/lib/model/defaults";
import { runVCAudit, severityLabel, VC_PROMPT, type VCFinding, type VCSeverity, type VCDimension } from "@/lib/vc-audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MasterMeta = {
  name: string;
  version: number;
  publishedAt: string | null;
  author: string | null;
} | null;

const SEV_ORDER: VCSeverity[] = ["kill", "major", "yellow", "watch"];

const SEV_STYLE: Record<VCSeverity, { bg: string; text: string; icon: typeof Skull }> = {
  kill: { bg: "bg-red-100 border-red-300", text: "text-red-900", icon: Skull },
  major: { bg: "bg-orange-100 border-orange-300", text: "text-orange-900", icon: Flame },
  yellow: { bg: "bg-yellow-50 border-yellow-300", text: "text-yellow-900", icon: ShieldAlert },
  watch: { bg: "bg-slate-50 border-slate-300", text: "text-slate-700", icon: Eye },
};

export function VCDevilClient({
  params,
  masterMeta,
}: {
  params: ModelParams;
  masterMeta: MasterMeta;
}) {
  const result = useMemo(() => computeModel(params), [params]);
  const findings = useMemo(() => runVCAudit(params, result), [params, result]);

  const counts = useMemo(() => {
    const c: Record<VCSeverity, number> = { kill: 0, major: 0, yellow: 0, watch: 0 };
    for (const f of findings) c[f.severity]++;
    return c;
  }, [findings]);

  const byDim = useMemo(() => {
    const map = new Map<VCDimension, VCFinding[]>();
    for (const f of findings) {
      const arr = map.get(f.dimension) ?? [];
      arr.push(f);
      map.set(f.dimension, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
    }
    return Array.from(map.entries());
  }, [findings]);

  const verdict = useMemo(() => {
    const T = getAuditThresholds(params);
    if (counts.kill >= T.verdictKillMinCount!)
      return { label: "PAS INVESTABLE EN L'ÉTAT", tone: "bg-red-600 text-white" };
    if (counts.major >= T.verdictMajorBlockingCount!)
      return { label: "À CORRIGER AVANT PITCH", tone: "bg-orange-500 text-white" };
    if (counts.major >= T.verdictMajorWarnCount!)
      return { label: "DÉFENDABLE MAIS FRAGILE", tone: "bg-yellow-400 text-yellow-950" };
    return { label: "INVESTOR-READY (sous réserve)", tone: "bg-emerald-600 text-white" };
  }, [counts, params]);

  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(VC_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Skull className="h-7 w-7 text-red-600" /> Diagnostic VC — Devil&apos;s advocate
          </h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Admin uniquement. Audit toujours lancé sur la <b>version Master</b> publiée — pas le scénario actif local. Posture VC institutionnel : ce qui est faible, biaisé, optimiste, non-prouvé. Aucune complaisance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {masterMeta ? (
            <div className="rounded-md border bg-emerald-50 border-emerald-300 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                <FileLock2 className="h-3.5 w-3.5" /> Master v{masterMeta.version}
              </div>
              <div className="text-emerald-800/70 mt-0.5">{masterMeta.name}</div>
              {masterMeta.publishedAt && (
                <div className="text-emerald-800/60 mt-0.5">
                  Publié {new Date(masterMeta.publishedAt).toLocaleDateString("fr-FR")}
                  {masterMeta.author ? ` · ${masterMeta.author}` : ""}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border bg-amber-50 border-amber-300 px-3 py-2 text-xs text-amber-900">
              <div className="font-semibold">Aucun Master publié</div>
              <div className="opacity-70 mt-0.5">Audit basé sur DEFAULT_PARAMS (defaults.ts)</div>
            </div>
          )}
        </div>
      </header>

      {/* Verdict + counts */}
      <div className="grid gap-3 md:grid-cols-5">
        <div className={`rounded-md p-4 font-bold text-sm uppercase tracking-wide flex items-center justify-center text-center md:col-span-1 ${verdict.tone}`}>
          {verdict.label}
        </div>
        <ScoreCard sev="kill" n={counts.kill} />
        <ScoreCard sev="major" n={counts.major} />
        <ScoreCard sev="yellow" n={counts.yellow} />
        <ScoreCard sev="watch" n={counts.watch} />
      </div>

      {/* Findings by dimension */}
      <div className="space-y-6">
        {byDim.map(([dim, items]) => (
          <Card key={dim}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{dim}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {items.length} finding{items.length > 1 ? "s" : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((f) => (
                <FindingRow key={f.id} f={f} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reusable prompt */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            Prompt à coller dans Claude Code pour itérer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Colle ce prompt dans une session <code className="font-mono text-xs px-1 py-0.5 bg-muted rounded">claude code</code> ouverte dans le repo <code className="font-mono text-xs px-1 py-0.5 bg-muted rounded">bp-cfrg</code>. Relance autant de fois que nécessaire — le prompt demande explicitement à Claude de ne pas répéter et de creuser de nouveaux angles à chaque tour, jusqu&apos;à épuisement défendable face à un VC.
          </p>
          <div className="flex justify-end">
            <Button onClick={onCopy} variant={copied ? "default" : "outline"} size="sm">
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copié
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copier le prompt
                </>
              )}
            </Button>
          </div>
          <pre className="text-[11px] leading-relaxed bg-muted/50 border rounded p-4 overflow-x-auto whitespace-pre-wrap font-mono">
            {VC_PROMPT}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreCard({ sev, n }: { sev: VCSeverity; n: number }) {
  const style = SEV_STYLE[sev];
  const Icon = style.icon;
  return (
    <div className={`rounded-md border p-3 ${style.bg} ${style.text}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <Icon className="h-4 w-4" />
        {severityLabel(sev).replace(/^[^\s]+\s/, "")}
      </div>
      <div className="text-3xl font-bold mt-1">{n}</div>
    </div>
  );
}

function FindingRow({ f }: { f: VCFinding }) {
  const style = SEV_STYLE[f.severity];
  const Icon = style.icon;
  return (
    <div className={`rounded-md border p-4 ${style.bg}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${style.text}`} />
          <Badge variant="outline" className={`${style.text} border-current`}>
            {severityLabel(f.severity)}
          </Badge>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{f.id}</span>
      </div>
      <p className={`text-sm font-semibold ${style.text}`}>{f.claim}</p>
      <div className="mt-3 grid gap-2 text-xs">
        <div>
          <span className="font-bold uppercase tracking-wide text-[10px] mr-1">Challenge VC :</span>
          <span className="text-foreground/80">{f.challenge}</span>
        </div>
        <div>
          <span className="font-bold uppercase tracking-wide text-[10px] mr-1">Evidence :</span>
          <span className="text-foreground/80 font-mono">{f.evidence}</span>
        </div>
        <div>
          <span className="font-bold uppercase tracking-wide text-[10px] mr-1">Fix :</span>
          <span className="text-foreground/80">{f.fix}</span>
        </div>
      </div>
    </div>
  );
}
