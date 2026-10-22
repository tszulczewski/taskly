// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Surface } from "./surface";

afterEach(cleanup);

describe("Surface", () => {
  it("is a div without padding by default", () => {
    render(<Surface data-testid="s">Tasks</Surface>);
    const surface = screen.getByTestId("s");
    expect(surface.tagName).toBe("DIV");
    expect(surface.className).not.toContain("p-inset");
  });

  it("pads free content and can render its child", () => {
    render(
      <Surface asChild padding="inset">
        <section aria-label="Sign in">Form</section>
      </Surface>,
    );
    const surface = screen.getByRole("region", { name: "Sign in" });
    expect(surface.className).toContain("p-inset");
  });
});
