// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { FutureExpenses, type FutureExpensesProps } from "./future-expenses";
import { defaultExpensesText } from "./text";
import {
  UnestimatedTasks,
  type EstimateValues,
  type UnestimatedTask,
  type UnestimatedTasksProps,
} from "./unestimated-tasks";

afterEach(cleanup);

const seal: UnestimatedTask = { id: "seal", title: "Seal the bath" };
const tap: UnestimatedTask = { id: "tap", title: "Fix the dripping kitchen tap" };
const both = (values: EstimateValues) => ({
  min: values.min === "" ? "Enter an amount." : undefined,
  max: values.max === "" ? "Enter an amount." : undefined,
});
const ok = async () => ({ ok: true as const });

function renderExpenses(props: Partial<FutureExpensesProps> = {}) {
  const handlers = { onRetry: vi.fn(), onAddEstimate: vi.fn(ok) };
  const result = render(
    <FutureExpenses
      status="ready"
      total="12 000–15 000 zł"
      unestimated={[seal, tap]}
      validate={both}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, ...result };
}

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: "2 tasks without an estimate" }));
const addEstimate = (title: string) =>
  fireEvent.click(screen.getByRole("button", { name: `Add estimate for “${title}”` }));
const type = (name: string, value: string) =>
  fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
const save = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  });
};

describe("defaultExpensesText", () => {
  it("counts tasks without an estimate", () => {
    expect(defaultExpensesText.unestimated(1)).toBe("1 task without an estimate");
    expect(defaultExpensesText.unestimated(3)).toBe("3 tasks without an estimate");
  });
});

describe("FutureExpenses", () => {
  it("shows the range as one status line", () => {
    renderExpenses();
    expect(screen.getByRole("status").textContent).toBe("Future expenses12 000–15 000 zł");
  });

  it("says so when nothing has an estimate, and hides an empty unestimated line", () => {
    renderExpenses({ total: null, unestimated: [] });
    expect(screen.getByRole("status").textContent).toBe("Future expensesNo estimates yet");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("says it is loading", () => {
    renderExpenses({ status: "loading" });
    expect(screen.getByRole("status").textContent).toBe("Loading future expenses…");
  });

  it("offers Try again when it failed, busy while retrying", () => {
    const { onRetry, rerender } = renderExpenses({ status: "error" });
    expect(screen.getByRole("alert").textContent).toBe("Could not load future expenses.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(
      <FutureExpenses
        status="error"
        total={null}
        unestimated={[]}
        validate={both}
        onAddEstimate={ok}
        onRetry={onRetry}
        retrying
      />,
    );
    const retry = screen.getByRole("button", { name: "Trying again…" }) as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
  });

  it("puts focus on the total when the last task got its estimate", async () => {
    const { rerender, onAddEstimate } = renderExpenses({ unestimated: [seal] });
    fireEvent.click(screen.getByRole("button", { name: "1 task without an estimate" }));
    addEstimate("Seal the bath");
    type("Min", "150");
    type("Max", "200");
    await save();
    expect(onAddEstimate).toHaveBeenCalledWith("seal", { min: "150", max: "200" });
    rerender(
      <FutureExpenses
        status="ready"
        total="12 150–15 200 zł"
        unestimated={[]}
        validate={both}
        onAddEstimate={onAddEstimate}
        onRetry={vi.fn()}
      />,
    );
    expect(document.activeElement).toBe(screen.getByRole("status"));
  });
});

describe("UnestimatedTasks", () => {
  function renderList(onAddEstimate: Mock<UnestimatedTasksProps["onAddEstimate"]> = vi.fn(ok)) {
    const result = render(
      <UnestimatedTasks tasks={[seal, tap]} validate={both} onAddEstimate={onAddEstimate} />,
    );
    return { onAddEstimate, ...result };
  }

  it("opens to the rule and an Add estimate per task", () => {
    renderList();
    open();
    expect(screen.getByText(defaultExpensesText.unestimatedRule)).toBeTruthy();
    expect(screen.getByRole("list", { name: "2 tasks without an estimate" }).children).toHaveLength(
      2,
    );
  });

  it("asks for both amounts in place and returns focus on Cancel or Escape", async () => {
    const { onAddEstimate } = renderList();
    open();
    addEstimate("Seal the bath");
    expect(screen.getByRole("group", { name: "Estimate for “Seal the bath”" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Min" }));
    await save();
    expect(screen.getAllByText("Enter an amount.")).toHaveLength(2);
    expect(onAddEstimate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add estimate for “Seal the bath”" }),
    );
    addEstimate("Seal the bath");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Min" }), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Min" }), { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "Min" })).toBeNull();
  });

  it("ignores Escape while saving", async () => {
    let finish: (value: { ok: true }) => void = () => {};
    renderList(vi.fn(() => new Promise<{ ok: true }>((resolve) => (finish = resolve))));
    open();
    addEstimate("Seal the bath");
    type("Min", "150");
    type("Max", "200");
    await save();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Min" }), { key: "Escape" });
    expect(screen.getByRole("textbox", { name: "Min" })).toBeTruthy();
    await act(async () => finish({ ok: true }));
  });

  it("shows a refused save and keeps the amounts", async () => {
    renderList(vi.fn(async () => ({ ok: false as const, formError: "Could not save." })));
    open();
    addEstimate("Seal the bath");
    type("Min", "150");
    type("Max", "200");
    await save();
    expect(screen.getByText("Could not save.")).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Max" }) as HTMLInputElement).value).toBe("200");
  });

  it("moves focus to the next task after a save", async () => {
    const { rerender, onAddEstimate } = renderList();
    open();
    addEstimate("Seal the bath");
    type("Min", "150");
    type("Max", "200");
    await save();
    rerender(<UnestimatedTasks tasks={[tap]} validate={both} onAddEstimate={onAddEstimate} />);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add estimate for “Fix the dripping kitchen tap”" }),
    );
  });

  it("renders nothing without tasks, and needs no onEmptied", async () => {
    const { container, rerender, onAddEstimate } = renderList();
    open();
    addEstimate("Fix the dripping kitchen tap");
    type("Min", "80");
    type("Max", "120");
    await save();
    rerender(<UnestimatedTasks tasks={[]} validate={both} onAddEstimate={onAddEstimate} />);
    expect(container.textContent).toBe("");
  });
});
