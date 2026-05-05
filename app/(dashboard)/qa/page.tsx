"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, MessageSquareText, Plus, Trash2, X } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function QAPage() {
  const params = useModelStore((s) => s.params);
  const addFieldComment = useModelStore((s) => s.addFieldComment);
  const removeFieldComment = useModelStore((s) => s.removeFieldComment);
  const toggleCommentResolved = useModelStore((s) => s.toggleCommentResolved);
  const [authorEmail, setAuthorEmail] = useState<string | undefined>(undefined);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    let active = true;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setAuthorEmail(data.user?.email ?? undefined);
      });
    return () => {
      active = false;
    };
  }, []);

  const [newPath, setNewPath] = useState("");
  const [newText, setNewText] = useState("");
  const [replyByPath, setReplyByPath] = useState<Record<string, string>>({});

  const qa = params.fieldQA ?? {};
  const entries = useMemo(() => {
    return Object.entries(qa).sort((a, b) => {
      // Most recent activity first
      const lastA = a[1].comments[a[1].comments.length - 1]?.date ?? "";
      const lastB = b[1].comments[b[1].comments.length - 1]?.date ?? "";
      return lastB.localeCompare(lastA);
    });
  }, [qa]);

  const totalComments = entries.reduce((s, [, v]) => s + v.comments.length, 0);
  const totalUnresolved = entries.reduce(
    (s, [, v]) => s + v.comments.filter((c) => !c.resolved).length,
    0
  );

  const onAddNew = () => {
    if (!newPath.trim() || !newText.trim()) return;
    addFieldComment(newPath.trim(), newText, authorEmail);
    setNewPath("");
    setNewText("");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquareText className="h-7 w-7 text-[#D32F2F]" /> Q&amp;A par champ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Threads de questions/réponses entre fondateurs et investisseurs/banquiers, attachés à un
            champ précis du modèle.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Threads ouverts
            </div>
            <div className="text-3xl font-heading font-bold">{entries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Total commentaires
            </div>
            <div className="text-3xl font-heading font-bold">{totalComments}</div>
          </CardContent>
        </Card>
        <Card className={totalUnresolved > 0 ? "border-amber-300 bg-amber-50/30" : ""}>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Non résolus
            </div>
            <div
              className={
                "text-3xl font-heading font-bold " +
                (totalUnresolved > 0 ? "text-amber-700" : "text-emerald-700")
              }
            >
              {totalUnresolved}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nouveau thread
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pose une question sur un champ précis. Format path: <span className="font-mono">subs.tiers.0.monthlyPrice</span>,{" "}
            <span className="font-mono">capex.equipment</span>, etc.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            placeholder="Path du champ (ex: rent.monthlyByFy.0)"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
          />
          <textarea
            placeholder="Question / commentaire..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <Button onClick={onAddNew} disabled={!newPath.trim() || !newText.trim()}>
            <Plus className="h-3.5 w-3.5" /> Créer le thread
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Label className="text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="mr-2"
          />
          Afficher commentaires résolus
        </Label>
      </div>

      {entries.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Aucun thread Q&amp;A. Crée le premier ci-dessus.
          </CardContent>
        </Card>
      )}

      {entries.map(([path, thread]) => {
        const visibleComments = showResolved
          ? thread.comments
          : thread.comments.filter((c) => !c.resolved);
        if (visibleComments.length === 0) return null;
        return (
          <Card key={path}>
            <CardHeader>
              <CardTitle className="text-sm font-mono">
                {path}{" "}
                <Badge variant="secondary" className="text-[10px] ml-2">
                  {thread.comments.length} message(s)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleComments.map((c) => (
                <div
                  key={c.id}
                  className={
                    "rounded border p-3 " +
                    (c.resolved ? "bg-emerald-50/30 border-emerald-300" : "bg-card")
                  }
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-semibold">{c.author ?? "—"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(c.date).toLocaleString("fr-FR")}
                    </span>
                    {c.resolved && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100">
                        Résolu
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.text}</p>
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => toggleCommentResolved(path, c.id)}
                    >
                      {c.resolved ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      {c.resolved ? "Réouvrir" : "Marquer résolu"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => removeFieldComment(path, c.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <Input
                  value={replyByPath[path] ?? ""}
                  onChange={(e) =>
                    setReplyByPath((cur) => ({ ...cur, [path]: e.target.value }))
                  }
                  placeholder="Répondre..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const text = replyByPath[path];
                    if (!text?.trim()) return;
                    addFieldComment(path, text, authorEmail);
                    setReplyByPath((cur) => ({ ...cur, [path]: "" }));
                  }}
                  disabled={!replyByPath[path]?.trim()}
                >
                  Envoyer
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
