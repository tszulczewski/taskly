import type { Theme } from "@taskly/ui";

/** Per-viewer choice; the design system has no "system" option and dark is the default (Q1). */
export const THEME_STORAGE_KEY = "taskly-theme";
export const DEFAULT_THEME: Theme = "dark";
const THEMES: readonly Theme[] = ["dark", "light"];

/** A stored value that is not a known theme (or no value) means the default. */
export function toTheme(stored: string | null): Theme {
  return THEMES.find((theme) => theme === stored) ?? DEFAULT_THEME;
}

/**
 * Runs while the browser parses `<head>`, before the first paint, so a stored light theme never
 * flashes dark. It mirrors `toTheme` in plain ES5 (no bundler touches it); blocked storage keeps
 * the default.
 */
export const themeScript = `(function(){var t=${JSON.stringify(DEFAULT_THEME)};try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(THEMES)}.indexOf(s)>=0)t=s}catch(e){}document.documentElement.setAttribute("data-theme",t)})()`;

/** Rendered once in the root layout's `<head>`. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
