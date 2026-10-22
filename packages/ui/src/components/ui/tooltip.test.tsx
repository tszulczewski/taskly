// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Tooltip } from "./tooltip";

afterEach(cleanup);

describe("Tooltip", () => {
  it("shows the button's own name and does not describe the button twice", async () => {
    render(
      <Tooltip side="bottom">
        <button type="button" aria-label="More actions">
          …
        </button>
      </Tooltip>,
    );
    const button = screen.getByRole("button", { name: "More actions" });
    await act(async () => {
      button.focus();
    });
    const tooltip = document.querySelector('[data-slot="tooltip"]');
    expect(tooltip?.textContent).toContain("More actions");
    expect(tooltip?.getAttribute("aria-hidden")).toBe("true");
    expect(button.hasAttribute("aria-describedby")).toBe(false);
  });
});
