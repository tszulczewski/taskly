// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Textarea } from "./textarea";

afterEach(cleanup);

describe("Textarea", () => {
  it("shows three rows by default", () => {
    render(<Textarea aria-label="Description" />);
    expect(screen.getByRole("textbox", { name: "Description" }).getAttribute("rows")).toBe("3");
  });

  it("accepts a different row count and classes", () => {
    render(<Textarea aria-label="Notes" rows={6} className="extra" />);
    const textarea = screen.getByRole("textbox", { name: "Notes" });
    expect(textarea.getAttribute("rows")).toBe("6");
    expect(textarea.className).toContain("extra");
  });
});
