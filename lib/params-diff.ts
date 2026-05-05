import type { ModelParams } from "./model/types";

export type DiffEntry = {
  path: string;
  before: unknown;
  after: unknown;
  kind: "added" | "removed" | "changed";
};

/** Diff récursif entre deux objets, retourne la liste des chemins modifiés. */
export function diffParams(a: ModelParams, b: ModelParams): DiffEntry[] {
  const out: DiffEntry[] = [];
  walk(a as unknown, b as unknown, "", out);
  return out;
}

function walk(a: unknown, b: unknown, path: string, out: DiffEntry[]) {
  if (a === b) return;
  if (a === undefined && b !== undefined) {
    out.push({ path, before: undefined, after: b, kind: "added" });
    return;
  }
  if (b === undefined && a !== undefined) {
    out.push({ path, before: a, after: undefined, kind: "removed" });
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      walk(a[i], b[i], `${path}[${i}]`, out);
    }
    return;
  }
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k, out);
    }
    return;
  }
  if (a !== b) {
    out.push({ path, before: a, after: b, kind: "changed" });
  }
}

/** Filtre les chemins "bruit" (notes, fieldNotes, capTable internals) si demandé. */
export function filterDiff(entries: DiffEntry[], opts: { includeNotes?: boolean } = {}): DiffEntry[] {
  if (opts.includeNotes) return entries;
  return entries.filter((e) => !e.path.startsWith("fieldNotes") && !e.path.startsWith("notes"));
}

export function summarizeDiff(entries: DiffEntry[]): {
  added: number;
  removed: number;
  changed: number;
  total: number;
  byTopLevel: Record<string, number>;
} {
  const byTopLevel: Record<string, number> = {};
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const e of entries) {
    if (e.kind === "added") added++;
    else if (e.kind === "removed") removed++;
    else changed++;
    const top = e.path.split(/[.[]/)[0];
    byTopLevel[top] = (byTopLevel[top] ?? 0) + 1;
  }
  return { added, removed, changed, total: entries.length, byTopLevel };
}
