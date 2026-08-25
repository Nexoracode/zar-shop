export const sidebarCollapsedCookie = "zar-admin-bp-sidebar-collapsed";
const collapsedChangeEvent = "zar-admin-bp-sidebar-change";

/**
 * Collapsed/expanded state of the blueprint admin rail.
 *
 * It lives in a cookie rather than localStorage so the server can read it and render the rail
 * at the right width in the very first paint. From localStorage the server had no way to know,
 * so every load painted the expanded rail and then snapped it shut the moment React hydrated.
 *
 * Exposed as an external store (same shape as `admin-theme.ts`) so components read it through
 * `useSyncExternalStore` instead of syncing it in an effect.
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
  return document.cookie.split("; ").includes(`${sidebarCollapsedCookie}=1`);
}

export function setSidebarCollapsed(collapsed: boolean) {
  // A year, so the choice survives; `lax` because nothing here is worth sending cross-site.
  document.cookie = `${sidebarCollapsedCookie}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(collapsedChangeEvent));
}
