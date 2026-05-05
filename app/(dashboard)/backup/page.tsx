"use client";
import { useRef, useState } from "react";
import { Download, Upload, CheckCircle2, AlertCircle, FileJson, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { useModelStore } from "@/lib/store";
import { normalizeParams } from "@/lib/model/types";

const FILE_VERSION = 1;

export default function BackupPage() {
  const params = useModelStore((s) => s.params);
  const loadParams = useModelStore((s) => s.loadParams);
  const reset = useModelStore((s) => s.reset);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const onExport = () => {
    const payload = {
      $version: FILE_VERSION,
      $exportedAt: new Date().toISOString(),
      $tool: "bp-cfrg",
      params,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `bp-cfrg-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ kind: "ok", message: "Export téléchargé." });
  };

  const onImport = async (file: File) => {
    setStatus(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== "object") throw new Error("Format invalide");
      const candidate = data.params ?? data; // accepte payload wrappé ou params nu
      const normalized = normalizeParams(candidate);
      if (!normalized.timeline || !normalized.subs?.tiers) {
        throw new Error("Champs requis manquants (timeline, subs.tiers)");
      }
      loadParams(normalized, { kind: "none" });
      setStatus({
        kind: "ok",
        message: `Scénario chargé (${normalized.timeline.startYear} · ${normalized.timeline.horizonYears}y).`,
      });
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Échec import: ${e instanceof Error ? e.message : "fichier invalide"}`,
      });
    }
  };

  const onReset = () => {
    if (confirm("Réinitialiser à la base par défaut ? Les modifications non sauvées seront perdues.")) {
      reset();
      setStatus({ kind: "ok", message: "Paramètres réinitialisés." });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileJson className="h-7 w-7 text-[#D32F2F]" /> Backup & Import
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Export complet du scénario en JSON pour archivage local. Import pour restaurer ou
            partager hors-ligne.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      {status && (
        <div
          className={
            "flex items-start gap-2 p-3 rounded-md border text-sm " +
            (status.kind === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800")
          }
        >
          {status.kind === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" /> Exporter
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Télécharge un fichier JSON avec tous les paramètres + notes + actuals + capexItems.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={onExport} className="w-full">
              <Download className="h-4 w-4" /> Télécharger le scénario
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Inclus dans l&apos;export:</p>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                <li>Timeline (startYear, horizonYears)</li>
                <li>Tous les inputs (subs, salaires, loyer, recurring, marketing, capex, financing, tax, bfr)</li>
                <li>fieldNotes (annotations par champ #11)</li>
                <li>capexItems (#9 si activé)</li>
                <li>actuals (réels mensuels #20 si saisis)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" /> Importer
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Charge un JSON exporté précédemment. Remplace le scénario courant (un fork est créé automatiquement).
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onImport(f);
                  e.target.value = "";
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4" /> Choisir un fichier JSON
            </Button>
            <div className="text-xs text-muted-foreground">
              <p>Tolérant: accepte le payload complet ({`{ $version, params: {...} }`}) ou directement
              un objet params nu.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-600" /> Réinitialiser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Reset au scénario base par défaut. Les forks Supabase sauvegardés sont conservés (ils sont
            sur le compte, pas en local).
          </p>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4" /> Reset paramètres locaux
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
