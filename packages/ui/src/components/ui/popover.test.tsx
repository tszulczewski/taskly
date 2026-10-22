// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover";

afterEach(cleanup);

describe("Popover", () => {
  it("opens a named panel next to its trigger", () => {
    render(
      <Popover>
        <PopoverTrigger>Places</PopoverTrigger>
        <PopoverContent aria-label="Places for this task" className="extra">
          Bathroom
        </PopoverContent>
      </Popover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Places" }));
    const panel = screen.getByRole("dialog", { name: "Places for this task" });
    expect(panel.className).toContain("extra");
    expect(panel.textContent).toBe("Bathroom");
  });

  it("can open from code, placed by an anchor", () => {
    render(
      <Popover open>
        <PopoverAnchor asChild>
          <button type="button">More actions</button>
        </PopoverAnchor>
        <PopoverContent aria-label="Places for this task">Bathroom</PopoverContent>
      </Popover>,
    );
    expect(screen.getByRole("button", { name: "More actions" }).dataset.slot).toBe(
      "popover-anchor",
    );
    expect(screen.getByRole("dialog", { name: "Places for this task" })).toBeTruthy();
  });
});
