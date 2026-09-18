/**
 * Which columns of a Blueprint admin table are hidden, keyed per table id.
 *
 * Lives in a cookie rather than localStorage so the server can read it and render the right
 * columns on the very first paint — same reasoning as `admin-sidebar-state.ts` and
 * `admin-theme.ts` for the rail width and theme.
 */

function cookieName(tableId: string) {
  return `zar-admin-cols-${tableId}`;
}

function changeEventName(tableId: string) {
  return `zar-admin-cols-change-${tableId}`;
}

/** Server-side: parse a cookie's raw value (from `cookies().get(name)?.value`) into hidden ids. */
export function parseHiddenColumnsCookie(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function columnVisibilityCookieName(tableId: string) {
  return cookieName(tableId);
}

export function subscribeToHiddenColumns(tableId: string, callback: () => void) {
  const eventName = changeEventName(tableId);
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}

export function getHiddenColumns(tableId: string): string[] {
  const name = cookieName(tableId);
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`));
  return parseHiddenColumnsCookie(match?.slice(name.length + 1));
}

export function setHiddenColumns(tableId: string, hidden: string[]) {
  const name = cookieName(tableId);
  // A year, so the choice survives; `lax` because nothing here is worth sending cross-site.
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(hidden))}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(changeEventName(tableId)));
}
