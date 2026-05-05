"use client";
import { useEffect, useRef } from "react";
import { useModelStore } from "@/lib/store";
import { getActiveScenario } from "@/app/actions/scenarios";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ActiveScenarioLoader() {
  const setParams = useModelStore((s) => s.setParams);
  const loaded = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const tryLoad = async () => {
      if (loaded.current) return;
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      try {
        const sc = await getActiveScenario();
        if (sc) {
          setParams(() => sc.params);
          loaded.current = true;
        }
      } catch {
        // ignore
      }
    };
    tryLoad();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        loaded.current = false;
        tryLoad();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [setParams]);

  return null;
}
