"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "@heroui/react";
import {
  COMPARE_STORAGE_KEY,
  canAddToCompare,
  compareRejectionMessage,
  readCompareStorage,
  type CompareItem,
} from "@/modules/compare/compare";

/*
 * The compare list is a module-level external store the provider reads through
 * `useSyncExternalStore`: localStorage is the source of truth, so the same list survives a reload
 * and stays in step across tabs without an effect writing state on mount.
 */

const SERVER_SNAPSHOT: CompareItem[] = [];
let current: CompareItem[] = SERVER_SNAPSHOT;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  current = readCompareStorage(window.localStorage.getItem(COMPARE_STORAGE_KEY));
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== COMPARE_STORAGE_KEY) return;
    current = readCompareStorage(event.newValue);
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: CompareItem[]) {
  current = next;
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage disabled or full — the in-memory list still works for this tab */
  }
  emit();
}

type CompareContextValue = {
  items: CompareItem[];
  count: number;
  has: (productId: string) => boolean;
  /** Adds the product, or removes it when already present. Returns the resulting membership. */
  toggle: (item: CompareItem) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
};

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, () => current, () => SERVER_SNAPSHOT);

  const has = useCallback((productId: string) => current.some((entry) => entry.id === productId), []);

  const remove = useCallback((productId: string) => {
    write(current.filter((entry) => entry.id !== productId));
  }, []);

  const clear = useCallback(() => write([]), []);

  const toggle = useCallback((item: CompareItem) => {
    if (current.some((entry) => entry.id === item.id)) {
      write(current.filter((entry) => entry.id !== item.id));
      return false;
    }
    const check = canAddToCompare(current, item);
    if (!check.ok) {
      toast.warning(compareRejectionMessage(check.reason));
      return false;
    }
    write([...current, item]);
    return true;
  }, []);

  const value = useMemo<CompareContextValue>(
    () => ({ items, count: items.length, has, toggle, remove, clear }),
    [items, has, toggle, remove, clear],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) throw new Error("useCompare must be used inside <CompareProvider>");
  return context;
}
