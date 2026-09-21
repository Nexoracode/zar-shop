import { useSyncExternalStore } from "react";
import type { HostSections } from "@/modules/page-builder/pending-sections";

// The page builder and the homepage's `PendingSectionsHost` live in different parts of the tree (the builder is a
// sibling of the server-rendered home), so the sections that only exist in the builder's draft — or whose content was
// edited there — are handed over here.

const empty: HostSections = {};
let current: HostSections = empty;
const listeners = new Set<() => void>();

export function setPendingSections(next: HostSections) {
  current = next;
  listeners.forEach((listener) => listener());
}

/** Set while the page has nothing left on it in the builder's draft: what the card that invites adding a section does. */
export type EmptyPage = { onAdd: () => void } | null;
let emptyPage: EmptyPage = null;

export function setEmptyPage(next: EmptyPage) {
  emptyPage = next;
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

export function useEmptyPage() {
  return useSyncExternalStore(subscribe, () => emptyPage, () => null);
}
