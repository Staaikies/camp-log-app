export type AppTheme = "default" | "light" | "aurora";

const STORAGE_KEY = "camp-log.theme";

export function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "default";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "aurora" || raw === "default") return raw;
  return "default";
}

export function storeTheme(theme: AppTheme) {
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "default") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

