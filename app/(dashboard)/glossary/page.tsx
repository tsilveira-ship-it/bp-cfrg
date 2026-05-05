"use client";
import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GLOSSARY, CATEGORIES, type GlossaryCategory } from "@/lib/glossary";

export default function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<GlossaryCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return GLOSSARY.filter((t) => {
      if (activeCat !== "all" && t.category !== activeCat) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        (t.acronym ?? "").toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q)
      );
    });
  }, [search, activeCat]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof GLOSSARY> = {};
    for (const t of filtered) {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-[#D32F2F]" /> Glossaire investisseur
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {GLOSSARY.length} termes financiers, SaaS et fitness, avec définitions, formules et
          benchmarks sectoriels.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher un terme, acronyme, définition..."
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCat("all")}
            className={
              "text-xs rounded-full px-3 py-1 transition-colors " +
              (activeCat === "all"
                ? "bg-[#D32F2F] text-white"
                : "bg-muted hover:bg-muted-foreground/10")
            }
          >
            Tous ({GLOSSARY.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = GLOSSARY.filter((t) => t.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={
                  "text-xs rounded-full px-3 py-1 transition-colors " +
                  (activeCat === c
                    ? "bg-[#D32F2F] text-white"
                    : "bg-muted hover:bg-muted-foreground/10")
                }
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Aucun terme ne correspond à la recherche.
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([cat, terms]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">{cat}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {terms.map((t) => (
              <div key={t.term} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-bold text-base">{t.term}</span>
                  {t.acronym && (
                    <span className="text-xs text-muted-foreground italic">{t.acronym}</span>
                  )}
                </div>
                <p className="text-sm mt-1">{t.definition}</p>
                {t.formula && (
                  <div className="mt-2 rounded bg-muted/40 px-3 py-1.5 font-mono text-xs">
                    {t.formula}
                  </div>
                )}
                {t.example && (
                  <p className="text-xs italic text-muted-foreground mt-1">
                    Exemple: {t.example}
                  </p>
                )}
                {t.benchmark && (
                  <div className="mt-1.5 flex items-start gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      Benchmark
                    </Badge>
                    <span className="text-xs text-muted-foreground">{t.benchmark}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
