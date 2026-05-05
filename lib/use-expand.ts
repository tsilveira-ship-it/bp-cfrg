"use client";
import { useCallback, useSyncExternalStore } from "react";

export type ExpandState = {
  expanded: Set<string>;
  toggle: (id: string) => void;
  isExpanded: (id: string) => boolean;
  expandAll: (ids: string[]) => void;
  collapseAll: () => void;
};

const KEY_PREFIX = "bp-expand:";
const SUBSCRIBERS = new Map<string, Set<() => void>>();
const CACHE = new Map<string, Set<string>>();

function read(key: string): Set<string> {
  const cached = CACHE.get(key);
  if (cached) return cached;
  if (typeof window === "undefined") {
    const empty = new Set<string>();
    CACHE.set(key, empty);
    return empty;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const set = new Set<string>(arr.filter((x): x is string => typeof x === "string"));
        CACHE.set(key, set);
        return set;
      }
    }
  } catch {}
  const empty = new Set<string>();
  CACHE.set(key, empty);
  return empty;
}

function write(key: string, set: Set<string>) {
  CACHE.set(key, set);
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
  const subs = SUBSCRIBERS.get(key);
  if (subs) subs.forEach((fn) => fn());
}

function subscribe(key: string, cb: () => void) {
  let subs = SUBSCRIBERS.get(key);
  if (!subs) {
    subs = new Set();
    SUBSCRIBERS.set(key, subs);
  }
  subs.add(cb);
  return () => {
    subs!.delete(cb);
  };
}

const SERVER_EMPTY = new Set<string>();

export function useExpand(namespace: string): ExpandState {
  const storageKey = KEY_PREFIX + namespace;

  const expanded = useSyncExternalStore(
    useCallback((cb) => subscribe(storageKey, cb), [storageKey]),
    useCallback(() => read(storageKey), [storageKey]),
    useCallback(() => SERVER_EMPTY, [])
  );

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(read(storageKey));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      write(storageKey, next);
    },
    [storageKey]
  );

  const isExpanded = useCallback((id: string) => expanded.has(id), [expanded]);

  const expandAll = useCallback(
    (ids: string[]) => {
      write(storageKey, new Set(ids));
    },
    [storageKey]
  );

  const collapseAll = useCallback(() => {
    write(storageKey, new Set());
  }, [storageKey]);

  return { expanded, toggle, isExpanded, expandAll, collapseAll };
}
