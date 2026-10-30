import type { TaskView } from "@taskly/core";
import type { TaskFormValues } from "@taskly/ui";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../lib/api-client";
import {
  hasTask,
  isNotFound,
  subtaskAdded,
  subtaskDeleted,
  submitError,
  toCreateInput,
  toTaskItem,
  toUpdateInput,
  validateTaskForm,
} from "./task-items";

const NBSP = "\u00a0";
const pln = (text: string) => text.replaceAll("_", NBSP);

function view(title: string, extra: Partial<TaskView> = {}): TaskView {
  return {
    id: crypto.randomUUID(),
    title,
    description: null,
    estimate: null,
    unestimatedSubtasks: 0,
    subtasks: [],
    ...extra,
  };
}

const form = (values: Partial<TaskFormValues> = {}): TaskFormValues => ({
  title: "Seal the bath",
  amount: "",
  upTo: "",
  description: "",
  ...values,
});

describe("toTaskItem", () => {
  it("formats a range and fills both amount fields so they read back to the same grosze", () => {
    const task = view("Tile", { estimate: { minGrosze: 150_050, maxGrosze: 200_000 } });
    expect(toTaskItem(task)).toEqual({
      id: task.id,
      title: "Tile",
      description: null,
      estimate: pln("1_500,50–2_000_zł"),
      amount: pln("1_500,50"),
      upTo: pln("2_000"),
      unestimatedSubtasks: 0,
      subtasks: [],
      pending: false,
    });
    const item = toTaskItem(task);
    expect(toCreateInput(form({ amount: item.amount, upTo: item.upTo }))).toMatchObject({
      estimate: { minGrosze: 150_050, maxGrosze: 200_000 },
    });
  });

  it("puts an exact price in Amount only, and shows no estimate as null with empty fields", () => {
    const exact = toTaskItem(view("Seal", { estimate: { minGrosze: 1_250, maxGrosze: 1_250 } }));
    expect(exact).toMatchObject({ estimate: pln("12,50_zł"), amount: "12,50", upTo: "" });
    const none = toTaskItem(view("Seal", { description: "Silicone" }));
    expect(none).toMatchObject({ estimate: null, amount: "", upTo: "", description: "Silicone" });
  });

  it("marks a temporary row pending and maps subtasks with their own estimate", () => {
    const subtask = { id: crypto.randomUUID(), title: "Buy", description: null, estimate: null };
    const item = toTaskItem({
      ...view("Paint", { unestimatedSubtasks: 1, subtasks: [subtask] }),
      id: "pending-7",
    });
    expect(item.pending).toBe(true);
    expect(item.unestimatedSubtasks).toBe(1);
    expect(item.subtasks).toEqual([
      {
        id: subtask.id,
        title: "Buy",
        description: null,
        estimate: null,
        amount: "",
        upTo: "",
        pending: false,
      },
    ]);
  });

  it("leaves the amounts of a task with subtasks empty: its form shows their sum", () => {
    const priced = {
      id: crypto.randomUUID(),
      title: "Prime",
      description: null,
      estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
    };
    // A sum above the typed-amount cap must not reach the (hidden) amount fields.
    const sum = { minGrosze: 3_000_000_000, maxGrosze: 3_000_000_000 };
    const item = toTaskItem(view("Paint", { estimate: sum, subtasks: [priced] }));
    expect(item).toMatchObject({ estimate: pln("30_000_000_zł"), amount: "", upTo: "" });
    expect(item.subtasks?.[0]).toMatchObject({ amount: "300", upTo: "400", pending: false });
    expect(validateTaskForm(form({ amount: item.amount, upTo: item.upTo }))).toEqual({});
  });

  it("keeps a task's own amounts while its only subtask is pending, and marks that one", () => {
    const temporary = { id: "pending-3", title: "Prime", description: null, estimate: null };
    const own = { minGrosze: 45_000, maxGrosze: 45_000 };
    const item = toTaskItem(view("Rods", { estimate: own, subtasks: [temporary] }));
    expect(item).toMatchObject({ estimate: pln("450_zł"), amount: "450", upTo: "" });
    expect(item.subtasks?.[0]?.pending).toBe(true);
  });
});

describe("validateTaskForm and toCreateInput", () => {
  it.each([
    ["only Amount", { amount: "500" }, { minGrosze: 50_000, maxGrosze: 50_000 }],
    ["only up to", { upTo: "500" }, { minGrosze: 50_000, maxGrosze: 50_000 }],
    ["both", { amount: "1 500", upTo: "2 000" }, { minGrosze: 150_000, maxGrosze: 200_000 }],
    ["neither", {}, null],
  ])("turns %s into the estimate", (_label, amounts, estimate) => {
    expect(validateTaskForm(form(amounts))).toEqual({});
    expect(toCreateInput(form({ ...amounts, description: "  " }))).toEqual({
      title: "Seal the bath",
      description: null,
      estimate,
      parentId: null,
    });
  });

  it("adds the parent's id for a subtask", () => {
    const parentId = crypto.randomUUID();
    expect(toCreateInput(form({ amount: "300" }), parentId)).toEqual({
      title: "Seal the bath",
      description: null,
      estimate: { minGrosze: 30_000, maxGrosze: 30_000 },
      parentId,
    });
  });

  it("puts Amount above up to on up to, and a bad text on its own field", () => {
    expect(validateTaskForm(form({ amount: "2 000", upTo: "1 500" }))).toEqual({
      upTo: "“Up to” must not be less than the amount.",
    });
    expect(validateTaskForm(form({ amount: "1e3" }))).toEqual({
      amount: "Enter an amount like 1 500,50",
    });
  });

  it("checks the title and the description with the shared schema", () => {
    expect(validateTaskForm(form({ title: " ", amount: "x" }))).toEqual({
      title: "Enter a title.",
      amount: "Enter an amount like 1 500,50",
    });
    expect(validateTaskForm(form({ title: "", description: "d".repeat(2001) }))).toEqual({
      title: "Enter a title.",
      description: "Enter at most 2 000 characters.",
    });
  });
});

describe("toUpdateInput", () => {
  const exact = view("Seal the bath", {
    description: "Silicone",
    estimate: { minGrosze: 50_000, maxGrosze: 50_000 },
  });
  const tasks = [exact];
  /** The edit form as it opens: prefilled from the item (`toTaskItem`). */
  const opened = toTaskItem(exact);
  const prefilled = form({ amount: "500", description: "Silicone" });

  it("sends only the fields changed from what the form opened with", () => {
    expect(
      toUpdateInput(tasks, exact.id, { ...prefilled, title: "Seal the shower" }, opened),
    ).toEqual({ title: "Seal the shower" });
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, description: "" }, opened)).toEqual({
      description: null,
    });
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, upTo: "600" }, opened)).toEqual({
      estimate: { minGrosze: 50_000, maxGrosze: 60_000 },
    });
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, amount: "400" }, opened)).toEqual({
      estimate: { minGrosze: 40_000, maxGrosze: 40_000 },
    });
    // The same amount typed differently is no change.
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, amount: "500,00" }, opened)).toBeNull();
  });

  it("removes the estimate when both amounts are cleared, and adds one to a task without", () => {
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, amount: "" }, opened)).toEqual({
      estimate: null,
    });
    const none = view("Paint");
    expect(
      toUpdateInput([none], none.id, form({ title: "Paint", amount: "10" }), toTaskItem(none)),
    ).toEqual({ estimate: { minGrosze: 1_000, maxGrosze: 1_000 } });
  });

  it("sends nothing when nothing changed, also for an edited subtask", () => {
    expect(
      toUpdateInput(tasks, exact.id, { ...prefilled, title: " Seal the bath " }, opened),
    ).toEqual(null);
    const subtask = { id: crypto.randomUUID(), title: "Buy", description: null, estimate: null };
    const parent = view("Paint", { subtasks: [subtask] });
    const subtaskItem = toTaskItem(parent).subtasks![0]!;
    expect(toUpdateInput([parent], subtask.id, form({ title: "Buy" }), subtaskItem)).toEqual(null);
    expect(
      toUpdateInput([parent], subtask.id, form({ title: "Buy", upTo: "5" }), subtaskItem),
    ).toEqual({ estimate: { minGrosze: 500, maxGrosze: 500 } });
  });

  it("compares with what the form opened with, not with a task refetched meanwhile", () => {
    // Another tab renamed the task and changed its estimate while this form was open.
    const refetched = { ...exact, title: "Seal the tub", estimate: { minGrosze: 1, maxGrosze: 1 } };
    expect(toUpdateInput([refetched], exact.id, prefilled, opened)).toBeNull();
    expect(
      toUpdateInput([refetched], exact.id, { ...prefilled, title: "Seal the shower" }, opened),
    ).toEqual({ title: "Seal the shower" });
  });

  it("judges a form opened on a task with subtasks by its empty prefill once the subtasks are gone", () => {
    const subtask = { id: crypto.randomUUID(), title: "Prime", description: null, estimate: null };
    const parent = view("Paint", {
      estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
      subtasks: [subtask],
    });
    const openedWithSum = toTaskItem(parent);
    // The last subtask was deleted in another tab and the list refetched: the task shows its own
    // figure again, and the amount fields appear, empty as they were prefilled.
    const own = { ...parent, estimate: { minGrosze: 90_000, maxGrosze: 90_000 }, subtasks: [] };
    expect(
      toUpdateInput([own], parent.id, form({ title: "Paint the hall" }), openedWithSum),
    ).toEqual({ title: "Paint the hall" });
    // Amounts typed into the fields that appeared are the user's change.
    expect(
      toUpdateInput([own], parent.id, form({ title: "Paint", amount: "700" }), openedWithSum),
    ).toEqual({ estimate: { minGrosze: 70_000, maxGrosze: 70_000 } });
  });

  it("never sends an estimate for a task that has subtasks now (after a 409 and the refetch)", () => {
    const subtask = { id: crypto.randomUUID(), title: "Prime", description: null, estimate: null };
    const bare = view("Paint", { estimate: { minGrosze: 30_000, maxGrosze: 40_000 } });
    const openedBare = toTaskItem(bare);
    const now = { ...bare, subtasks: [subtask] };
    expect(
      toUpdateInput([now], bare.id, form({ title: "Paint the hall", amount: "900" }), openedBare),
    ).toEqual({ title: "Paint the hall" });
  });

  it.each([
    ["invalid text", { amount: "abc", upTo: "" }],
    ["a reversed range", { amount: "2 000", upTo: "1 500" }],
  ])("ignores the hidden amounts of a task that has subtasks now, also %s", (_, amounts) => {
    // Regression: amounts typed before a refetch brought the first subtask are hidden behind
    // the sum; they and the form's prefill are not read, so nothing throws.
    const subtask = { id: crypto.randomUUID(), title: "Prime", description: null, estimate: null };
    const bare = view("Paint", { estimate: { minGrosze: 30_000, maxGrosze: 40_000 } });
    const now = { ...bare, subtasks: [subtask] };
    const values = form({ title: "Paint the hall", ...amounts });
    expect(toUpdateInput([now], bare.id, values, toTaskItem(bare))).toEqual({
      title: "Paint the hall",
    });
    expect(toUpdateInput([now], bare.id, values, { ...toTaskItem(bare), ...amounts })).toEqual({
      title: "Paint the hall",
    });
  });

  it("sends the estimate of a task whose only subtask was still pending when the form opened", () => {
    const temporary = { id: "pending-4", title: "Prime", description: null, estimate: null };
    const parent = view("Paint", { subtasks: [temporary] });
    expect(
      toUpdateInput([parent], parent.id, form({ title: "Paint", amount: "9" }), toTaskItem(parent)),
    ).toEqual({ estimate: { minGrosze: 900, maxGrosze: 900 } });
  });

  it("throws for text the form would not submit and for a task that is not cached", () => {
    expect(() => toUpdateInput(tasks, exact.id, { ...prefilled, title: "" }, opened)).toThrow(
      "The task form was submitted with invalid values",
    );
    expect(() => toCreateInput(form({ amount: "-5" }))).toThrow();
    expect(() => toCreateInput(form({ title: " " }))).toThrow();
    expect(() => toUpdateInput(tasks, crypto.randomUUID(), prefilled, opened)).toThrow(
      "The edited task is not in the list",
    );
  });
});

describe("subtaskAdded", () => {
  const subtask = (title: string, id: string = crypto.randomUUID()) => ({
    id,
    title,
    description: null,
    estimate: null,
  });
  const own = { minGrosze: 100_000, maxGrosze: 200_000 };
  const sumStarted =
    "The estimate of “Bathroom” is now the sum of its subtasks. Your amount is kept and comes back if you delete all subtasks.";

  it("announces the first subtask of a task with its own estimate and finds the new one", () => {
    const bathroom = view("Bathroom", { estimate: own });
    const prime = subtask("Prime");
    const answer = { ...bathroom, estimate: null, unestimatedSubtasks: 1, subtasks: [prime] };
    expect(subtaskAdded([bathroom], answer)).toEqual({ id: prime.id, notice: sumStarted });
  });

  it("does not count a subtask still pending as one the task had", () => {
    const bathroom = view("Bathroom", { estimate: own, subtasks: [subtask("Grout", "pending-9")] });
    const prime = subtask("Prime");
    expect(subtaskAdded([bathroom], { ...bathroom, subtasks: [prime] })).toEqual({
      id: prime.id,
      notice: sumStarted,
    });
  });

  it("says nothing when the task had a subtask already or never had its own estimate", () => {
    const first = subtask("Prime");
    const second = subtask("Paint");
    const summed = view("Bathroom", { estimate: own, subtasks: [first] });
    expect(subtaskAdded([summed], { ...summed, subtasks: [first, second] })).toEqual({
      id: second.id,
      notice: undefined,
    });
    const unpriced = view("Bathroom");
    expect(subtaskAdded([unpriced], { ...unpriced, subtasks: [first] })).toEqual({
      id: first.id,
      notice: undefined,
    });
  });

  it("takes the last new subtask when the task was not cached, and none when nothing is new", () => {
    const first = subtask("Prime");
    const second = subtask("Paint");
    const bathroom = view("Bathroom", { estimate: own, subtasks: [first, second] });
    expect(subtaskAdded([], bathroom)).toEqual({ id: second.id, notice: undefined });
    expect(subtaskAdded([bathroom], bathroom)).toEqual({ id: undefined, notice: undefined });
  });
});

describe("subtaskDeleted", () => {
  it("announces the task's own estimate when its last subtask went", () => {
    const back = view("Bathroom", { estimate: { minGrosze: 100_000, maxGrosze: 200_000 } });
    expect(subtaskDeleted(back)).toBe(
      pln("The estimate of “Bathroom” is back to your amount: 1_000–2_000_zł."),
    );
  });

  it("says nothing for a task, a task with subtasks left or one without its own estimate", () => {
    const left = { id: crypto.randomUUID(), title: "Prime", description: null, estimate: null };
    expect(subtaskDeleted(null)).toBeUndefined();
    expect(
      subtaskDeleted(
        view("Bathroom", { estimate: { minGrosze: 1, maxGrosze: 1 }, subtasks: [left] }),
      ),
    ).toBeUndefined();
    expect(subtaskDeleted(view("Bathroom"))).toBeUndefined();
  });
});

describe("hasTask and isNotFound", () => {
  it("finds tasks and subtasks", () => {
    const subtask = { id: crypto.randomUUID(), title: "Buy", description: null, estimate: null };
    const parent = view("Paint", { subtasks: [subtask] });
    expect(hasTask([parent], parent.id)).toBe(true);
    expect(hasTask([parent], subtask.id)).toBe(true);
    expect(hasTask([parent], crypto.randomUUID())).toBe(false);
  });

  it("is true only for an ApiError 404", () => {
    expect(isNotFound(new ApiError(404, "not_found", "Task"))).toBe(true);
    expect(isNotFound(new ApiError(409, "conflict", "x"))).toBe(false);
    expect(isNotFound(new Error("404"))).toBe(false);
  });
});

describe("submitError", () => {
  const fallback = "Could not add the task. Try again.";
  const invalid = (fieldErrors?: Record<string, string[]>) =>
    new ApiError(400, "validation_error", "Invalid input", fieldErrors);

  it("shows a 409's own message above the form", () => {
    expect(
      submitError(new ApiError(409, "conflict", "Please try again"), form(), fallback),
    ).toEqual({ ok: false, formError: "Please try again" });
  });

  it("puts server field errors under their fields", () => {
    const error = invalid({
      title: ["Enter a title.", "second"],
      description: ["Too long"],
      "estimate.minGrosze": ["Low"],
      "estimate.maxGrosze": ["High"],
    });
    expect(submitError(error, form({ amount: "1", upTo: "2" }), fallback)).toEqual({
      ok: false,
      fieldErrors: {
        title: "Enter a title.",
        description: "Too long",
        amount: "Low",
        upTo: "High",
      },
    });
  });

  it("maps both bounds onto the one amount field that was filled", () => {
    const error = invalid({ "estimate.minGrosze": ["Low"], "estimate.maxGrosze": ["High"] });
    expect(submitError(error, form({ amount: "1" }), fallback)).toEqual({
      ok: false,
      fieldErrors: { amount: "Low" },
    });
    expect(submitError(error, form({ upTo: "1" }), fallback)).toEqual({
      ok: false,
      fieldErrors: { upTo: "Low" },
    });
    expect(submitError(invalid({ estimate: ["Bad"] }), form({ upTo: "1" }), fallback)).toEqual({
      ok: false,
      fieldErrors: { upTo: "Bad" },
    });
  });

  it("falls back for unknown keys, empty messages, no field errors and other failures", () => {
    const unknown = invalid({ _: ["Change at least one field."], constructor: ["x"], title: [] });
    for (const error of [
      unknown,
      invalid(),
      new ApiError(500, "internal_error", "Something went wrong"),
      new ApiError(200, "bad_response", "Unexpected server response"),
      new TypeError("Failed to fetch"),
    ]) {
      expect(submitError(error, form(), fallback)).toEqual({ ok: false, formError: fallback });
    }
  });
});
