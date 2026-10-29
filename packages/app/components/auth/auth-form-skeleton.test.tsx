// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthFormSkeleton, type AuthFormSkeletonVariant } from "./auth-form-skeleton";

afterEach(cleanup);

function renderVariant(variant: AuthFormSkeletonVariant) {
  const { container } = render(<AuthFormSkeleton variant={variant} />);
  const root = container.querySelector('[data-slot="auth-form-skeleton"]');
  if (!(root instanceof HTMLElement)) throw new Error("skeleton root not rendered");
  const fields = [...root.querySelectorAll('[data-slot="auth-form-skeleton-field"]')];
  const barsOf = (element: Element) => [
    ...element.querySelectorAll(':scope > [data-slot="skeleton"]'),
  ];
  return { root, fields, barsOf };
}

describe("AuthFormSkeleton", () => {
  it.each<AuthFormSkeletonVariant>(["sign-in", "sign-up"])(
    "%s: says it is loading and hides the bars from assistive tech",
    (variant) => {
      const { root } = renderVariant(variant);
      expect(root.dataset.variant).toBe(variant);
      expect(screen.getByRole("status").textContent).toBe("Loading…");
      const bars = root.querySelectorAll('[data-slot="skeleton"]');
      expect(bars.length).toBeGreaterThan(0);
      bars.forEach((bar) => expect(bar.getAttribute("aria-hidden")).toBe("true"));
    },
  );

  it("sign-in: two fields without hints and the button, no footer link", () => {
    const { root, fields, barsOf } = renderVariant("sign-in");
    expect(fields.map((field) => barsOf(field).length)).toEqual([2, 2]);
    const [button, ...rest] = barsOf(root);
    expect(button?.className).toContain("min-h-control");
    expect(rest).toHaveLength(0);
  });

  it("sign-up: name, email, password with a meta-size hint, the button and the footer link", () => {
    const { root, fields, barsOf } = renderVariant("sign-up");
    expect(fields.map((field) => barsOf(field).length)).toEqual([2, 2, 3]);
    expect(barsOf(fields[2] as Element)[2]?.className).toContain("text-meta");
    const [button, link, ...rest] = barsOf(root);
    expect(button?.className).toContain("min-h-control");
    expect(link?.className).not.toContain("min-h-control");
    expect(rest).toHaveLength(0);
  });
});
