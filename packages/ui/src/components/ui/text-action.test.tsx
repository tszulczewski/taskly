// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextAction } from "./text-action";

afterEach(cleanup);

describe("TextAction", () => {
  it("is a button in the action tone by default", () => {
    const onClick = vi.fn();
    render(<TextAction onClick={onClick}>Add estimate</TextAction>);
    const button = screen.getByRole("button", { name: "Add estimate" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toContain("text-action");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("has a muted tone for empty-value prompts", () => {
    render(<TextAction tone="muted">Add a description</TextAction>);
    expect(screen.getByRole("button", { name: "Add a description" }).className).toContain(
      "text-muted",
    );
  });
});
