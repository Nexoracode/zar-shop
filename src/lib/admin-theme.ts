export type AdminThemePreference = "system" | "light" | "dark";

export const adminThemeCookie = "zar-admin-theme";
const themeChangeEvent = "zar-admin-theme-change";

/**
 * Light/dark/system preference for the Blueprint admin panel.
 *
 * Lives in a cookie rather than localStorage so the server can read it and render the correct
 * theme on the very first paint. From localStorage the server had no way to know, so every load
 * painted the light theme and then snapped to dark the moment React hydrated (same issue
 * `admin-sidebar-state.ts` already solved this way for the rail's collapsed state).
 */
export function subscribeToAdminTheme(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  window.addEventListener(themeChangeEvent, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(themeChangeEvent, callback);
    media.removeEventListener("change", callback);
  };
}

export function getAdminThemePreference(): AdminThemePreference {
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${adminThemeCookie}=`));
  const value = match?.slice(adminThemeCookie.length + 1);
  return value === "light" || value === "dark" ? value : "system";
}

export function getResolvedAdminTheme(): "light" | "dark" {
  const preference = getAdminThemePreference();
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setAdminThemePreference(preference: AdminThemePreference) {
  // A year, so the choice survives; `lax` because nothing here is worth sending cross-site.
  if (preference === "system") document.cookie = `${adminThemeCookie}=; path=/; max-age=0; samesite=lax`;
  else document.cookie = `${adminThemeCookie}=${preference}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(themeChangeEvent));
}
