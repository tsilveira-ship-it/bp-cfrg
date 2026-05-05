"use client";
import { useEffect, useState, useTransition } from "react";
import { useModelStore } from "@/lib/store";
import {
  listScenarios,
  saveScenario,
  deleteScenario,
  setActiveScenario,
  type ScenarioRow,
} from "@/app/actions/scenarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Save, Plus, Check, FolderOpen } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

export function ScenariosManager() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [name, setName] = useState("Mon scénario");
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const ok = !!data.user;
      setAuthed(ok);
      if (ok) refresh();
      else setLoaded(true);
    });
  }, []);

  const refresh = async () => {
    try {
      const list = await listScenarios();
      setScenarios(list);
    } catch (e) {
      toast.error("Erreur de chargement");
    } finally {
      setLoaded(true);
    }
  };

  const handleSave = () => {
    start(async () => {
      try {
        await saveScenario(name || "Sans nom", params, editingId ?? undefined);
        toast.success(editingId ? "Scénario mis à jour" : "Scénario enregistré");
        setEditingId(null);
        await refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur";
        toast.error(msg);
      }
    });
  };

  const handleLoad = (sc: ScenarioRow) => {
    setParams(() => sc.params);
    toast.success(`Scénario « ${sc.name} » chargé`);
    setEditingId(sc.id);
    setName(sc.name);
  };

  const handleDelete = (id: string) => {
    start(async () => {
      try {
        await deleteScenario(id);
        toast.success("Supprimé");
        if (editingId === id) setEditingId(null);
        await refresh();
      } catch (e) {
        toast.error("Erreur");
      }
    });
  };

  const handleSetActive = (id: string) => {
    start(async () => {
      try {
        await setActiveScenario(id);
        toast.success("Scénario actif défini");
        await refresh();
      } catch (e) {
        toast.error("Erreur");
      }
    });
  };

  if (authed === null) return null;

  if (!authed) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-heading text-xl">Connecte-toi pour sauvegarder tes scénarios</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sans compte, les paramètres sont stockés uniquement dans ce navigateur.
            </p>
          </div>
          <Link href="/login">
            <Button>Se connecter avec Google</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {editingId ? "Mettre à jour le scénario" : "Enregistrer un nouveau scénario"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto] gap-3 items-end">
            <div>
              <Label className="text-xs">Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mon scénario" />
            </div>
            <Button onClick={handleSave} disabled={pending}>
              <Save className="h-4 w-4 mr-2" />
              {editingId ? "Mettre à jour" : "Enregistrer"}
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setName("Mon scénario");
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Capture l&apos;état actuel de tous les paramètres (tarifs, salaires, financement, fiscalité…).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mes scénarios sauvegardés</CardTitle>
        </CardHeader>
        <CardContent>
          {!loaded ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : scenarios.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun scénario. Enregistre ton premier ci-dessus.</div>
          ) : (
            <div className="space-y-2">
              {scenarios.map((sc) => (
                <div key={sc.id} className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{sc.name}</span>
                      {sc.is_active && <Badge className="bg-emerald-600">Actif</Badge>}
                      {editingId === sc.id && <Badge variant="secondary">En édition</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      MàJ: {new Date(sc.updated_at).toLocaleString("fr-FR")}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleLoad(sc)} disabled={pending}>
                    Charger
                  </Button>
                  {!sc.is_active && (
                    <Button size="sm" variant="ghost" onClick={() => handleSetActive(sc.id)} disabled={pending}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => handleDelete(sc.id)}
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
    </div>
  );
}
