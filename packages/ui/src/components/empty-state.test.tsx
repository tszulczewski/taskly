// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

afterEach(cleanup);

describe("EmptyState", () => {
  it("says why it is empty, the next step and an action", () => {
    render(
      <EmptyState title="No tasks yet." action={<button type="button">Add a task</button>}>
        Add the first thing you need to do.
      </EmptyState>,
    );
    expect(screen.getByText("No tasks yet.")).toBeTruthy();
    expect(screen.getByText("Add the first thing you need to do.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a task" })).toBeTruthy();
  });

  it("can be only a title", () => {
    const { container } = render(<EmptyState title="Nothing here yet." className="extra" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.children).toHaveLength(1);
    expect(root.className).toContain("extra");
  });
});
