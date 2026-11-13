// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompleteTaskDialog } from "./complete-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { EstimateRange } from "./estimate-range";
import { QuickAdd } from "./quick-add";
import { SubtaskProgress } from "./subtask-progress";
import { TaskForm } from "./task-form";
import { TaskList, type TaskListProps } from "./task-list";
import { defaultTaskText } from "./text";
import type { TaskFormValues, TaskItem } from "./types";
import { TaskRow, type PlaceOptions } from "./task-row";
import type { Place } from "../places/types";

const scrollIntoView = vi.fn();
let reducedMotion = false;

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = vi.fn(() => ({ matches: reducedMotion }) as MediaQueryList);
});
afterEach(cleanup);

const noErrors = () => ({});
const ok = async () => ({ ok: true as const });

const sealBath: TaskItem = {
  id: "seal",
  title: "Seal the bath",
  description: null,
  estimate: null,
  amount: "",
  upTo: "",
};
/** A task with subtasks: its estimate is their sum, one of them has none (R12, R13). */
const paint: TaskItem = {
  id: "paint",
  title: "Paint the ceiling",
  description: "Two coats, white matt.",
  estimate: "300–400 zł",
  amount: "1 200",
  upTo: "1 500",
  unestimatedSubtasks: 1,
  subtasks: [
    {
      id: "plaster",
      title: "Plaster the cracks",
      description: "Above the window.",
      estimate: "300–400 zł",
      amount: "300",
      upTo: "400",
    },
    sealBath,
  ],
};

const values = (title: string): TaskFormValues => ({
  title,
  amount: "",
  upTo: "",
  description: "",
});
const field = (name: string | RegExp) => screen.getByRole("textbox", { name }) as HTMLInputElement;
// jsdom drops the space before the "(optional)" marker in the accessible name.
const description = /^Description/;
const submitForm = async (button: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: button }));
  });
};
const openMenu = (title: string) =>
  fireEvent.keyDown(screen.getByRole("button", { name: `More actions for “${title}”` }), {
    key: "Enter",
  });
const menuItemDisabled = (name: string) =>
  screen.getByRole("menuitem", { name }).getAttribute("aria-disabled");
const choose = async (item: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("menuitem", { name: item }));
  });
};

function renderList(props: Partial<TaskListProps> = {}) {
  const handlers = {
    onRetry: vi.fn(),
    onEdit: vi.fn(ok),
    onAddSubtask: vi.fn(ok),
    onDelete: vi.fn(async () => true),
  };
  render(<TaskList status="ready" tasks={[paint]} validate={noErrors} {...handlers} {...props} />);
  return handlers;
}

describe("EstimateRange", () => {
  it("shows the estimate, or a muted note when there is none", () => {
    const { rerender } = render(<EstimateRange value="1 200–1 500 zł" />);
    expect(screen.getByText("1 200–1 500 zł").className).toContain("numeric");
    rerender(<EstimateRange value="500 zł" />);
    expect(screen.getByText("500 zł").className).toContain("numeric");
    rerender(<EstimateRange value={null} emptyText="Brak szacunku" />);
    expect(screen.getByText("Brak szacunku").className).toContain("text-muted");
  });
});

describe("defaultTaskText", () => {
  it("counts subtasks in the meta line and the delete question", () => {
    expect(defaultTaskText.subtaskCount(1)).toBe("1 subtask");
    expect(defaultTaskText.subtaskCount(3)).toBe("3 subtasks");
    expect(defaultTaskText.deleteTitle("Paint", 0)).toBe("Delete “Paint”?");
    expect(defaultTaskText.deleteTitle("Paint", 1)).toBe("Delete “Paint” and its subtask?");
    expect(defaultTaskText.deleteTitle("Paint", 3)).toBe("Delete “Paint” and its 3 subtasks?");
    expect(defaultTaskText.unestimatedSubtasks(1)).toBe("1 subtask without an estimate");
    expect(defaultTaskText.unestimatedSubtasks(2)).toBe("2 subtasks without an estimate");
  });
});

describe("QuickAdd", () => {
  it("adds by title alone and gets ready for the next task", async () => {
    const onSubmit = vi.fn(ok);
    render(<QuickAdd validate={noErrors} onSubmit={onSubmit} autoFocus />);
    expect(document.activeElement).toBe(field("New task"));
    fireEvent.change(field("New task"), { target: { value: "Buy curtain rods" } });
    await submitForm("Add");
    expect(onSubmit).toHaveBeenCalledWith(values("Buy curtain rods"));
    expect(field("New task").value).toBe("");
    expect(document.activeElement).toBe(field("New task"));
  });

  it("shows the amounts beside the title and the description behind its toggle (C1)", async () => {
    const onSubmit = vi.fn(ok);
    render(<QuickAdd validate={noErrors} onSubmit={onSubmit} />);
    expect(screen.getByRole("group", { name: /^Estimate/ })).toBeTruthy();
    expect(field("Amount").getAttribute("inputmode")).toBe("decimal");
    expect(screen.queryByRole("textbox", { name: description })).toBeNull();
    const toggle = screen.getByRole("button", { name: "Description" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.change(field("New task"), { target: { value: "Tile the floor" } });
    fireEvent.change(field("Amount"), { target: { value: "2 000" } });
    fireEvent.change(field(/^up to/), { target: { value: "2 500" } });
    fireEvent.change(field(description), { target: { value: "Grey, 60×60" } });
    await submitForm("Add");
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Tile the floor",
      amount: "2 000",
      upTo: "2 500",
      description: "Grey, 60×60",
    });
    // Ready for the next task: the description is closed again.
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(field("Amount").value).toBe("");
  });

  it("keeps the description open after a refused add", async () => {
    render(<QuickAdd validate={noErrors} onSubmit={async () => ({ ok: false })} />);
    fireEvent.click(screen.getByRole("button", { name: "Description" }));
    fireEvent.change(field("New task"), { target: { value: "Tile the floor" } });
    await submitForm("Add");
    expect(field(description)).toBeTruthy();
  });

  it("puts an amount error under its field and opens a description with an error", async () => {
    render(
      <QuickAdd
        validate={(form) => ({
          ...(form.upTo === "" ? { upTo: "“Up to” must not be less than the amount." } : {}),
          ...(form.description === "" ? { description: "Too long." } : {}),
        })}
        onSubmit={ok}
      />,
    );
    await submitForm("Add");
    expect(document.activeElement).toBe(field(/^up to/));
    expect(screen.getByText("“Up to” must not be less than the amount.")).toBeTruthy();
    expect(screen.getByText("Too long.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Description" }));
    expect(field(description)).toBeTruthy();
  });

  it("shows a failed add above the form and keeps the title", async () => {
    render(<QuickAdd validate={noErrors} onSubmit={() => Promise.reject(new Error("offline"))} />);
    fireEvent.change(field("New task"), { target: { value: "Fix the tap" } });
    await submitForm("Add");
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong. Try again.");
    expect(field("New task").value).toBe("Fix the tap");
  });

  it("adds a subtask with Cancel and Escape, but not while adding", async () => {
    const onCancel = vi.fn();
    render(
      <QuickAdd validate={noErrors} onSubmit={() => new Promise(() => {})} onCancel={onCancel} />,
    );
    fireEvent.keyDown(field("New subtask"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(field("New subtask"), { key: "Enter" });
    await submitForm("Add");
    fireEvent.keyDown(field("New subtask"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Adding…" })).toBeTruthy();
  });

  it("ignores Escape without a Cancel", () => {
    render(<QuickAdd validate={noErrors} onSubmit={ok} />);
    fireEvent.keyDown(field("New task"), { key: "Escape" });
    expect(field("New task")).toBeTruthy();
  });
});

describe("TaskForm", () => {
  const initialValues = {
    title: "Paint the ceiling",
    amount: "1 200",
    upTo: "1 500",
    description: "",
  };

  it("opens prefilled with focus on the title and saves", async () => {
    const onSubmit = vi.fn(() => new Promise<never>(() => {}));
    const onCancel = vi.fn();
    render(
      <TaskForm
        initialValues={initialValues}
        validate={noErrors}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("form", { name: "Edit “Paint the ceiling”" })).toBeTruthy();
    expect(document.activeElement).toBe(field("Title"));
    expect(field("Amount").value).toBe("1 200");
    expect(screen.queryByRole("textbox", { name: description })).toBeNull();
    await submitForm("Save");
    expect(onSubmit).toHaveBeenCalledWith(initialValues);
    fireEvent.keyDown(field("Title"), { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeTruthy();
  });

  it("cancels with Escape or Cancel and shows server errors", async () => {
    const onCancel = vi.fn();
    render(
      <TaskForm
        initialValues={initialValues}
        validate={noErrors}
        onSubmit={async () => ({ ok: false, formError: "Could not save the task." })}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(field("Title"), { key: "Escape" });
    fireEvent.keyDown(field("Title"), { key: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    await submitForm("Save");
    expect(screen.getByRole("alert").textContent).toContain("Could not save the task.");
  });

  it("opens with the description shown when the task has one", () => {
    render(
      <TaskForm
        initialValues={{ ...initialValues, description: "Two coats." }}
        validate={noErrors}
        onSubmit={ok}
        onCancel={vi.fn()}
      />,
    );
    expect(field(description).value).toBe("Two coats.");
  });

  it("shows a task's sum instead of the amounts and sends them empty (R12)", async () => {
    const onSubmit = vi.fn(ok);
    const { rerender } = render(
      <TaskForm
        initialValues={initialValues}
        validate={noErrors}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        summedEstimate="800–900 zł"
      />,
    );
    expect(screen.queryByRole("textbox", { name: "Amount" })).toBeNull();
    const sum = document.querySelector('[data-slot="summed-estimate"]');
    expect(sum?.textContent).toContain("Sum of subtasks:800–900 zł");
    expect(sum?.textContent).toContain("Change the amounts on the subtasks.");
    await submitForm("Save");
    expect(onSubmit).toHaveBeenCalledWith({ ...initialValues, amount: "", upTo: "" });
    rerender(
      <TaskForm
        initialValues={initialValues}
        validate={noErrors}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        summedEstimate={null}
      />,
    );
    expect(screen.getByText("no estimate yet")).toBeTruthy();
  });

  it.each([
    ["invalid text", { amount: "abc", upTo: "1 500" }, "Enter an amount."],
    ["a reversed range", { amount: "2 000", upTo: "1 500" }, "Enter a higher amount."],
  ])(
    "leaves hidden amounts holding %s out of validation and saving while it shows the sum",
    async (_, amounts, message) => {
      // Regression: a refetch brought the first subtask while the form was open.
      const amount = (text: string) => Number(text.replaceAll(" ", ""));
      const validate = (current: TaskFormValues) => ({
        amount: Number.isNaN(amount(current.amount)) ? "Enter an amount." : undefined,
        upTo: amount(current.upTo) < amount(current.amount) ? "Enter a higher amount." : undefined,
      });
      const onSubmit = vi.fn(async () => ({ ok: false as const, formError: "Try again." }));
      const props = { initialValues, validate, onSubmit, onCancel: vi.fn() };
      const { rerender } = render(<TaskForm {...props} />);
      fireEvent.change(field("Title"), { target: { value: "Paint the hall" } });
      fireEvent.change(field(/^Amount/), { target: { value: amounts.amount } });
      fireEvent.change(field(/^up to/), { target: { value: amounts.upTo } });

      rerender(<TaskForm {...props} summedEstimate="300–400 zł" />);
      await submitForm("Save");
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Paint the hall",
        amount: "",
        upTo: "",
        description: "",
      });
      expect(screen.queryByText(message)).toBeNull();

      // The subtasks are gone again: the fields come back with what was typed, and Save checks it.
      rerender(<TaskForm {...props} />);
      expect(field(/^Amount/).value).toBe(amounts.amount);
      expect(field(/^up to/).value).toBe(amounts.upTo);
      await submitForm("Save");
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(screen.getByText(message)).toBeTruthy();
    },
  );
});

describe("TaskList", () => {
  it("says it is loading while the skeleton shows", () => {
    renderList({ status: "loading" });
    expect(screen.getByRole("status").textContent).toBe("Loading tasks…");
    expect(screen.getByRole("status").parentElement?.getAttribute("aria-busy")).toBe("true");
  });

  it("keeps the columns before the title empty in the skeleton, so the bars line up (O3)", () => {
    const columns = (props: Partial<TaskListProps>) => {
      cleanup();
      renderList({ status: "loading", ...props });
      const row = screen.getByRole("status").parentElement?.firstElementChild;
      return row?.querySelectorAll('span[aria-hidden="true"]').length;
    };
    // The arrow column (from 640px) is always there; the handle and the checkbox when turned on.
    expect(columns({})).toBe(1);
    expect(columns({ onMove: vi.fn(), onToggleComplete: vi.fn() })).toBe(3);
  });

  it("offers Try again when the list failed to load", () => {
    const { onRetry } = renderList({ status: "error", retrying: false });
    expect(screen.getByText("Could not load your tasks.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("names the empty list and the next step", () => {
    renderList({ tasks: [] });
    expect(screen.getByText("No tasks yet.")).toBeTruthy();
    expect(screen.getByText("Add the first thing you need to do.")).toBeTruthy();
  });

  it("rounds a row's tone at the list's corners, not only the list's border", () => {
    renderList({ tasks: [paint, sealBath] });
    const rows = screen.getByRole("list", { name: "Tasks" }).children;
    const tones = (row: Element | null) =>
      [row, row?.firstElementChild, row?.firstElementChild?.firstElementChild].map(
        (element) => element?.className ?? "",
      );
    for (const row of [rows.item(0), rows.item(rows.length - 1)]) {
      const [item, collapsible, line] = tones(row);
      expect(item).toContain("first:rounded-t-surface");
      expect(item).toContain("last:rounded-b-surface");
      for (const tone of [collapsible, line]) {
        expect(tone).toContain("group-first/row:rounded-t-surface");
        expect(tone).toContain("group-last/row:rounded-b-surface");
      }
    }
    fireEvent.click(screen.getByRole("button", { name: "Paint the ceiling" }));
    const subtask = within(screen.getByRole("list", { name: /^Subtasks/ }))
      .getAllByRole("listitem")
      .at(-1)!;
    expect(subtask.className).toContain("group/subtask");
    expect(subtask.firstElementChild?.firstElementChild?.className).toContain(
      "group-last/row:group-last/subtask:rounded-br-surface",
    );
  });

  it("shows a collapsed task and opens its details, subtasks and Add subtask", () => {
    renderList({ tasks: [paint, sealBath] });
    const list = screen.getByRole("list", { name: "Tasks" });
    // The task shows its subtasks' sum and how many of them have none (R12, R13).
    expect(within(list).getByText("300–400 zł")).toBeTruthy();
    expect(within(list).getByText("2 subtasks")).toBeTruthy();
    expect(within(list).getByText("1 subtask without an estimate")).toBeTruthy();
    expect(within(list).getByText("No estimate")).toBeTruthy();
    expect(screen.queryByText("Two coats, white matt.")).toBeNull();
    // The title is the one disclosure control (decision J1).
    const title = screen.getByRole("button", { name: "Paint the ceiling" });
    expect(title.dataset.slot).toBe("task-title");
    fireEvent.click(title);
    expect(title.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Two coats, white matt.")).toBeTruthy();
    const subtasks = screen.getByRole("list", { name: "Subtasks of “Paint the ceiling”" });
    expect(within(subtasks).getAllByRole("listitem")).toHaveLength(2);
    // A subtask gets an arrow only when it has a description to show.
    expect(within(subtasks).getByRole("button", { name: "Plaster the cracks" })).toBeTruthy();
    expect(within(subtasks).queryByRole("button", { name: "Seal the bath" })).toBeNull();
    fireEvent.click(within(subtasks).getByRole("button", { name: "Plaster the cracks" }));
    expect(screen.getByText("Above the window.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add subtask" })).toBeTruthy();
  });

  it("captions the row menu button with its own name on focus (decision N4)", async () => {
    renderList({ tasks: [sealBath] });
    const more = screen.getByRole("button", { name: "More actions for “Seal the bath”" });
    await act(async () => {
      more.focus();
    });
    expect(document.querySelector('[data-slot="tooltip"]')?.textContent).toBe(
      "More actions for “Seal the bath”",
    );
    expect(more.hasAttribute("aria-describedby")).toBe(false);
  });

  it("toggles from the arrow too, which only repeats the title for the pointer", () => {
    renderList({ tasks: [paint] });
    const title = screen.getByRole("button", { name: "Paint the ceiling" });
    const arrow = title
      .closest("li")
      ?.querySelector<HTMLElement>("[aria-hidden='true'][data-state]");
    expect(arrow?.tabIndex).toBe(-1);
    fireEvent.click(arrow as HTMLElement);
    expect(title.getAttribute("aria-expanded")).toBe("true");
    expect(arrow?.dataset.state).toBe("open");
    fireEvent.click(arrow as HTMLElement);
    expect(title.getAttribute("aria-expanded")).toBe("false");
  });

  it("dims a pending row and disables its actions", () => {
    renderList({ tasks: [{ ...paint, pending: true }] });
    expect(screen.getByText("Saving…")).toBeTruthy();
    expect(screen.getByText("Paint the ceiling").className).toContain("text-muted");
    fireEvent.click(screen.getByRole("button", { name: "Paint the ceiling" }));
    expect(
      (screen.getByRole("button", { name: "Add subtask" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    openMenu("Paint the ceiling");
    for (const item of screen.getAllByRole("menuitem")) {
      expect(item.getAttribute("aria-disabled")).toBe("true");
    }
  });

  it("shows why a change failed in the row", () => {
    renderList({ tasks: [{ ...sealBath, error: "Could not save “Seal the bath”. Try again." }] });
    expect(screen.getByRole("alert").textContent).toBe(
      "Could not save “Seal the bath”. Try again.",
    );
  });

  it("scrolls a new row into view and highlights it", () => {
    reducedMotion = false;
    renderList({ tasks: [sealBath], highlightId: "seal" });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    expect(screen.getByText("Seal the bath").closest(".row-highlight")).toBeTruthy();
    cleanup();
    reducedMotion = true;
    renderList({ tasks: [sealBath], highlightId: "seal" });
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: "nearest", behavior: "auto" });
    reducedMotion = false;
  });

  it("edits in place and returns focus to the row's actions", async () => {
    const onEdit = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, fieldErrors: { title: "Enter a title" } })
      .mockResolvedValueOnce({ ok: true });
    renderList({ tasks: [sealBath], onEdit });
    openMenu("Seal the bath");
    await choose("Edit");
    fireEvent.change(field("Title"), { target: { value: "Seal the bath and sink" } });
    await submitForm("Save");
    expect(screen.getByText("Enter a title")).toBeTruthy();
    await submitForm("Save");
    expect(onEdit).toHaveBeenLastCalledWith("seal", values("Seal the bath and sink"), sealBath);
    expect(screen.queryByRole("form")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "More actions for “Seal the bath”" }),
    );
  });

  it("hands onEdit the task as the form opened with it, even after the task changed", async () => {
    const onEdit = vi.fn(ok);
    const props = {
      onRetry: vi.fn(),
      onDelete: vi.fn(async () => true),
      validate: noErrors,
      onEdit,
    };
    const { rerender } = render(<TaskList status="ready" tasks={[paint]} {...props} />);
    openMenu("Paint the ceiling");
    await choose("Edit");
    expect(document.querySelector('[data-slot="summed-estimate"]')).not.toBeNull();
    // A refetch: the subtasks are gone and the title changed elsewhere.
    const refetched = { ...paint, title: "Paint the hall", subtasks: [], estimate: "900 zł" };
    rerender(<TaskList status="ready" tasks={[refetched]} {...props} />);
    // The form keeps the values it opened with; the amount fields now show them.
    expect(field("Title").value).toBe("Paint the ceiling");
    expect(field(/^Amount/).value).toBe("1 200");
    await submitForm("Save");
    expect(onEdit).toHaveBeenLastCalledWith(
      "paint",
      {
        title: "Paint the ceiling",
        amount: "1 200",
        upTo: "1 500",
        description: "Two coats, white matt.",
      },
      paint,
    );
  });

  it("cancels an edit back to the row", async () => {
    renderList({ tasks: [paint] });
    fireEvent.click(screen.getByRole("button", { name: "Paint the ceiling" }));
    openMenu("Paint the ceiling");
    await choose("Edit");
    expect(field(description).value).toBe("Two coats, white matt.");
    expect(screen.getAllByText("Two coats, white matt.")).toHaveLength(1);
    // A task with subtasks shows their sum, not its own amounts (R12).
    expect(screen.queryByRole("textbox", { name: "Amount" })).toBeNull();
    expect(document.querySelector('[data-slot="summed-estimate"]')?.textContent).toContain(
      "300–400 zł",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "More actions for “Paint the ceiling”" }),
    );
  });

  it("adds a subtask from the menu and closes back to Add subtask", async () => {
    const { onAddSubtask } = renderList({ tasks: [sealBath] });
    openMenu("Seal the bath");
    await choose("Add subtask");
    expect(document.activeElement).toBe(field("New subtask"));
    fireEvent.change(field("New subtask"), { target: { value: "Buy silicone" } });
    await submitForm("Add");
    expect(onAddSubtask).toHaveBeenCalledWith("seal", values("Buy silicone"));
    expect(screen.queryByRole("textbox", { name: "New subtask" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add subtask" }));
  });

  it("keeps the subtask form open when the add fails, until Cancel", async () => {
    renderList({
      tasks: [sealBath],
      onAddSubtask: vi.fn(async () => ({ ok: false as const, formError: "Could not add." })),
    });
    fireEvent.click(screen.getByRole("button", { name: "Seal the bath" }));
    fireEvent.click(screen.getByRole("button", { name: "Add subtask" }));
    fireEvent.change(field("New subtask"), { target: { value: "Buy silicone" } });
    await submitForm("Add");
    expect(field("New subtask").value).toBe("Buy silicone");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const addSubtask = screen.getByRole("button", { name: "Add subtask" });
    expect(document.activeElement).toBe(addSubtask);
    fireEvent.click(addSubtask);
    expect(field("New subtask")).toBeTruthy();
  });

  it("offers no subtasks without onAddSubtask, and opens only rows with something to show", () => {
    renderList({
      tasks: [sealBath, { ...sealBath, id: "tiles", title: "Tile", description: "White." }, paint],
      onAddSubtask: undefined,
    });
    expect(screen.queryByRole("button", { name: "Seal the bath" })).toBeNull();
    openMenu("Seal the bath");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Add subtask" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Tile" }));
    expect(screen.getByText("White.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Paint the ceiling" }));
    expect(screen.getByRole("list", { name: "Subtasks of “Paint the ceiling”" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add subtask" })).toBeNull();
  });

  it("renders a TaskRow on its own as a task with onAddSubtask and as a subtask without", () => {
    const row = (onAddSubtask?: typeof ok) => (
      <ul>
        <TaskRow
          task={sealBath}
          validate={noErrors}
          onEdit={ok}
          onAddSubtask={onAddSubtask}
          onRequestDelete={vi.fn()}
        />
      </ul>
    );
    const { rerender } = render(row(ok));
    openMenu("Seal the bath");
    expect(screen.getByRole("menuitem", { name: "Add subtask" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    rerender(row());
    openMenu("Seal the bath");
    expect(screen.queryByRole("menuitem", { name: "Add subtask" })).toBeNull();
    expect(screen.getByRole("listitem").className).toContain("group/subtask");
  });

  it("returns focus to the menu button when the menu just closes", async () => {
    renderList({ tasks: [sealBath] });
    openMenu("Seal the bath");
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "More actions for “Seal the bath”" }),
      ),
    );
  });

  it("asks before deleting and returns focus to the row on cancel", async () => {
    const { onDelete } = renderList({ tasks: [paint] });
    openMenu("Paint the ceiling");
    await choose("Delete");
    expect(
      screen.getByRole("alertdialog", { name: "Delete “Paint the ceiling” and its 2 subtasks?" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "More actions for “Paint the ceiling”" }),
      ),
    );
  });

  it("deletes after confirming and puts focus on the list", async () => {
    const { onDelete } = renderList({ tasks: [sealBath] });
    openMenu("Seal the bath");
    await choose("Delete");
    await submitForm("Delete task");
    expect(onDelete).toHaveBeenCalledWith("seal");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("list", { name: "Tasks" })),
    );
  });

  it("puts focus on the empty state after the last task was deleted (O4)", async () => {
    function App() {
      const [tasks, setTasks] = useState([sealBath]);
      return (
        <TaskList
          status="ready"
          tasks={tasks}
          validate={noErrors}
          onRetry={vi.fn()}
          onEdit={vi.fn(ok)}
          onAddSubtask={vi.fn(ok)}
          onDelete={async () => {
            setTasks([]);
            return true;
          }}
        />
      );
    }
    render(<App />);
    openMenu("Seal the bath");
    await choose("Delete");
    await submitForm("Delete task");
    expect(screen.getByText("No tasks yet.")).toBeTruthy();
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByText("No tasks yet.").closest('[data-slot="surface"]'),
      ),
    );
  });
});

describe("TaskList ordering, markers and places", () => {
  const rods: TaskItem = { ...sealBath, id: "rods", title: "Hang the curtain rods" };
  const bathroom: Place = { id: "bathroom", name: "Bathroom", color: 1 };
  const kitchen: Place = { id: "kitchen", name: "Kitchen", color: 2 };
  const placeOptions = (overrides: Partial<PlaceOptions> = {}): PlaceOptions => ({
    status: "ready",
    onRetry: vi.fn(),
    all: [bathroom, kitchen],
    atLimit: false,
    validateName: () => undefined,
    onToggle: vi.fn(),
    onCreate: vi.fn(ok),
    onUpdate: vi.fn(ok),
    onDelete: vi.fn(async () => true),
    ...overrides,
  });
  const menuItem = (name: string) => screen.getByRole("menuitem", { name });

  it("gives each movable row a handle, but not a pending one", () => {
    renderList({ tasks: [paint, rods, { ...sealBath, pending: true }], onMove: vi.fn() });
    const handle = screen.getByRole("button", { name: "Move “Paint the ceiling”" });
    // Hidden below 640px by the row's wrapper around the handle and its tooltip (G2, N4).
    const wrapper = handle.closest("[data-slot=tooltip-trigger]")?.parentElement;
    expect(wrapper?.className).toContain("hidden");
    expect(wrapper?.className).toContain("wide:inline-flex");
    expect(handle.getAttribute("aria-roledescription")).toBe("movable row");
    expect(
      (screen.getByRole("button", { name: "Move “Seal the bath”" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("has no handle or Move items without onMove", () => {
    renderList({ tasks: [paint] });
    expect(screen.queryByRole("button", { name: "Move “Paint the ceiling”" })).toBeNull();
    openMenu("Paint the ceiling");
    expect(screen.queryByRole("menuitem", { name: "Move up" })).toBeNull();
    expect(screen.queryByRole("menuitemcheckbox")).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Places…" })).toBeNull();
  });

  it("moves a task one step from the menu, never past an end", async () => {
    const onMove = vi.fn();
    renderList({ tasks: [paint, rods, { ...sealBath, pending: true }], onMove });
    openMenu("Paint the ceiling");
    expect(menuItem("Move up").getAttribute("aria-disabled")).toBe("true");
    await choose("Move down");
    expect(onMove).toHaveBeenCalledWith("paint", { afterId: "rods", beforeId: null });
    openMenu("Hang the curtain rods");
    // The pending row below does not count: its id is temporary.
    expect(menuItem("Move down").getAttribute("aria-disabled")).toBe("true");
    await choose("Move up");
    expect(onMove).toHaveBeenLastCalledWith("rods", { afterId: null, beforeId: "paint" });
  });

  it("moves a subtask only among the subtasks of its task", async () => {
    const onMove = vi.fn();
    renderList({ tasks: [paint], onMove });
    fireEvent.click(screen.getByRole("button", { name: "Paint the ceiling" }));
    const subtasks = screen.getByRole("list", { name: "Subtasks of “Paint the ceiling”" });
    expect(
      within(subtasks).getByRole("button", { name: "Move “Plaster the cracks”" }),
    ).toBeTruthy();
    openMenu("Plaster the cracks");
    await choose("Move down");
    expect(onMove).toHaveBeenCalledWith("plaster", { afterId: "seal", beforeId: null });
  });

  it("keeps a task expanded when moves are turned off and on, as the app does while an add saves", () => {
    const props = { status: "ready" as const, tasks: [paint], validate: noErrors };
    const handlers = {
      onRetry: vi.fn(),
      onEdit: vi.fn(ok),
      onAddSubtask: vi.fn(ok),
      onDelete: vi.fn(),
    };
    const { rerender } = render(<TaskList {...props} {...handlers} onMove={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Paint the ceiling" }));
    const subtasks = () => screen.queryByRole("list", { name: "Subtasks of “Paint the ceiling”" });
    expect(subtasks()).not.toBeNull();

    rerender(<TaskList {...props} {...handlers} />);
    expect(subtasks()).not.toBeNull();
    expect(screen.queryByRole("button", { name: /^Move “/ })).toBeNull();

    rerender(<TaskList {...props} {...handlers} onMove={vi.fn()} />);
    expect(subtasks()).not.toBeNull();
    expect(screen.getAllByRole("button", { name: /^Move “/ })).toHaveLength(3);
  });

  it("lifts the row while it is picked up with the keyboard", async () => {
    renderList({ tasks: [rods, sealBath], onMove: vi.fn() });
    const handle = screen.getByRole("button", { name: "Move “Hang the curtain rods”" });
    handle.focus();
    await act(async () => {
      fireEvent.keyDown(handle, { key: " ", code: "Space" });
    });
    const row = handle.closest("li")!;
    expect(row.dataset.dragging).toBe("true");
    expect(row.className).toContain("bg-raised");
    expect(row.style.zIndex).toBe("1");
    await act(async () => {
      fireEvent.keyDown(handle, { key: "Escape", code: "Escape" });
    });
    expect(row.dataset.dragging).toBeUndefined();
  });

  it("cancels a keyboard move when the pointer is pressed anywhere, so the row is not left lifted", async () => {
    const onMove = vi.fn();
    renderList({ tasks: [rods, sealBath], onMove });
    const handle = screen.getByRole("button", { name: "Move “Hang the curtain rods”" });
    handle.focus();
    await act(async () => {
      fireEvent.keyDown(handle, { key: " ", code: "Space" });
    });
    const row = handle.closest("li")!;
    expect(row.dataset.dragging).toBe("true");

    await act(async () => {
      fireEvent.pointerDown(document.body);
    });

    expect(row.dataset.dragging).toBeUndefined();
    expect(row.style.zIndex).toBe("");
    // The cancelled move's keys no longer reach it: Space does not drop it somewhere.
    await act(async () => {
      fireEvent.keyDown(handle, { key: " ", code: "Space" });
      fireEvent.keyDown(handle, { key: " ", code: "Space" });
    });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("keeps an error under the title, past the handle column", () => {
    renderList({
      tasks: [{ ...paint, error: "Could not move “Paint the ceiling”." }],
      onMove: vi.fn(),
    });
    // One spacer for the handle column (shown from 640px), one for the arrow.
    const underTitle = screen.getByRole("alert").parentElement!.parentElement!;
    expect(underTitle.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it("shows places and markers in the meta line", () => {
    renderList({ tasks: [{ ...sealBath, important: true, urgent: true, places: [kitchen] }] });
    const meta = screen.getByText("Kitchen").closest("div")!;
    expect(meta.textContent).toBe("KitchenImportantUrgent");
    cleanup();
    renderList({ tasks: [{ ...sealBath, urgent: true }] });
    expect(screen.getByText("Urgent")).toBeTruthy();
    cleanup();
    renderList({ tasks: [{ ...sealBath, places: [] }] });
    expect(screen.getByText("Seal the bath").nextElementSibling?.tagName).not.toBe("DIV");
  });

  it("sets and clears markers from the menu", async () => {
    const onToggleMarker = vi.fn();
    renderList({ tasks: [{ ...sealBath, important: true }], onToggleMarker });
    openMenu("Seal the bath");
    const important = screen.getByRole("menuitemcheckbox", { name: "Important" });
    expect(important.getAttribute("aria-checked")).toBe("true");
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Urgent" }).getAttribute("aria-checked"),
    ).toBe("false");
    await act(async () => {
      fireEvent.click(important);
    });
    expect(onToggleMarker).toHaveBeenCalledWith("seal", "important", false);
    openMenu("Seal the bath");
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Urgent" }));
    });
    expect(onToggleMarker).toHaveBeenLastCalledWith("seal", "urgent", true);
  });

  it("chooses places in a popover from the menu, then returns to the menu button", async () => {
    const places = placeOptions();
    renderList({ tasks: [{ ...sealBath, places: [bathroom] }], places });
    openMenu("Seal the bath");
    await choose("Places…");
    const panel = screen.getByRole("dialog", { name: "Places for “Seal the bath”" });
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Kitchen" }));
    expect(places.onToggle).toHaveBeenCalledWith("seal", "kitchen", true);
    fireEvent.change(within(panel).getByRole("textbox", { name: "New place" }), {
      target: { value: "Hall" },
    });
    await act(async () => {
      fireEvent.click(within(panel).getByRole("button", { name: "Create" }));
    });
    expect(places.onCreate).toHaveBeenCalledWith("seal", { name: "Hall" });
    fireEvent.keyDown(panel, { key: "Escape" });
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "More actions for “Seal the bath”" }),
      ),
    );
  });

  it("names the places popover in the given language, for a task without places", async () => {
    renderList({
      tasks: [sealBath],
      places: placeOptions({ text: { placesFor: (title) => `Miejsca „${title}”` } }),
    });
    openMenu("Seal the bath");
    await choose("Places…");
    const panel = screen.getByRole("dialog", { name: "Miejsca „Seal the bath”" });
    expect(
      within(panel).getByRole("checkbox", { name: "Bathroom" }).getAttribute("aria-checked"),
    ).toBe("false");
  });
});

describe("TaskList completion", () => {
  const done = (task: TaskItem): TaskItem => ({ ...task, completed: true });
  const rods: TaskItem = { ...sealBath, id: "rods", title: "Hang the curtain rods" };
  const checkbox = (title: string) =>
    screen.getByRole("checkbox", { name: `Complete “${title}”` }) as HTMLButtonElement;

  it("completes and reopens with the checkbox, keeping focus on it", () => {
    const onToggleComplete = vi.fn();
    const { rerender } = render(
      <TaskList
        status="ready"
        tasks={[sealBath, rods]}
        validate={noErrors}
        onRetry={vi.fn()}
        onEdit={ok}
        onAddSubtask={ok}
        onDelete={vi.fn(async () => true)}
        onToggleComplete={onToggleComplete}
      />,
    );
    fireEvent.click(checkbox("Seal the bath"));
    expect(onToggleComplete).toHaveBeenCalledWith("seal", true);
    // The app puts the completed task last; its checkbox keeps focus.
    rerender(
      <TaskList
        status="ready"
        tasks={[rods, done(sealBath)]}
        validate={noErrors}
        onRetry={vi.fn()}
        onEdit={ok}
        onAddSubtask={ok}
        onDelete={vi.fn(async () => true)}
        onToggleComplete={onToggleComplete}
      />,
    );
    expect(document.activeElement).toBe(checkbox("Seal the bath"));
    expect(checkbox("Seal the bath").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(checkbox("Seal the bath"));
    expect(onToggleComplete).toHaveBeenLastCalledWith("seal", false);
  });

  it("mutes and strikes through a completed row and takes away its moves", () => {
    const onMove = vi.fn();
    renderList({
      tasks: [rods, done({ ...paint, subtasks: [done(paint.subtasks![0]!), sealBath] })],
      onMove,
      onToggleComplete: vi.fn(),
    });
    const title = screen.getByText("Paint the ceiling");
    expect(title.className).toContain("line-through");
    expect(screen.getByText("300–400 zł").className).toContain("text-muted");
    expect(screen.queryByRole("button", { name: "Move “Paint the ceiling”" })).toBeNull();
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getByText("1 of 2 subtasks completed").className).toBe("sr-only");
    openMenu("Paint the ceiling");
    expect(screen.queryByRole("menuitem", { name: "Add subtask" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Move up" })).toBeNull();
    openMenu("Hang the curtain rods");
    // The completed task below does not count.
    expect(menuItemDisabled("Move down")).toBe("true");
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Paint the ceiling" }));
    expect(screen.queryByRole("button", { name: "Add subtask" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Move “Plaster the cracks”" })).toBeNull();
    expect(screen.getByRole("button", { name: "Move “Seal the bath”" })).toBeTruthy();
  });

  it("shows a note about the task's sum in its row, read out as a status", () => {
    const note = "The estimate of “Paint the ceiling” is now the sum of its subtasks.";
    renderList({ tasks: [{ ...paint, notice: note }] });
    const status = screen.getAllByRole("status").find((region) => region.textContent === note);
    expect(status?.closest("li")?.dataset.moveId).toBe("paint");
    fireEvent.click(screen.getByRole("button", { name: "Paint the ceiling" }));
    // Subtasks get no note region of their own.
    const subtasks = screen.getByRole("list", { name: "Subtasks of “Paint the ceiling”" });
    expect(within(subtasks).queryAllByRole("status")).toHaveLength(0);
  });

  it("hides the count of subtasks without an estimate on a pending row", () => {
    renderList({ tasks: [{ ...paint, pending: true }] });
    expect(screen.queryByText("1 subtask without an estimate")).toBeNull();
  });

  it("counts a pending subtask only once the server has confirmed it", () => {
    const pendingSubtask = { ...sealBath, id: "temp-1", title: "Prime", pending: true };
    const rods: TaskItem = { ...sealBath, id: "rods", title: "Fit the rods", estimate: "450 zł" };
    renderList({ tasks: [{ ...rods, amount: "450", subtasks: [pendingSubtask] }] });
    // No meta line yet: the task has no confirmed subtask, so no count.
    expect(screen.queryByText("1 subtask")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fit the rods" }));
    const subtasks = screen.getByRole("list", { name: "Subtasks of “Fit the rods”" });
    expect(within(subtasks).getByText("Saving…")).toBeTruthy();
    // Its edit form still shows the amounts, not a sum.
    openMenu("Fit the rods");
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect((field(/^Amount/) as HTMLInputElement).value).toBe("450");
    expect(document.querySelector('[data-slot="summed-estimate"]')).toBeNull();
    cleanup();

    renderList({ tasks: [{ ...paint, subtasks: [...paint.subtasks!, pendingSubtask] }] });
    expect(screen.getByText("2 subtasks")).toBeTruthy();
    cleanup();

    renderList({
      tasks: [{ ...paint, subtasks: [...paint.subtasks!, pendingSubtask] }],
      onToggleComplete: vi.fn(),
    });
    expect(screen.getByText("0 of 2 subtasks completed")).toBeTruthy();
  });

  it("keeps the subtask count without completion", () => {
    renderList({ tasks: [paint] });
    expect(screen.getByText("2 subtasks")).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("asks before completing a task with open subtasks", async () => {
    const onToggleComplete = vi.fn();
    renderList({ tasks: [paint], onToggleComplete });
    fireEvent.click(checkbox("Paint the ceiling"));
    expect(onToggleComplete).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog", {
      name: "Complete “Paint the ceiling” and its 2 open subtasks?",
    });
    expect(dialog.textContent).toContain("Reopening the task later does not reopen its subtasks.");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onToggleComplete).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(document.activeElement).toBe(checkbox("Paint the ceiling")));
    fireEvent.click(checkbox("Paint the ceiling"));
    fireEvent.click(screen.getByRole("button", { name: "Complete task" }));
    expect(onToggleComplete).toHaveBeenCalledWith("paint", true);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(checkbox("Paint the ceiling")));
  });

  it("completes a task whose subtasks are all done without asking, and subtasks alone", () => {
    const onToggleComplete = vi.fn();
    renderList({
      tasks: [{ ...paint, subtasks: [done(paint.subtasks![0]!)] }],
      onToggleComplete,
    });
    fireEvent.click(checkbox("Paint the ceiling"));
    expect(onToggleComplete).toHaveBeenCalledWith("paint", true);
    fireEvent.click(screen.getByRole("button", { name: "Paint the ceiling" }));
    fireEvent.click(checkbox("Plaster the cracks"));
    expect(onToggleComplete).toHaveBeenLastCalledWith("plaster", false);
  });

  it("disables the checkbox of a pending row", () => {
    renderList({ tasks: [{ ...sealBath, pending: true }], onToggleComplete: vi.fn() });
    expect(checkbox("Seal the bath").disabled).toBe(true);
  });
});

describe("Completion parts", () => {
  it("SubtaskProgress reads as words", () => {
    const { rerender } = render(<SubtaskProgress done={0} total={1} />);
    expect(screen.getByText("0/1").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("0 of 1 subtask completed")).toBeTruthy();
    rerender(<SubtaskProgress done={2} total={3} />);
    expect(screen.getByText("2 of 3 subtasks completed")).toBeTruthy();
  });

  it("CompleteTaskDialog renders nothing without a task and counts one subtask", () => {
    const { container } = render(
      <CompleteTaskDialog task={null} openSubtasks={0} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container.textContent).toBe("");
    expect(defaultTaskText.completeTitle("Paint", 1)).toBe(
      "Complete “Paint” and its open subtask?",
    );
    expect(defaultTaskText.subtaskProgressLabel(1, 3)).toBe("1 of 3 subtasks completed");
  });
});

describe("DeleteTaskDialog", () => {
  it("keeps the dialog open with an error when the delete fails", async () => {
    const onClose = vi.fn();
    const onConfirm = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(new Promise(() => {}));
    render(<DeleteTaskDialog task={sealBath} onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByRole("alertdialog", { name: "Delete “Seal the bath”?" })).toBeTruthy();
    await submitForm("Delete task");
    expect(screen.getByRole("alert").textContent).toBe("Could not delete the task. Try again.");
    await submitForm("Delete task");
    expect(screen.getByRole("alert")).toBeTruthy();
    await submitForm("Delete task");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders nothing without a task", () => {
    render(<DeleteTaskDialog task={null} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
