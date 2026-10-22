// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { overlayPlacement } from "./overlay";

afterEach(() => document.documentElement.removeAttribute("style"));

it("places overlays from the spacing tokens", () => {
  const root = document.documentElement;
  root.style.fontSize = "16px";
  root.style.setProperty("--space-inline", "0.25rem");
  root.style.setProperty("--space-page-gutter", "1rem");
  expect(overlayPlacement()).toEqual({ sideOffset: 4, collisionPadding: 16 });
});
