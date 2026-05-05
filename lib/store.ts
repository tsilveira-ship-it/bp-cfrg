"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS } from "./model/defaults";
import { normalizeParams, type FieldNote, type ModelParams } from "./model/types";

type ScenarioName = "base" | "audit" | "custom";

type LoadedRef =
  | { kind: "none" }
  | { kind: "master"; id: string; name: string; version: number }
  | { kind: "fork"; id: string; name: string };

type Store = {
  params: ModelParams;
  scenario: ScenarioName;
  loaded: LoadedRef;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
  patch: (path: string, value: unknown) => void;
  setFieldNote: (path: string, note: string, author?: string) => void;
  clearFieldNote: (path: string) => void;
  applyScenario: (s: ScenarioName) => void;
  setLoaded: (l: LoadedRef) => void;
  loadParams: (params: ModelParams, ref: LoadedRef) => void;
  reset: () => void;
};

function setByPath(obj: any, path: string, value: unknown): any {
  const keys = path.split(".");
  const root = structuredClone(obj);
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return root;
}

export const useModelStore = create<Store>()(
  persist(
    (set) => ({
      params: DEFAULT_PARAMS,
      scenario: "base",
      loaded: { kind: "none" } as LoadedRef,
      setParams: (updater) =>
        set((s) => ({ params: updater(s.params), scenario: "custom" })),
      patch: (path, value) =>
        set((s) => ({ params: setByPath(s.params, path, value), scenario: "custom" })),
      setFieldNote: (path, note, author) =>
        set((s) => {
          const trimmed = note.trim();
          const next: Record<string, FieldNote> = { ...(s.params.fieldNotes ?? {}) };
          if (!trimmed) {
            delete next[path];
          } else {
            next[path] = { note: trimmed, author, date: new Date().toISOString() };
          }
          return {
            params: { ...s.params, fieldNotes: next },
            scenario: "custom",
          };
        }),
      clearFieldNote: (path) =>
        set((s) => {
          const cur = s.params.fieldNotes;
          if (!cur || !cur[path]) return s;
          const next = { ...cur };
          delete next[path];
          return {
            params: { ...s.params, fieldNotes: next },
            scenario: "custom",
          };
        }),
      applyScenario: (sc) =>
        set(() => ({
          scenario: sc,
          params: sc === "audit" ? AUDIT_CORRECTED_PARAMS : DEFAULT_PARAMS,
          loaded: { kind: "none" },
        })),
      setLoaded: (l) => set(() => ({ loaded: l })),
      loadParams: (params, ref) =>
        set(() => ({ params: normalizeParams(params), loaded: ref, scenario: "custom" })),
      reset: () =>
        set(() => ({ params: DEFAULT_PARAMS, scenario: "base", loaded: { kind: "none" } })),
    }),
    {
      name: "cfrg-bp-params-v3",
      version: 3,
      migrate: (persisted: any) => {
        if (!persisted || !persisted.params) {
          return { params: DEFAULT_PARAMS, scenario: "base", loaded: { kind: "none" } };
        }
        return {
          ...persisted,
          params: normalizeParams(persisted.params),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state && state.params) {
          state.params = normalizeParams(state.params);
        }
      },
    }
  )
);
