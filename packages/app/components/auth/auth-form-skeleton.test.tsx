// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthFormSkeleton } from "./auth-form-skeleton";

afterEach(cleanup);

describe("AuthFormSkeleton", () => {
  it("says it is loading and hides the bars from assistive tech", () => {
    const { container } = render(<AuthFormSkeleton />);
    expect(screen.getByRole("status").textContent).toBe("Loading…");
    const bars = container.querySelectorAll('[data-slot="skeleton"]');
    expect(bars).toHaveLength(5);
    bars.forEach((bar) => expect(bar.getAttribute("aria-hidden")).toBe("true"));
  });
});
