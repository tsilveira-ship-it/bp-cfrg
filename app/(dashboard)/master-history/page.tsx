import { listMasters } from "@/app/actions/scenarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Crown, GitCompareArrows } from "lucide-react";

export default async function MasterHistoryPage() {
  let masters: Awaited<ReturnType<typeof listMasters>> = [];
  try {
    masters = await listMasters();
  } catch {}

  const sorted = masters.slice().sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Historique des Masters</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Timeline chronologique des versions Master publiées
        </p>
      </header>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Aucun master publié pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{sorted.length} version(s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sorted.map((m, idx) => (
                <div
                  key={m.id}
                  className={
                    "flex gap-4 p-4 border rounded-md " +
                    (idx === 0 ? "bg-[#D32F2F]/5 border-[#D32F2F]/30" : "")
                  }
                >
                  <div className="flex flex-col items-center">
                    <Badge className={idx === 0 ? "bg-[#D32F2F]" : "bg-muted-foreground"}>
                      <Crown className="h-3 w-3 mr-1" />v{m.version}
                    </Badge>
                    {idx === 0 && (
                      <div className="text-[9px] uppercase font-bold text-[#D32F2F] mt-1">
                        Actuel
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Publié par {m.author_email ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.published_at ? new Date(m.published_at).toLocaleString("fr-FR") : ""}
                    </div>
                  </div>
                  {idx > 0 && sorted[0] && (
                    <Link
                      href={`/compare?a=${sorted[0].id}&b=${m.id}`}
                      className="self-start text-xs text-[#D32F2F] hover:underline flex items-center gap-1"
                    >
                      <GitCompareArrows className="h-3 w-3" />
                      Comparer à v{sorted[0].version}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
