import { estimateMessages, type TaskView } from "@taskly/core";
import type { TaskFormValues } from "@taskly/ui";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../lib/api-client";
import {
  applyCompletion,
  applyMarker,
  applyMove,
  applyPlace,
  hasTask,
  isPlaceNotFound,
  PLACE_TEXT,
  placeSubmitError,
  withPlaceDeleted,
  withPlaceUpdated,
  isNotFound,
  addEstimateError,
  isPendingTaskId,
  replayChanges,
  sortTasks,
  subtaskAdded,
  subtaskDeleted,
  submitError,
  TASK_SCREEN_TEXT,
  titleOf,
  toCreateInput,
  toEstimate,
  toExpensesView,
  totalText,
  toTaskItem,
  toUpdateInput,
  validateEstimate,
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
    completed: false,
    important: false,
    urgent: false,
    places: [],
    position: "a0",
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
      completed: false,
      important: false,
      urgent: false,
      places: [],
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
    const subtask = {
      id: crypto.randomUUID(),
      title: "Buy",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
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
        completed: false,
        important: false,
        urgent: false,
        places: [],
        amount: "",
        upTo: "",
        pending: false,
      },
    ]);
  });

  it("maps each row's own markers, for a task and for its subtasks (#18 AC4)", () => {
    const sub = { ...view("Buy"), important: true };
    const item = toTaskItem(view("Paint", { urgent: true, subtasks: [sub] }));
    expect(item).toMatchObject({ important: false, urgent: true });
    expect(item.subtasks![0]).toMatchObject({ important: true, urgent: false });
  });

  it("maps each row's own places, in the view's order (#19 AC2, AC9)", () => {
    const salon = { id: crypto.randomUUID(), name: "Salon", color: 1 };
    const garaz = { id: crypto.randomUUID(), name: "Garaż", color: 5 };
    const sub = { ...view("Buy"), places: [garaz] };
    const item = toTaskItem(view("Paint", { places: [salon, garaz], subtasks: [sub] }));
    expect(item.places).toEqual([salon, garaz]);
    expect(item.subtasks![0]!.places).toEqual([garaz]);
  });

  it("maps completed for a task and for its subtasks", () => {
    const done = {
      id: crypto.randomUUID(),
      title: "Buy",
      description: null,
      estimate: null,
      completed: true,
      important: false,
      urgent: false,
      places: [],
      position: "a1",
    };
    const item = toTaskItem(view("Paint", { completed: true, subtasks: [done] }));
    expect(item.completed).toBe(true);
    expect(item.subtasks![0]!.completed).toBe(true);
    expect(toTaskItem(view("Seal")).completed).toBe(false);
  });

  it("leaves the amounts of a task with subtasks empty: its form shows their sum", () => {
    const priced = {
      id: crypto.randomUUID(),
      title: "Prime",
      description: null,
      estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
    // A sum above the typed-amount cap must not reach the (hidden) amount fields.
    const sum = { minGrosze: 3_000_000_000, maxGrosze: 3_000_000_000 };
    const item = toTaskItem(view("Paint", { estimate: sum, subtasks: [priced] }));
    expect(item).toMatchObject({ estimate: pln("30_000_000_zł"), amount: "", upTo: "" });
    expect(item.subtasks?.[0]).toMatchObject({ amount: "300", upTo: "400", pending: false });
    expect(validateTaskForm(form({ amount: item.amount, upTo: item.upTo }))).toEqual({});
  });

  it("keeps a task's own amounts while its only subtask is pending, and marks that one", () => {
    const temporary = {
      id: "pending-3",
      title: "Prime",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
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
    const subtask = {
      id: crypto.randomUUID(),
      title: "Buy",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
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
    const subtask = {
      id: crypto.randomUUID(),
      title: "Prime",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
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
    const subtask = {
      id: crypto.randomUUID(),
      title: "Prime",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
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
    const subtask = {
      id: crypto.randomUUID(),
      title: "Prime",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
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
    const temporary = {
      id: "pending-4",
      title: "Prime",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
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
    completed: false,
    important: false,
    urgent: false,
    places: [],
    position: "a0",
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
    const left = {
      id: crypto.randomUUID(),
      title: "Prime",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
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
    const subtask = {
      id: crypto.randomUUID(),
      title: "Buy",
      description: null,
      estimate: null,
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: "a0",
    };
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

describe("isPendingTaskId", () => {
  it("tells temporary ids from server ids", () => {
    expect(isPendingTaskId("pending-1")).toBe(true);
    expect(isPendingTaskId(crypto.randomUUID())).toBe(false);
  });
});

describe("future expenses", () => {
  it("shows the server's total as a range, one amount for an exact price, or null", () => {
    const total = (minGrosze: number, maxGrosze: number) =>
      totalText({ total: { minGrosze, maxGrosze }, unestimated: [] });
    expect(total(150_000_00, 270_000_00)).toBe(pln("150_000–270_000_zł"));
    expect(total(80_000, 80_000)).toBe(pln("800_zł"));
    expect(total(0, 0)).toBe(pln("0_zł"));
    expect(totalText({ total: null, unestimated: [] })).toBeNull();
  });

  it("passes on what has no estimate with the formatted total", () => {
    const unestimated = [
      { id: "t1", title: "Seal the bath" },
      { id: "s1", title: "Tiles", taskTitle: "Bathroom tiles" },
    ];
    expect(
      toExpensesView({ total: { minGrosze: 40_000, maxGrosze: 40_000 }, unestimated }),
    ).toEqual({ total: pln("400_zł"), unestimated });
  });
});

describe("Add estimate", () => {
  const amounts = (amount: string, upTo = "") => ({ amount, upTo });

  it("requires an amount, then follows the task forms' rules (R18)", () => {
    expect(validateEstimate(amounts(""))).toEqual({ amount: estimateMessages.required });
    expect(validateEstimate(amounts("  ", " "))).toEqual({ amount: estimateMessages.required });
    expect(validateEstimate(amounts("abc"))).toEqual({ amount: estimateMessages.amount });
    expect(validateEstimate(amounts("500", "100"))).toEqual({
      upTo: estimateMessages.upToBelowAmount,
    });
    expect(validateEstimate(amounts("400"))).toEqual({});
    expect(validateEstimate(amounts("", "400"))).toEqual({});
    expect(validateEstimate(amounts("0"))).toEqual({});
  });

  it("saves one amount as an exact price and both as a range, in grosze", () => {
    expect(toEstimate(amounts("400"))).toEqual({ minGrosze: 40_000, maxGrosze: 40_000 });
    expect(toEstimate(amounts("", "1 500,50"))).toEqual({
      minGrosze: 150_050,
      maxGrosze: 150_050,
    });
    expect(toEstimate(amounts("100", "200"))).toEqual({ minGrosze: 10_000, maxGrosze: 20_000 });
  });

  it("throws for amounts the form should not have submitted", () => {
    expect(() => toEstimate(amounts(""))).toThrow("invalid values");
    expect(() => toEstimate(amounts("abc"))).toThrow("invalid values");
  });

  it("shows a refusal: the deleted notice, a 409's message, the amounts' errors, or a retry", () => {
    const values = amounts("100", "200");
    expect(addEstimateError(new ApiError(404, "not_found", "Task not found"), values)).toEqual({
      ok: false,
      formError: TASK_SCREEN_TEXT.deleted,
    });
    const conflict = new ApiError(409, "conflict", "A task with subtasks takes its estimate");
    expect(addEstimateError(conflict, values)).toEqual({ ok: false, formError: conflict.message });
    const invalid = (fieldErrors: Record<string, string[]>) =>
      new ApiError(400, "validation_error", "Invalid input", fieldErrors);
    expect(
      addEstimateError(
        invalid({ "estimate.minGrosze": ["Low"], "estimate.maxGrosze": ["High"] }),
        values,
      ),
    ).toEqual({ ok: false, fieldErrors: { amount: "Low", upTo: "High" } });
    expect(addEstimateError(invalid({ estimate: ["Bad"] }), values)).toEqual({
      ok: false,
      fieldErrors: { amount: "Bad" },
    });
    expect(addEstimateError(invalid({ "estimate.maxGrosze": ["High"] }), values)).toEqual({
      ok: false,
      fieldErrors: { upTo: "High" },
    });
    expect(addEstimateError(new TypeError("Failed to fetch"), values)).toEqual({
      ok: false,
      formError: TASK_SCREEN_TEXT.saveFailed,
    });
  });
});

describe("completion texts", () => {
  it("names the row in the refusal and the Q3 notice", () => {
    expect(TASK_SCREEN_TEXT.changeFailed("Seal the bath")).toBe(
      "Could not save “Seal the bath”. It is back as it was.",
    );
    expect(TASK_SCREEN_TEXT.addToCompleted("Grout", "Bathroom")).toBe(
      "Could not add “Grout”. “Bathroom” is completed.",
    );
  });
});

describe("completion replay", () => {
  const row = (title: string, position: string, extra: Partial<TaskView> = {}) =>
    view(title, { position, ...extra });
  const sub = (title: string, position: string, completed = false) => {
    const {
      unestimatedSubtasks: _u,
      subtasks: _s,
      ...subtask
    } = row(title, position, { completed });
    return subtask;
  };
  const titles = (views: readonly { title: string }[]) => views.map((v) => v.title);
  const pendingRow = (title: string) => ({ ...row(title, ""), id: `pending-${title}` });

  describe("sortTasks", () => {
    it("puts open rows by key, then temporary rows in their order, then completed rows by key", () => {
      const views = [
        row("Done b", "a5", { completed: true }),
        pendingRow("New 1"),
        row("Open b", "a3"),
        row("Done a", "a1", { completed: true }),
        pendingRow("New 2"),
        row("Open a", "a2"),
      ];

      expect(titles(sortTasks(views))).toEqual([
        "Open a",
        "Open b",
        "New 1",
        "New 2",
        "Done a",
        "Done b",
      ]);
    });

    it("sorts each task's subtasks the same way and leaves the input alone", () => {
      const task = row("Bathroom", "a0", {
        subtasks: [sub("s2", "a1", true), sub("s1", "a2")],
      });
      const views = [task];

      expect(titles(sortTasks(views)[0]!.subtasks)).toEqual(["s1", "s2"]);
      expect(titles(views[0]!.subtasks)).toEqual(["s2", "s1"]);
    });

    it("keeps rows with equal keys in their order", () => {
      expect(titles(sortTasks([row("x", "a0"), row("y", "a0")]))).toEqual(["x", "y"]);
    });

    it('compares keys bytewise, as COLLATE "C" does', () => {
      // "Z" (0x5A) sorts before "a" (0x61), unlike a locale-aware comparison.
      expect(titles(sortTasks([row("a", "a0"), row("Z", "Zz")]))).toEqual(["Z", "a"]);
    });
  });

  describe("applyCompletion", () => {
    it("completes a task with all its subtasks and moves it after the open tasks, keys unchanged (R09)", () => {
      const a = row("A", "a0", { subtasks: [sub("s1", "a0"), sub("s2", "a1")] });
      const views = [a, row("B", "a1"), row("C", "a2")];

      const shown = applyCompletion(views, { id: a.id, completed: true });

      expect(titles(shown)).toEqual(["B", "C", "A"]);
      expect(shown[2]).toEqual({
        ...a,
        completed: true,
        subtasks: a.subtasks.map((s) => ({ ...s, completed: true })),
      });
    });

    it("reopens a task first, keyed before its first saved sibling; its subtasks keep their state (R11)", () => {
      const a = row("A", "a5", { completed: true, subtasks: [sub("s1", "a0", true)] });
      const views = [row("B", "a1"), pendingRow("New"), row("C", "a2", { completed: true }), a];

      const shown = applyCompletion(views, { id: a.id, completed: false });

      expect(titles(shown)).toEqual(["A", "B", "New", "C"]);
      expect(shown[0]).toEqual({ ...a, completed: false, position: "a0" });
    });

    it("keeps the key of a reopened row with no saved sibling", () => {
      const only = row("Only", "a3", { completed: true });

      const shown = applyCompletion([only, pendingRow("New")], { id: only.id, completed: false });

      expect(shown[0]).toEqual({ ...only, completed: false });
    });

    it("completes a subtask alone, after its open siblings; the task stays open (R11)", () => {
      const task = row("Bathroom", "a0", {
        subtasks: [sub("s1", "a0"), sub("s2", "a1"), sub("s3", "a2")],
      });

      const [shown] = applyCompletion([task], { id: task.subtasks[0]!.id, completed: true });

      expect(shown!.completed).toBe(false);
      expect(titles(shown!.subtasks)).toEqual(["s2", "s3", "s1"]);
    });

    it("reopens a subtask of a completed task first among its siblings; the task stays completed (Q2)", () => {
      const task = row("Bathroom", "a0", {
        completed: true,
        subtasks: [sub("s1", "a1", true), sub("s2", "a2", true)],
      });

      const [shown] = applyCompletion([task], { id: task.subtasks[1]!.id, completed: false });

      expect(shown!.completed).toBe(true);
      expect(shown!.subtasks.map((s) => [s.title, s.completed, s.position])).toEqual([
        ["s2", false, "a0"],
        ["s1", true, "a1"],
      ]);
    });

    it("leaves a row already in that state, or one no longer in the list, as it is", () => {
      const done = row("Done", "a0", { completed: true, subtasks: [sub("s1", "a0")] });
      const open = row("Open", "a1", { subtasks: [sub("s2", "a0", true)] });
      const views = [open, done];

      expect(applyCompletion(views, { id: done.id, completed: true })).toEqual(views);
      expect(applyCompletion(views, { id: open.subtasks[0]!.id, completed: true })).toEqual(views);
      expect(applyCompletion(views, { id: crypto.randomUUID(), completed: false })).toEqual(views);
    });
  });

  describe("applyMarker", () => {
    it("sets or clears one marker of a task only, keeping its subtasks' and the order (#18 AC1, AC4)", () => {
      const a = row("A", "a0", { subtasks: [sub("s1", "a0")] });
      const views = [a, row("B", "a1")];

      const shown = applyMarker(views, { id: a.id, marker: "important", on: true });

      expect(titles(shown)).toEqual(["A", "B"]);
      expect(shown[0]).toEqual({ ...a, important: true });
      expect(shown[1]).toEqual(views[1]);
      expect(applyMarker(shown, { id: a.id, marker: "important", on: false })[0]).toEqual(a);
    });

    it("marks a subtask only, never its task or its siblings (#18 AC4, D21)", () => {
      const task = row("Bathroom", "a0", { subtasks: [sub("s1", "a0"), sub("s2", "a1")] });

      const [shown] = applyMarker([task], { id: task.subtasks[1]!.id, marker: "urgent", on: true });

      expect(shown).toEqual({
        ...task,
        subtasks: [task.subtasks[0], { ...task.subtasks[1]!, urgent: true }],
      });
    });

    it("leaves the other marker as it is, and a row no longer in the list changes nothing (#18 AC3)", () => {
      const a = row("A", "a0", { important: true, urgent: true });

      expect(applyMarker([a], { id: a.id, marker: "urgent", on: false })).toEqual([
        { ...a, urgent: false },
      ]);
      expect(applyMarker([a], { id: crypto.randomUUID(), marker: "urgent", on: false })).toEqual([
        a,
      ]);
    });
  });

  describe("applyMove (#17)", () => {
    it("moves a task between its new open neighbours; completed and temporary rows stay put (AC1)", () => {
      const a = row("A", "a0");
      const b = row("B", "a1");
      const c = row("C", "a3");
      const done = row("Done", "a2", { completed: true });
      const views = [a, b, done, c, pendingRow("New")];

      const shown = applyMove(views, { id: a.id, afterId: b.id, beforeId: c.id });

      expect(titles(shown)).toEqual(["B", "A", "C", "New", "Done"]);
      // Keyed between B and the next stored sibling (the completed one), never equal to it.
      const moved = shown.find((v) => v.id === a.id)!;
      expect(moved.position > "a1" && moved.position < "a2").toBe(true);
      expect(shown.find((v) => v.id === b.id)).toEqual(b);
      expect(views[0]).toBe(a);
    });

    it("moves a subtask within its task only (AC4)", () => {
      const task = row("Bathroom", "a0", { subtasks: [sub("s1", "a0"), sub("s2", "a1")] });
      const other = row("Kitchen", "a1", { subtasks: [sub("k1", "a0")] });

      const shown = applyMove([task, other], {
        id: task.subtasks[1]!.id,
        afterId: null,
        beforeId: task.subtasks[0]!.id,
      });

      expect(titles(shown[0]!.subtasks)).toEqual(["s2", "s1"]);
      expect(shown[1]).toEqual(other);
    });

    it("changes nothing for a stale move, a completed row, a row no longer in the list or a stay", () => {
      const a = row("A", "a0");
      const b = row("B", "a1");
      const c = row("C", "a2");
      const done = row("Done", "a3", { completed: true });
      const views = [a, b, c, done];

      // Neighbours no longer adjacent (M-1), a completed row (AC8), a gone row, and a stay (M-2).
      expect(applyMove(views, { id: c.id, afterId: null, beforeId: b.id })).toEqual(views);
      expect(applyMove(views, { id: done.id, afterId: null, beforeId: a.id })).toEqual(views);
      expect(applyMove(views, { id: crypto.randomUUID(), afterId: null, beforeId: a.id })).toEqual(
        views,
      );
      expect(applyMove(views, { id: b.id, afterId: a.id, beforeId: c.id })).toEqual(views);
    });
  });

  describe("replayChanges", () => {
    it("replays marker toggles over the server's views, in order, with completions", () => {
      const a = row("A", "a0");
      const b = row("B", "a1");

      const shown = replayChanges(
        [a, b],
        [
          { kind: "marker", id: a.id, marker: "important", on: true },
          { kind: "marker", id: a.id, marker: "urgent", on: true },
          { kind: "completion", id: a.id, completed: true },
          { kind: "marker", id: a.id, marker: "important", on: false },
          { kind: "move", id: b.id, afterId: null, beforeId: null },
        ],
      );

      expect(shown.map((v) => [v.title, v.completed, v.important, v.urgent])).toEqual([
        ["B", false, false, false],
        ["A", true, false, true],
      ]);
    });

    it("sorts the server's views and applies the pending changes in the order they were made", () => {
      const a = row("A", "a0");
      const b = row("B", "a1", { completed: true });
      // The server's answer for a completion sits in A's old place until the next refetch.
      const views = [b, a];

      expect(titles(replayChanges(views, []))).toEqual(["A", "B"]);
      const shown = replayChanges(views, [
        { kind: "completion", id: a.id, completed: true },
        { kind: "completion", id: a.id, completed: false },
        { kind: "completion", id: b.id, completed: false },
      ]);
      expect(shown.map((v) => [v.title, v.completed])).toEqual([
        ["B", false],
        ["A", false],
      ]);
    });
  });

  describe("places", () => {
    const salon = { id: crypto.randomUUID(), name: "Salon", color: 1 };
    const kuchnia = { id: crypto.randomUUID(), name: "Kuchnia", color: 4 };
    const garaz = { id: crypto.randomUUID(), name: "Garaż", color: 5 };
    const cache = [salon, kuchnia, garaz];

    it("ticks a place on that row only, in the places' order, and unticks it (#19 AC2, AC3, AC9)", () => {
      const task = row("Bathroom", "a0", { places: [garaz], subtasks: [sub("s1", "a0")] });

      const [shown] = applyPlace([task], { id: task.id, placeId: salon.id, assigned: true }, cache);
      expect(shown!.places).toEqual([salon, garaz]);
      expect(shown!.subtasks[0]!.places).toEqual([]);

      const again = applyPlace([shown!], { id: task.id, placeId: salon.id, assigned: true }, cache);
      expect(again[0]!.places).toEqual([salon, garaz]);

      const off = applyPlace([shown!], { id: task.id, placeId: garaz.id, assigned: false }, cache);
      expect(off[0]!.places).toEqual([salon]);
    });

    it("ticks a subtask's place, keeping a row's place the cache no longer lists last", () => {
      const gone = { id: crypto.randomUUID(), name: "Strych", color: 7 };
      const task = row("Bathroom", "a0", { subtasks: [sub("s1", "a0")] });
      const subtask = { ...task.subtasks[0]!, places: [gone] };
      const views = [{ ...task, subtasks: [subtask] }];

      const [shown] = applyPlace(views, { id: subtask.id, placeId: kuchnia.id, assigned: true }, [
        ...cache,
      ]);
      expect(shown!.places).toEqual([]);
      expect(shown!.subtasks[0]!.places).toEqual([kuchnia, gone]);
    });

    it("skips a tick of a place no longer cached (deleted meanwhile, P9)", () => {
      const task = row("Bathroom", "a0");
      const placeId = crypto.randomUUID();

      expect(applyPlace([task], { id: task.id, placeId, assigned: true }, cache)).toEqual([task]);
    });

    it("shows a renamed or recoloured place on every row holding it (AC6, AC8)", () => {
      const a = row("A", "a0", { places: [salon, kuchnia], subtasks: [sub("s1", "a0")] });
      const withSub = { ...a, subtasks: [{ ...a.subtasks[0]!, places: [kuchnia] }] };
      const b = row("B", "a1", { places: [garaz] });
      const renamed = { ...kuchnia, name: "Aneks", color: 9 };

      const [shownA, shownB] = withPlaceUpdated([withSub, b], renamed);
      expect(shownA!.places).toEqual([salon, renamed]);
      expect(shownA!.subtasks[0]!.places).toEqual([renamed]);
      expect(shownB).toEqual(b);
    });

    it("removes a deleted place from every row and keeps their other places (AC7)", () => {
      const a = row("A", "a0", { places: [salon, kuchnia] });
      const b = row("B", "a1", { places: [garaz] });

      const [shownA, shownB] = withPlaceDeleted([a, b], kuchnia.id);
      expect(shownA!.places).toEqual([salon]);
      expect(shownB).toEqual(b);
    });

    it("replays place ticks with the other pending changes, finding each place in the cache", () => {
      const a = row("A", "a0");

      const shown = replayChanges(
        [a],
        [
          { kind: "place", id: a.id, placeId: garaz.id, assigned: true },
          { kind: "marker", id: a.id, marker: "urgent", on: true },
          { kind: "place", id: a.id, placeId: salon.id, assigned: true },
        ],
        cache,
      );
      expect(shown[0]).toMatchObject({ urgent: true, places: [salon, garaz] });
      // Without the places cache (not loaded yet), a tick has nothing to show.
      const bare = replayChanges(
        [a],
        [{ kind: "place", id: a.id, placeId: salon.id, assigned: true }],
      );
      expect(bare[0]!.places).toEqual([]);
    });

    it("tells a 404 about the place from one about the task", () => {
      expect(isPlaceNotFound(new ApiError(404, "not_found", "Place not found"))).toBe(true);
      expect(isPlaceNotFound(new ApiError(404, "not_found", "Task not found"))).toBe(false);
      expect(isPlaceNotFound(new ApiError(409, "conflict", "Place not found"))).toBe(false);
    });

    it("shows a 409 and a 400 name error under the name, anything else above the form", () => {
      const duplicate = new ApiError(409, "conflict", "A place with this name already exists.");
      expect(placeSubmitError(duplicate, PLACE_TEXT.createFailed)).toEqual({
        ok: false,
        fieldErrors: { name: "A place with this name already exists." },
      });
      const invalid = new ApiError(400, "validation_error", "Invalid input", {
        name: ["Enter a name."],
      });
      expect(placeSubmitError(invalid, PLACE_TEXT.saveFailed)).toEqual({
        ok: false,
        fieldErrors: { name: "Enter a name." },
      });
      const other = new ApiError(400, "validation_error", "Invalid input", { color: ["x"] });
      expect(placeSubmitError(other, PLACE_TEXT.saveFailed)).toEqual({
        ok: false,
        formError: PLACE_TEXT.saveFailed,
      });
      expect(placeSubmitError(new ApiError(400, "bad", "Bad"), PLACE_TEXT.saveFailed)).toEqual({
        ok: false,
        formError: PLACE_TEXT.saveFailed,
      });
      expect(placeSubmitError(new TypeError("offline"), PLACE_TEXT.createFailed)).toEqual({
        ok: false,
        formError: PLACE_TEXT.createFailed,
      });
    });
  });

  describe("titleOf", () => {
    it("finds a task's or a subtask's title, and throws for a row not on screen", () => {
      const task = row("Bathroom", "a0", { subtasks: [sub("Grout", "a0")] });

      expect(titleOf([task], task.id)).toBe("Bathroom");
      expect(titleOf([task], task.subtasks[0]!.id)).toBe("Grout");
      expect(() => titleOf([task], crypto.randomUUID())).toThrow("The task is not in the list");
    });
  });
});
