"use client";
import { useEffect } from "react";
import { initStoreSync } from "@/lib/store-sync";

/**
 * Active la synchronisation cross-tab + cross-device dès le mount du dashboard.
 * Le `userId` vient du server-side (auth Supabase) pour éviter une seconde
 * round-trip côté client.
 *
 * Si `userId` est null (utilisateur non authentifié), seule la sync
 * BroadcastChannel reste active — ce qui couvre quand même le cas "j'ai 2 onglets
 * sur la même session locale".
 */
export function StoreSyncProvider({ userId }: { userId: string | null }) {
  useEffect(() => {
    const cleanup = initStoreSync(userId);
    return cleanup;
  }, [userId]);
  return null;
}
