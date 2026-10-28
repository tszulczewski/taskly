"use client";

import type { Theme } from "@taskly/ui";
import { useEffect, useState, useSyncExternalStore } from "react";

/** Per-viewer choice; the design system has no "system" option and dark is the default (Q1). */
export const THEME_STORAGE_KEY = "taskly-theme";
const DEFAULT_THEME: Theme = "dark";

// The stored value never changes behind our back in this tab, so there is nothing to subscribe to.
const subscribe = () => () => {};

// Storage may be missing or throw (private window, blocked site data): fall back to the default.
function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function storeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not saved: the choice still applies until the page is reloaded.
  }
}

/**
 * The theme for `ThemeToggle`: read from storage after hydration (the server renders the default),
 * applied as `data-theme` on `<html>` so portalled menus and dialogs follow it.
 */
export function useTheme() {
  const stored = useSyncExternalStore(subscribe, readStoredTheme, () => DEFAULT_THEME);
  const [chosen, setChosen] = useState<Theme | null>(null);
  const theme = chosen ?? stored;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = (next: Theme) => {
    setChosen(next);
    storeTheme(next);
  };

  return { theme, setTheme };
}
