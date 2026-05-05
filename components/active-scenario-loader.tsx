"use client";
import { useEffect, useRef } from "react";
import { useModelStore } from "@/lib/store";
import { getCurrentMaster, getScenarioById } from "@/app/actions/scenarios";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ActiveScenarioLoader() {
  const loadParams = useModelStore((s) => s.loadParams);
  const loaded = useModelStore((s) => s.loaded);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    const supabase = createSupabaseBrowserClient();

    const tryLoad = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      try {
        // If user already has a loaded scenario from previous session, refresh its params from DB
        if (loaded.kind === "fork" || loaded.kind === "master") {
          const sc = await getScenarioById(loaded.id);
          if (sc) {
            loadParams(sc.params, sc.is_master
              ? { kind: "master", id: sc.id, name: sc.name, version: sc.version }
              : { kind: "fork", id: sc.id, name: sc.name });
            return;
          }
          // Scenario disappeared — fall through to master
        }

        // Default: load current master
        const master = await getCurrentMaster();
        if (master) {
          loadParams(master.params, {
            kind: "master",
            id: master.id,
            name: master.name,
            version: master.version,
          });
        }
      } catch {
        // ignore
      }
    };
    tryLoad();
  }, [loadParams, loaded]);

  return null;
}
