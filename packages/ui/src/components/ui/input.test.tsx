// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Input } from "./input";

afterEach(cleanup);

describe("Input", () => {
  it("renders a text input inside a frame and keeps its own describedby", () => {
    render(<Input aria-label="Title" aria-describedby="hint" className="extra" />);
    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input.getAttribute("aria-describedby")).toBe("hint");
    expect(input.parentElement?.className).toContain("extra");
  });

  it("announces the suffix with the field", () => {
    render(<Input aria-label="Minimum" inputMode="decimal" suffix="zł" />);
    const input = screen.getByRole("textbox", { name: "Minimum" });
    const suffixId = input.getAttribute("aria-describedby");
    expect(suffixId).toBeTruthy();
    expect(document.getElementById(String(suffixId))?.textContent).toBe("zł");
    expect(input.className).toContain("numeric");
  });

  it("joins the suffix to an existing describedby", () => {
    render(<Input aria-label="Maximum" aria-describedby="hint" suffix="zł" />);
    const ids = screen.getByRole("textbox").getAttribute("aria-describedby")?.split(" ");
    expect(ids?.[0]).toBe("hint");
    expect(ids).toHaveLength(2);
  });
});
