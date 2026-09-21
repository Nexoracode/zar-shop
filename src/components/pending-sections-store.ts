import { useSyncExternalStore } from "react";
import type { PendingSections } from "@/modules/page-builder/pending-sections";

// The page builder and the homepage's `PendingSectionsHost` live in different parts of the tree (the builder is a
// sibling of the server-rendered home), so the sections that only exist in the builder's draft are handed over here.

const empty: PendingSections = {};
let current: PendingSections = empty;
const listeners = new Set<() => void>();

export function setPendingSections(next: PendingSections) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePendingSections() {
  return useSyncExternalStore(subscribe, () => current, () => empty);
}
