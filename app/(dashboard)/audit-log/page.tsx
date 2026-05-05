import { listMasters } from "@/app/actions/scenarios";
import type { ModelParams } from "@/lib/model/types";
import { diffParams, summarizeDiff } from "@/lib/params-diff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Crown, GitCompareArrows, History, ArrowRight } from "lucide-react";

export default async function AuditLogPage() {
  let masters: Awaited<ReturnType<typeof listMasters>> = [];
  try {
    masters = await listMasters();
  } catch {}

  const sorted = masters.slice().sort((a, b) => b.version - a.version);
  // Compute diffs between successive versions
  const items = sorted.map((m, i) => {
    const prev = sorted[i + 1];
    const entries = prev ? diffParams(prev.params as ModelParams, m.params as ModelParams) : [];
    const filtered = entries.filter(
      (e) => !e.path.startsWith("fieldNotes") && !e.path.startsWith("notes")
    );
    return {
      master: m,
      prev,
      diff: filtered,
      summary: summarizeDiff(filtered),
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-7 w-7 text-[#D32F2F]" /> Audit log
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Journal des modifications entre versions Master successives. Permet à un analyste de tracer
          quoi a été changé, quand, et par qui.
        </p>
      </header>

      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Aucun master publié. L&apos;audit log apparaîtra dès la première publication.
          </CardContent>
        </Card>
      ) : (
        items.map((item, idx) => (
          <Card
            key={item.master.id}
            className={idx === 0 ? "border-[#D32F2F]/30" : ""}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <Badge className={idx === 0 ? "bg-[#D32F2F]" : "bg-muted-foreground"}>
                  <Crown className="h-3 w-3 mr-1" />v{item.master.version}
                </Badge>
                <span>{item.master.name}</span>
                {idx === 0 && (
                  <span className="text-[10px] uppercase font-bold text-[#D32F2F]">Actuel</span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Publié par <b>{item.master.author_email ?? "—"}</b>
                {item.master.published_at &&
                  ` · ${new Date(item.master.published_at).toLocaleString("fr-FR")}`}
                {item.prev && (
                  <>
                    {" · "}
                    {item.summary.total} modification(s) vs v{item.prev.version}
                  </>
                )}
              </p>
            </CardHeader>
            <CardContent>
              {!item.prev ? (
                <p className="text-xs text-muted-foreground italic">
                  Première version publiée — pas de diff disponible.
                </p>
              ) : item.diff.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Identique à la version précédente (à part notes/annotations).
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {Object.entries(item.summary.byTopLevel).map(([k, n]) => (
                      <Badge key={k} variant="secondary" className="text-[10px]">
                        {k} ({n})
                      </Badge>
                    ))}
                  </div>
                  <div className="rounded border bg-muted/20 p-3 max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground sticky top-0 bg-muted/40">
                        <tr>
                          <th className="text-left p-1">Champ</th>
                          <th className="text-right p-1">Avant</th>
                          <th className="p-1 w-6" />
                          <th className="text-right p-1">Après</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.diff.slice(0, 30).map((d, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-1 font-mono text-[11px]">{d.path}</td>
                            <td className="p-1 text-right text-red-700 font-mono">
                              {fmtVal(d.before)}
                            </td>
                            <td className="p-1 text-center">
                              <ArrowRight className="h-3 w-3 text-muted-foreground inline" />
                            </td>
                            <td className="p-1 text-right text-emerald-700 font-mono">
                              {fmtVal(d.after)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {item.diff.length > 30 && (
                      <p className="text-[10px] text-muted-foreground italic mt-2">
                        +{item.diff.length - 30} autres modifications. Voir{" "}
                        <Link
                          href={`/compare?a=${item.master.id}&b=${item.prev.id}`}
                          className="text-[#D32F2F] underline"
                        >
                          /compare
                        </Link>{" "}
                        pour le détail complet.
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/compare?a=${item.master.id}&b=${item.prev.id}`}
                    className="inline-flex items-center gap-1 text-xs text-[#D32F2F] hover:underline mt-3"
                  >
                    <GitCompareArrows className="h-3 w-3" /> Comparer en détail
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "number") {
    if (Number.isInteger(v) && Math.abs(v) < 100) return String(v);
    if (Math.abs(v) < 1) return (v * 100).toFixed(2) + "%";
    return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  }
  if (typeof v === "object") return JSON.stringify(v).slice(0, 30);
  return String(v).slice(0, 30);
}
