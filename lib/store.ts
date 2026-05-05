"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS } from "./model/defaults";
import type { ModelParams } from "./model/types";

type ScenarioName = "base" | "audit" | "custom";

type Store = {
  params: ModelParams;
  scenario: ScenarioName;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
  patch: (path: string, value: unknown) => void;
  applyScenario: (s: ScenarioName) => void;
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
      setParams: (updater) =>
        set((s) => ({ params: updater(s.params), scenario: "custom" })),
      patch: (path, value) =>
        set((s) => ({ params: setByPath(s.params, path, value), scenario: "custom" })),
      applyScenario: (sc) =>
        set(() => ({
          scenario: sc,
          params: sc === "audit" ? AUDIT_CORRECTED_PARAMS : DEFAULT_PARAMS,
        })),
      reset: () => set(() => ({ params: DEFAULT_PARAMS, scenario: "base" })),
    }),
    { name: "cfrg-bp-params-v1" }
  )
);
