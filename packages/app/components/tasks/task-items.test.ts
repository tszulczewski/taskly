import type { TaskView } from "@taskly/core";
import type { TaskFormValues } from "@taskly/ui";
import { describe, expect, it } from "vitest";
import { ApiError } from "../../lib/api-client";
import {
  hasTask,
  isNotFound,
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
      { id: subtask.id, title: "Buy", description: null, estimate: null, amount: "", upTo: "" },
    ]);
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
  const prefilled = form({ amount: "500", description: "Silicone" });

  it("sends only the changed fields", () => {
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, title: "Seal the shower" })).toEqual({
      title: "Seal the shower",
    });
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, description: "" })).toEqual({
      description: null,
    });
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, upTo: "600" })).toEqual({
      estimate: { minGrosze: 50_000, maxGrosze: 60_000 },
    });
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, amount: "400" })).toEqual({
      estimate: { minGrosze: 40_000, maxGrosze: 40_000 },
    });
  });

  it("removes the estimate when both amounts are cleared, and adds one to a task without", () => {
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, amount: "" })).toEqual({
      estimate: null,
    });
    const none = view("Paint");
    expect(toUpdateInput([none], none.id, form({ title: "Paint", amount: "10" }))).toEqual({
      estimate: { minGrosze: 1_000, maxGrosze: 1_000 },
    });
  });

  it("sends nothing when nothing changed, also for an edited subtask", () => {
    expect(toUpdateInput(tasks, exact.id, { ...prefilled, title: " Seal the bath " })).toEqual(
      null,
    );
    const subtask = { id: crypto.randomUUID(), title: "Buy", description: null, estimate: null };
    const parent = view("Paint", { subtasks: [subtask] });
    expect(toUpdateInput([parent], subtask.id, form({ title: "Buy" }))).toEqual(null);
  });

  it("throws for text the form would not submit and for a task that is not cached", () => {
    expect(() => toUpdateInput(tasks, exact.id, { ...prefilled, title: "" })).toThrow(
      "The task form was submitted with invalid values",
    );
    expect(() => toCreateInput(form({ amount: "-5" }))).toThrow();
    expect(() => toCreateInput(form({ title: " " }))).toThrow();
    expect(() => toUpdateInput(tasks, crypto.randomUUID(), prefilled)).toThrow(
      "The edited task is not in the list",
    );
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
