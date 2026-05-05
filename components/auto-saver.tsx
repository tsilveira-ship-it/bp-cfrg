"use client";
import { useEffect, useRef, useState } from "react";
import { useModelStore } from "@/lib/store";
import { autoSaveFork } from "@/app/actions/scenarios";
import { Check, Loader2, Lock } from "lucide-react";

export function AutoSaver() {
  const params = useModelStore((s) => s.params);
  const loaded = useModelStore((s) => s.loaded);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSaved = useRef<string>("");
  const initialized = useRef(false);

  useEffect(() => {
    // Skip first render so we don't immediately save unchanged params
    if (!initialized.current) {
      initialized.current = true;
      lastSaved.current = JSON.stringify(params);
      return;
    }
    if (loaded.kind !== "fork") return;
    const json = JSON.stringify(params);
    if (json === lastSaved.current) return;

    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        await autoSaveFork(loaded.id, params);
        lastSaved.current = json;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch {
        setStatus("error");
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [params, loaded]);

  if (loaded.kind === "none") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {loaded.kind === "master" ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 shadow-sm">
          <Lock className="h-3.5 w-3.5" />
          Master v{loaded.version} — lecture seule
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border shadow-sm text-xs">
          {status === "saving" && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-muted-foreground">Sauvegarde…</span>
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">Enregistré</span>
            </>
          )}
          {status === "error" && (
            <span className="text-red-700">Erreur de sauvegarde</span>
          )}
          {status === "idle" && (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-muted-foreground">{loaded.name}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
