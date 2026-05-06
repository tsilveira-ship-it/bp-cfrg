"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PARAMS, AUDIT_CORRECTED_PARAMS } from "./model/defaults";
import {
  normalizeParams,
  type FieldComment,
  type FieldNote,
  type FieldQA,
  type FieldValidation,
  type ModelParams,
} from "./model/types";

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
  addFieldComment: (path: string, text: string, author?: string) => void;
  removeFieldComment: (path: string, commentId: string) => void;
  toggleCommentResolved: (path: string, commentId: string) => void;
  validateField: (path: string, value: unknown, admin: string) => void;
  unvalidateField: (path: string, level: 1 | 2) => void;
  flagField: (path: string, by: string, reason?: string) => void;
  unflagField: (path: string) => void;
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
      addFieldComment: (path, text, author) =>
        set((s) => {
          const trimmed = text.trim();
          if (!trimmed) return s;
          const qa: Record<string, FieldQA> = { ...(s.params.fieldQA ?? {}) };
          const existing = qa[path] ?? { comments: [] };
          const comment: FieldComment = {
            id: `c_${Math.random().toString(36).slice(2, 10)}`,
            author,
            date: new Date().toISOString(),
            text: trimmed,
          };
          qa[path] = { comments: [...existing.comments, comment] };
          return {
            params: { ...s.params, fieldQA: qa },
            scenario: "custom",
          };
        }),
      removeFieldComment: (path, commentId) =>
        set((s) => {
          const qa = s.params.fieldQA;
          if (!qa || !qa[path]) return s;
          const filtered = qa[path].comments.filter((c) => c.id !== commentId);
          const next = { ...qa };
          if (filtered.length === 0) delete next[path];
          else next[path] = { comments: filtered };
          return {
            params: { ...s.params, fieldQA: next },
            scenario: "custom",
          };
        }),
      toggleCommentResolved: (path, commentId) =>
        set((s) => {
          const qa = s.params.fieldQA;
          if (!qa || !qa[path]) return s;
          const updated = qa[path].comments.map((c) =>
            c.id === commentId ? { ...c, resolved: !c.resolved } : c
          );
          return {
            params: { ...s.params, fieldQA: { ...qa, [path]: { comments: updated } } },
            scenario: "custom",
          };
        }),
      validateField: (path, value, admin) =>
        set((s) => {
          const cur: Record<string, FieldValidation> = { ...(s.params.fieldValidations ?? {}) };
          const existing = cur[path] ?? {};
          const stamp = { admin, date: new Date().toISOString(), value };
          // Si pas de level1 → set level1
          // Si level1 existe avec un autre admin → set level2 (4-eyes)
          // Si level1 existe avec le même admin → no-op (un même admin ne peut pas valider 2 fois)
          let next: FieldValidation;
          if (!existing.level1) {
            next = { level1: stamp };
          } else if (existing.level1.admin === admin) {
            // Mise à jour de la 1ère validation (re-stamp si la valeur a changé)
            next = { ...existing, level1: stamp };
          } else if (!existing.level2) {
            next = { ...existing, level2: stamp };
          } else if (existing.level2.admin === admin) {
            next = { ...existing, level2: stamp };
          } else {
            // 2 validations existent déjà avec d'autres admins; pas d'action
            return s;
          }
          cur[path] = next;
          return {
            params: { ...s.params, fieldValidations: cur },
            scenario: "custom",
          };
        }),
      unvalidateField: (path, level) =>
        set((s) => {
          const cur = s.params.fieldValidations;
          if (!cur || !cur[path]) return s;
          const next = { ...cur };
          const v = { ...next[path] };
          if (level === 1) {
            delete v.level1;
            // Si on retire L1, on retire aussi L2 (logiquement le 4-eyes saute)
            delete v.level2;
          } else {
            delete v.level2;
          }
          if (!v.level1 && !v.level2 && !v.flagged) {
            delete next[path];
          } else {
            next[path] = v;
          }
          return {
            params: { ...s.params, fieldValidations: next },
            scenario: "custom",
          };
        }),
      flagField: (path, by, reason) =>
        set((s) => {
          const cur: Record<string, FieldValidation> = { ...(s.params.fieldValidations ?? {}) };
          const existing = cur[path] ?? {};
          cur[path] = { ...existing, flagged: { by, date: new Date().toISOString(), reason: reason?.trim() || undefined } };
          return {
            params: { ...s.params, fieldValidations: cur },
            scenario: "custom",
          };
        }),
      unflagField: (path) =>
        set((s) => {
          const cur = s.params.fieldValidations;
          if (!cur || !cur[path]?.flagged) return s;
          const next = { ...cur };
          const v = { ...next[path] };
          delete v.flagged;
          if (!v.level1 && !v.level2 && !v.flagged) {
            delete next[path];
          } else {
            next[path] = v;
          }
          return {
            params: { ...s.params, fieldValidations: next },
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
