// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { FutureExpenses, type FutureExpensesProps } from "./future-expenses";
import { defaultExpensesText } from "./text";
import {
  UnestimatedTasks,
  type EstimateValues,
  type UnestimatedItem,
  type UnestimatedTasksProps,
} from "./unestimated-tasks";

afterEach(cleanup);

const seal: UnestimatedItem = { id: "seal", title: "Seal the bath" };
const tap: UnestimatedItem = { id: "tap", title: "Fix the dripping kitchen tap" };
/** A subtask without an estimate, named with its task (D27). */
const tiles: UnestimatedItem = { id: "tiles", title: "Tiles", taskTitle: "Bathroom tiles" };
/** "Add estimate" needs one amount; the other may stay empty (R18). */
const oneAmount = (values: EstimateValues) =>
  values.amount === "" && values.upTo === "" ? { amount: "Enter an amount." } : {};
const ok = async () => ({ ok: true as const });

function renderExpenses(props: Partial<FutureExpensesProps> = {}) {
  const handlers = { onRetry: vi.fn(), onAddEstimate: vi.fn(ok) };
  const result = render(
    <FutureExpenses
      status="ready"
      total="12 000–15 000 zł"
      unestimated={[seal, tap]}
      validate={oneAmount}
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
const typeUpTo = (value: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: /^up to/ }), { target: { value } });
const save = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  });
};

describe("defaultExpensesText", () => {
  it("counts tasks and subtasks without an estimate (D27)", () => {
    const { unestimated, addEstimateFor } = defaultExpensesText;
    expect(unestimated(1, 0)).toBe("1 task without an estimate");
    expect(unestimated(3, 0)).toBe("3 tasks without an estimate");
    expect(unestimated(0, 1)).toBe("1 subtask without an estimate");
    expect(unestimated(0, 3)).toBe("3 subtasks without an estimate");
    expect(unestimated(2, 1)).toBe("2 tasks and 1 subtask without an estimate");
    expect(addEstimateFor("Seal the bath")).toBe("Add estimate for “Seal the bath”");
    expect(addEstimateFor("Tiles", "Bathroom tiles")).toBe(
      "Add estimate for “Tiles” in “Bathroom tiles”",
    );
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
        validate={oneAmount}
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
    type("Amount", "150");
    await save();
    expect(onAddEstimate).toHaveBeenCalledWith("seal", { amount: "150", upTo: "" });
    rerender(
      <FutureExpenses
        status="ready"
        total="12 150–15 200 zł"
        unestimated={[]}
        validate={oneAmount}
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
      <UnestimatedTasks items={[seal, tap]} validate={oneAmount} onAddEstimate={onAddEstimate} />,
    );
    return { onAddEstimate, ...result };
  }

  it("opens to the rule and an Add estimate per item", () => {
    renderList();
    open();
    expect(screen.getByText(defaultExpensesText.unestimatedRule)).toBeTruthy();
    expect(screen.getByRole("list", { name: "2 tasks without an estimate" }).children).toHaveLength(
      2,
    );
  });

  it("names a subtask with its task, and counts it apart from tasks (D27)", () => {
    render(
      <UnestimatedTasks items={[seal, tiles]} validate={oneAmount} onAddEstimate={vi.fn(ok)} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "1 task and 1 subtask without an estimate" }),
    );
    const line = screen.getByText("Tiles").closest("li")!;
    expect(line.textContent).toBe("Tiles · Bathroom tilesAdd estimate");
    expect(
      screen.getByRole("button", { name: "Add estimate for “Tiles” in “Bathroom tiles”" }),
    ).toBeTruthy();
  });

  it("moves focus to the item before when the last one got its estimate", async () => {
    const props = { validate: oneAmount, onAddEstimate: vi.fn(ok) };
    const { rerender } = render(<UnestimatedTasks items={[seal, tiles]} {...props} />);
    fireEvent.click(
      screen.getByRole("button", { name: "1 task and 1 subtask without an estimate" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add estimate for “Tiles” in “Bathroom tiles”" }),
    );
    type("Amount", "80");
    await save();
    rerender(<UnestimatedTasks items={[seal]} {...props} />);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add estimate for “Seal the bath”" }),
    );
  });

  it("asks for an amount in place and returns focus on Cancel or Escape", async () => {
    const { onAddEstimate } = renderList();
    open();
    addEstimate("Seal the bath");
    expect(screen.getByRole("group", { name: "Estimate for “Seal the bath”" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Amount" }));
    expect(screen.getByRole("textbox", { name: /^up to/ })).toBeTruthy();
    await save();
    expect(screen.getAllByText("Enter an amount.")).toHaveLength(1);
    expect(onAddEstimate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add estimate for “Seal the bath”" }),
    );
    addEstimate("Seal the bath");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Amount" }), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Amount" }), { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "Amount" })).toBeNull();
  });

  it("ignores Escape while saving", async () => {
    let finish: (value: { ok: true }) => void = () => {};
    renderList(vi.fn(() => new Promise<{ ok: true }>((resolve) => (finish = resolve))));
    open();
    addEstimate("Seal the bath");
    type("Amount", "150");
    typeUpTo("200");
    await save();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Amount" }), { key: "Escape" });
    expect(screen.getByRole("textbox", { name: "Amount" })).toBeTruthy();
    await act(async () => finish({ ok: true }));
  });

  it("shows a refused save and keeps the amounts", async () => {
    renderList(vi.fn(async () => ({ ok: false as const, formError: "Could not save." })));
    open();
    addEstimate("Seal the bath");
    type("Amount", "150");
    typeUpTo("200");
    await save();
    expect(screen.getByText("Could not save.")).toBeTruthy();
    expect((screen.getByRole("textbox", { name: /^up to/ }) as HTMLInputElement).value).toBe("200");
  });

  it("moves focus to the next item after a save", async () => {
    const { rerender, onAddEstimate } = renderList();
    open();
    addEstimate("Seal the bath");
    type("Amount", "150");
    typeUpTo("200");
    await save();
    rerender(<UnestimatedTasks items={[tap]} validate={oneAmount} onAddEstimate={onAddEstimate} />);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add estimate for “Fix the dripping kitchen tap”" }),
    );
  });

  it("renders nothing when nothing is missing, and needs no onEmptied", async () => {
    const { container, rerender, onAddEstimate } = renderList();
    open();
    addEstimate("Fix the dripping kitchen tap");
    type("Amount", "80");
    typeUpTo("120");
    await save();
    rerender(<UnestimatedTasks items={[]} validate={oneAmount} onAddEstimate={onAddEstimate} />);
    expect(container.textContent).toBe("");
  });
});
