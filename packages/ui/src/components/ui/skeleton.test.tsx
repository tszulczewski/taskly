// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

afterEach(cleanup);

describe("Skeleton", () => {
  it("is hidden from assistive tech and takes size classes", () => {
    const { container } = render(<Skeleton className="w-1/2" />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.getAttribute("aria-hidden")).toBe("true");
    expect(bar.className).toContain("w-1/2");
    expect(bar.className).toContain("bg-raised");
  });
});
