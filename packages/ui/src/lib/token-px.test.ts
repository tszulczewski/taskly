// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { tokenPx } from "./token-px";

const root = document.documentElement;

afterEach(() => {
  root.removeAttribute("style");
  vi.unstubAllGlobals();
});

describe("tokenPx", () => {
  it("converts a rem token with the root font size", () => {
    root.style.fontSize = "16px";
    root.style.setProperty("--space-page-gutter", " 1.5rem");
    expect(tokenPx("--space-page-gutter")).toBe(24);
  });

  it("reads a px token as is", () => {
    root.style.setProperty("--focus-ring-width", "2px");
    expect(tokenPx("--focus-ring-width")).toBe(2);
  });

  it("returns 0 for a missing token", () => {
    expect(tokenPx("--not-a-token")).toBe(0);
  });

  it("returns 0 without a document", () => {
    vi.stubGlobal("document", undefined);
    expect(tokenPx("--space-inline")).toBe(0);
  });
});
