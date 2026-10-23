import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps a token text size and a token text colour together", () => {
    expect(cn("text-meta", "text-muted")).toBe("text-meta text-muted");
  });

  it("lets a later utility of the same kind win", () => {
    expect(cn("px-field-x", "pr-touch", "text-muted", "text-danger")).toBe(
      "px-field-x pr-touch text-danger",
    );
    expect(cn("bg-place-1", "bg-place-2")).toBe("bg-place-2");
  });

  it("drops falsy values", () => {
    expect(cn("rounded-control", false, undefined, "rounded-surface")).toBe("rounded-surface");
  });
});
