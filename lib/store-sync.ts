"use client";
import { createSupabaseBrowserClient } from "./supabase/client";
import { useModelStore } from "./store";
import type { ModelParams } from "./model/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Synchronisation cross-tab + cross-device du store paramètres.
 *
 * Deux canaux complémentaires :
 *   A. BroadcastChannel — propage entre onglets du MÊME navigateur (~0 ms).
 *      Fonctionne même hors-ligne.
 *   B. Supabase Realtime — propage entre devices du MÊME compte (~200-500 ms).
 *      Nécessite session authentifiée + connexion réseau.
 *
 * Chaque client a un `CLIENT_ID` unique (généré au chargement de la page).
 * Quand le store change localement, on broadcast l'état complet avec ce CLIENT_ID.
 * Quand un message arrive, on l'applique au store UNIQUEMENT s'il ne vient pas
 * de nous-mêmes (sinon boucle infinie).
 *
 * Le flag `isApplyingRemote` empêche aussi de re-broadcast un changement qui
 * vient lui-même d'être appliqué depuis un canal distant.
 */

const CLIENT_ID = Math.random().toString(36).slice(2, 14);
const BROADCAST_CHANNEL_NAME = "cfrg-bp-sync";
const REALTIME_EVENT = "store-update";

type SyncPayload = {
  params: ModelParams;
  scenario: "base" | "audit" | "custom";
  loaded:
    | { kind: "none" }
    | { kind: "master"; id: string; name: string; version: number }
    | { kind: "fork"; id: string; name: string };
};

type SyncEnvelope = {
  source: string;
  ts: number;
  payload: SyncPayload;
};

let bc: BroadcastChannel | null = null;
let rt: RealtimeChannel | null = null;
let isApplyingRemote = false;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let unsubStore: (() => void) | null = null;

function applyRemote(env: SyncEnvelope) {
  if (env.source === CLIENT_ID) return; // echo de nous-mêmes
  isApplyingRemote = true;
  try {
    useModelStore.setState({
      params: env.payload.params,
      scenario: env.payload.scenario,
      loaded: env.payload.loaded,
    });
  } finally {
    // Reset après microtask pour laisser le subscriber détecter le changement
    // sans déclencher un re-broadcast.
    queueMicrotask(() => {
      isApplyingRemote = false;
    });
  }
}

function broadcastCurrent() {
  const state = useModelStore.getState();
  const env: SyncEnvelope = {
    source: CLIENT_ID,
    ts: Date.now(),
    payload: {
      params: state.params,
      scenario: state.scenario,
      loaded: state.loaded,
    },
  };
  try {
    bc?.postMessage(env);
  } catch {
    // BroadcastChannel peut throw si le canal est fermé entre temps — silencieux.
  }
  if (rt) {
    rt.send({ type: "broadcast", event: REALTIME_EVENT, payload: env }).catch(() => {
      // Pas de retry — au prochain changement on retentera.
    });
  }
}

/**
 * Active la synchronisation. Idempotent : appels successifs avec le même userId
 * sont no-op. Si userId change (logout puis login différent), recrée le canal
 * Supabase mais conserve le BroadcastChannel.
 *
 * @returns une fonction de cleanup pour démontage React.
 */
export function initStoreSync(userId: string | null): () => void {
  if (typeof window === "undefined") return () => {};

  // (A) BroadcastChannel — toujours actif si supporté
  if (!bc && typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    bc.onmessage = (e: MessageEvent<SyncEnvelope>) => {
      if (e.data && typeof e.data === "object" && "source" in e.data) {
        applyRemote(e.data);
      }
    };
  }

  // (B) Supabase Realtime — uniquement si authentifié
  if (userId && !rt) {
    const supabase = createSupabaseBrowserClient();
    const channelName = `user-bp-sync:${userId}`;
    rt = supabase
      .channel(channelName, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: REALTIME_EVENT }, (msg) => {
        const env = msg.payload as SyncEnvelope | undefined;
        if (env && env.source) applyRemote(env);
      })
      .subscribe();
  }

  // Subscribe au store local — broadcast après chaque mutation locale.
  // Throttle 150 ms pour éviter spam réseau quand l'utilisateur tape vite
  // dans un input numérique. Le BroadcastChannel local est instantané, donc
  // pour l'expérience cross-tab same-browser, le throttle n'est pas perçu.
  if (!unsubStore) {
    unsubStore = useModelStore.subscribe((state, prev) => {
      if (isApplyingRemote) return;
      if (
        state.params === prev.params &&
        state.scenario === prev.scenario &&
        state.loaded === prev.loaded
      ) {
        return;
      }
      if (throttleTimer) clearTimeout(throttleTimer);
      throttleTimer = setTimeout(broadcastCurrent, 150);
    });
  }

  return () => {
    if (throttleTimer) clearTimeout(throttleTimer);
    if (unsubStore) {
      unsubStore();
      unsubStore = null;
    }
    bc?.close();
    bc = null;
    if (rt) {
      const supabase = createSupabaseBrowserClient();
      supabase.removeChannel(rt);
      rt = null;
    }
  };
}

/** Identifiant unique de cet onglet — exposé pour debug/UI optionnelle. */
export function getClientId(): string {
  return CLIENT_ID;
}
