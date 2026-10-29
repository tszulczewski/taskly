// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskListScreen } from "./task-list-screen";

afterEach(cleanup);

describe("TaskListScreen", () => {
  it("renders the screen for the given list", () => {
    const { container } = render(<TaskListScreen listId="list-1" />);
    const root = container.querySelector('[data-slot="task-list-screen"]');
    expect(root?.getAttribute("data-list-id")).toBe("list-1");
  });
});
