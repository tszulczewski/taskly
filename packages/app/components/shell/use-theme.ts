"use client";

import type { Theme } from "@taskly/ui";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY, toTheme } from "./theme-script";

// The stored value never changes behind our back in this tab, so there is nothing to subscribe to.
const subscribe = () => () => {};

// Storage may be missing or throw (private window, blocked site data): fall back to the default.
function readStoredTheme(): Theme {
  try {
    return toTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
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
 * The theme for `ThemeToggle`: read from storage after hydration (the server renders the default).
 * `ThemeScript` already set `data-theme` on `<html>` before the first paint; this keeps it in step
 * with a new choice, so portalled menus and dialogs follow it.
 */
export function useTheme() {
  const stored = useSyncExternalStore(subscribe, readStoredTheme, () => DEFAULT_THEME);
  const [chosen, setChosen] = useState<Theme | null>(null);
  const theme = chosen ?? stored;

  // Reads storage itself rather than `stored`: the hydration render still holds the server default,
  // and applying it would flash a stored light theme dark. On mount this re-applies what the script
  // set (React's development remount clears attributes on `<html>`).
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = chosen ?? readStoredTheme();
  }, [chosen]);

  const setTheme = (next: Theme) => {
    setChosen(next);
    storeTheme(next);
  };

  return { theme, setTheme };
}
