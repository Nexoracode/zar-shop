export type AdminThemePreference = "system" | "light" | "dark";

const themeStorageKey = "zar-admin-theme";
const themeChangeEvent = "zar-admin-theme-change";

export function getAdminThemePreference(): AdminThemePreference {
  const savedTheme = window.localStorage.getItem(themeStorageKey);
  return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system";
}

export function getResolvedAdminTheme(): "light" | "dark" {
  const preference = getAdminThemePreference();
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

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

export function setAdminThemePreference(preference: AdminThemePreference) {
  if (preference === "system") window.localStorage.removeItem(themeStorageKey);
  else window.localStorage.setItem(themeStorageKey, preference);
  window.dispatchEvent(new Event(themeChangeEvent));
}
