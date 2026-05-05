"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModelStore } from "@/lib/store";
import {
  listMasters,
  listMyForks,
  saveFork,
  deleteFork,
  forkFromMaster,
  publishAsMaster,
  deleteMaster,
  type ScenarioRow,
} from "@/app/actions/scenarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trash2,
  Save,
  Plus,
  GitFork,
  Crown,
  Upload,
  History,
  GitCompareArrows,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ScenariosManager({ isAdmin }: { isAdmin: boolean }) {
  const params = useModelStore((s) => s.params);
  const loaded = useModelStore((s) => s.loaded);
  const loadParams = useModelStore((s) => s.loadParams);

  const [masters, setMasters] = useState<ScenarioRow[]>([]);
  const [forks, setForks] = useState<ScenarioRow[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [forkName, setForkName] = useState("Mon scénario");
  const [publishName, setPublishName] = useState("Master FY25-29");
  const [publishNotes, setPublishNotes] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const refresh = async () => {
    try {
      const [m, f] = await Promise.all([listMasters(), listMyForks()]);
      setMasters(m);
      setForks(f);
    } catch (e) {
      toast.error("Erreur de chargement");
    }
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const ok = !!data.user;
      setAuthed(ok);
      if (ok) refresh();
    });
  }, []);

  const handleSaveFork = () => {
    start(async () => {
      try {
        const id = loaded.kind === "fork" ? loaded.id : undefined;
        const sc = await saveFork(forkName || "Sans nom", params, id);
        loadParams(sc.params, { kind: "fork", id: sc.id, name: sc.name });
        toast.success(id ? "Fork mis à jour" : "Fork créé");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const handleLoad = (sc: ScenarioRow) => {
    loadParams(
      sc.params,
      sc.is_master
        ? { kind: "master", id: sc.id, name: sc.name, version: sc.version }
        : { kind: "fork", id: sc.id, name: sc.name }
    );
    if (!sc.is_master) setForkName(sc.name);
    toast.success(`Chargé: ${sc.name}`);
  };

  const handleFork = (sc: ScenarioRow) => {
    start(async () => {
      try {
        const created = await forkFromMaster(sc.id);
        loadParams(created.params, { kind: "fork", id: created.id, name: created.name });
        setForkName(created.name);
        toast.success(`Fork créé: ${created.name}`);
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const handleDeleteFork = (id: string) => {
    if (!confirm("Supprimer ce fork ?")) return;
    start(async () => {
      try {
        await deleteFork(id);
        if (loaded.kind === "fork" && loaded.id === id) {
          // unload
          useModelStore.getState().setLoaded({ kind: "none" });
        }
        toast.success("Supprimé");
        await refresh();
      } catch {
        toast.error("Erreur");
      }
    });
  };

  const handlePublish = () => {
    start(async () => {
      try {
        const forkId = loaded.kind === "fork" ? loaded.id : null;
        const sc = await publishAsMaster(forkId, params, publishName || "Master", publishNotes);
        loadParams(sc.params, { kind: "master", id: sc.id, name: sc.name, version: sc.version });
        toast.success(`Master v${sc.version} publié`);
        setPublishNotes("");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const handleDeleteMaster = (id: string) => {
    if (!confirm("Supprimer cette version master ?")) return;
    start(async () => {
      try {
        await deleteMaster(id);
        toast.success("Master supprimé");
        await refresh();
      } catch {
        toast.error("Erreur");
      }
    });
  };

  if (authed === null) return null;
  if (!authed) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Link href="/login">
            <Button>Se connecter avec Google</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const currentMaster = masters[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-4 w-4 text-[#D32F2F]" />
            Scénario actuellement chargé
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loaded.kind === "none" ? (
            <div className="text-sm text-muted-foreground">Aucun scénario chargé</div>
          ) : loaded.kind === "master" ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-[#D32F2F]">
                <Crown className="h-3 w-3 mr-1" />
                Master v{loaded.version}
              </Badge>
              <span className="font-medium">{loaded.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                Lecture seule. Crée un fork pour modifier.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <GitFork className="h-3 w-3 mr-1" />
                Fork
              </Badge>
              <span className="font-medium">{loaded.name}</span>
              <span className="text-xs text-emerald-600 ml-2">Auto-save activé</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-4 w-4 text-[#D32F2F]" />
            Versions Master ({masters.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {masters.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Aucun Master publié. {isAdmin ? "Publie le scénario actuel comme premier Master." : "Demande à un admin d'en publier un."}
              </p>
              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-2 items-end">
                  <Input
                    placeholder="Nom du master initial"
                    value={publishName}
                    onChange={(e) => setPublishName(e.target.value)}
                  />
                  <Button onClick={handlePublish} disabled={pending}>
                    <Upload className="h-4 w-4 mr-2" />
                    Publier v1
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {masters.map((m, idx) => (
                <div
                  key={m.id}
                  className={
                    "flex items-center gap-3 p-3 border rounded-md " +
                    (idx === 0 ? "bg-[#D32F2F]/5 border-[#D32F2F]/30" : "")
                  }
                >
                  <Badge className={idx === 0 ? "bg-[#D32F2F]" : "bg-muted-foreground"}>
                    v{m.version}
                  </Badge>
                  {idx === 0 && (
                    <Badge variant="outline" className="border-[#D32F2F] text-[#D32F2F]">
                      ACTUEL
                    </Badge>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.author_email ?? "—"} ·{" "}
                      {m.published_at ? new Date(m.published_at).toLocaleString("fr-FR") : ""}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleLoad(m)} disabled={pending}>
                    Charger
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleFork(m)} disabled={pending}>
                    <GitFork className="h-4 w-4 mr-1" />
                    Fork
                  </Button>
                  {idx > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/compare?a=${currentMaster.id}&b=${m.id}`)}
                    >
                      <GitCompareArrows className="h-4 w-4" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => handleDeleteMaster(m.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitFork className="h-4 w-4" />
            Mes forks ({forks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-2 items-end">
            <div>
              <Label className="text-xs">
                {loaded.kind === "fork" ? "Renommer ce fork" : "Nom du nouveau fork"}
              </Label>
              <Input value={forkName} onChange={(e) => setForkName(e.target.value)} />
            </div>
            <Button onClick={handleSaveFork} disabled={pending}>
              <Save className="h-4 w-4 mr-2" />
              {loaded.kind === "fork" ? "Sauver" : "Créer fork"}
            </Button>
          </div>
          {forks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun fork. Crée-en un ou fork un master.</p>
          ) : (
            <div className="space-y-2">
              {forks.map((f) => (
                <div
                  key={f.id}
                  className={
                    "flex items-center gap-3 p-3 border rounded-md " +
                    (loaded.kind === "fork" && loaded.id === f.id ? "bg-muted/40 border-foreground/30" : "")
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      MàJ: {new Date(f.updated_at).toLocaleString("fr-FR")}
                    </div>
                  </div>
                  {loaded.kind === "fork" && loaded.id === f.id && (
                    <Badge variant="secondary">En édition</Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleLoad(f)} disabled={pending}>
                    Charger
                  </Button>
                  {currentMaster && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/compare?a=${currentMaster.id}&b=${f.id}`)}
                      title="Comparer au master actuel"
                    >
                      <GitCompareArrows className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => handleDeleteFork(f.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && masters.length > 0 && (
        <Card className="border-[#D32F2F]/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-4 w-4 text-[#D32F2F]" />
              Publier nouvelle version Master
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Crée une nouvelle version Master à partir des paramètres actuellement chargés. Versions précédentes conservées dans l&apos;historique.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nom</Label>
                <Input value={publishName} onChange={(e) => setPublishName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Notes (optionnel)</Label>
                <Input
                  placeholder="Ex: ajout marketing 2%"
                  value={publishNotes}
                  onChange={(e) => setPublishNotes(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handlePublish} disabled={pending}>
              <Crown className="h-4 w-4 mr-2" />
              Publier v{(masters[0]?.version ?? 0) + 1}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
