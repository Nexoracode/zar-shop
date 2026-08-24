const collapsedStorageKey = "zar-admin-bp-sidebar-collapsed";
const collapsedChangeEvent = "zar-admin-bp-sidebar-change";

/**
 * Collapsed/expanded state of the blueprint admin rail, kept in localStorage so it survives
 * navigation. Exposed as an external store (same shape as `admin-theme.ts`) so components read
 * it through `useSyncExternalStore` instead of syncing it in an effect.
 */
export function subscribeToSidebarCollapsed(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(collapsedChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(collapsedChangeEvent, callback);
  };
}

export function getSidebarCollapsed() {
  return window.localStorage.getItem(collapsedStorageKey) === "1";
}

/** The rail always renders expanded on the server, so the first client paint matches. */
export function getSidebarCollapsedServerSnapshot() {
  return false;
}

export function setSidebarCollapsed(collapsed: boolean) {
  window.localStorage.setItem(collapsedStorageKey, collapsed ? "1" : "0");
  window.dispatchEvent(new Event(collapsedChangeEvent));
}
