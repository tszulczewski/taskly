// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  ThemeScript,
  themeScript,
  toTheme,
} from "./theme-script";

// Runs the script the way the browser does: as plain source, in the page's global scope.
const runScript = () => new Function(themeScript)();

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("toTheme", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    [null, "dark"],
    ["blue", "dark"],
  ] as const)("maps %s to %s", (stored, theme) => {
    expect(toTheme(stored)).toBe(theme);
  });

  it("defaults to dark", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });
});

describe("themeScript", () => {
  it.each(["light", "dark"])("applies a stored %s theme", (theme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    runScript();
    expect(document.documentElement.getAttribute("data-theme")).toBe(theme);
  });

  it("applies the default when nothing is stored", () => {
    runScript();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("applies the default for an unknown stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "</script><script>alert(1)");
    runScript();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("applies the default when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(runScript).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("reads the same key as the theme switch", () => {
    expect(themeScript).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });
});

describe("ThemeScript", () => {
  it("renders the script inline, unescaped", () => {
    expect(renderToStaticMarkup(<ThemeScript />)).toBe(`<script>${themeScript}</script>`);
  });
});
