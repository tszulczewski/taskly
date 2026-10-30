import {
  type CreateTaskInput,
  createTaskInput,
  type Estimate,
  estimateFromAmounts,
  formatPlnAmount,
  formatPlnRange,
  type SubtaskView,
  type TaskView,
  type UpdateTaskInput,
  updateTaskInput,
} from "@taskly/core";
import type {
  SubmitResult,
  TaskField,
  TaskFieldErrors,
  TaskFormValues,
  TaskItem,
} from "@taskly/ui";
import { ApiError } from "../../lib/api-client";
import { firstFieldErrors } from "../../lib/form-errors";
import { isPendingTaskId } from "./use-tasks";

/** The screen's own texts (spec E01, UI/UX); the rest come from the design system. */
export const TASK_SCREEN_TEXT = {
  addFailed: "Could not add the task. Try again.",
  saveFailed: "Could not save the task. Try again.",
  deleted: "This task was deleted. The list has been refreshed.",
  /** Roll-up messages (spec E01, Q1), shown in the parent's row. */
  sumStarted: (title: string) =>
    `The estimate of “${title}” is now the sum of its subtasks. Your amount is kept and comes back if you delete all subtasks.`,
  sumBack: (title: string, amount: string) =>
    `The estimate of “${title}” is back to your amount: ${amount}.`,
} as const;

type EstimateView = TaskView["estimate"];

const estimateText = (estimate: EstimateView) =>
  estimate === null ? null : formatPlnRange(estimate.minGrosze, estimate.maxGrosze);

/** The edit form's two fields: an exact price in "Amount" only, a range in both (R18). */
function amountFields(estimate: EstimateView): Pick<TaskItem, "amount" | "upTo"> {
  if (estimate === null) return { amount: "", upTo: "" };
  const { minGrosze, maxGrosze } = estimate;
  return {
    amount: formatPlnAmount(minGrosze),
    upTo: minGrosze === maxGrosze ? "" : formatPlnAmount(maxGrosze),
  };
}

/** The task's subtasks the server knows; a temporary one (an add in flight) does not count yet. */
const savedSubtasks = (view: TaskView) =>
  view.subtasks.filter((subtask) => !isPendingTaskId(subtask.id));

function toSubtaskItem(view: SubtaskView): TaskItem {
  return {
    id: view.id,
    title: view.title,
    description: view.description,
    estimate: estimateText(view.estimate),
    ...amountFields(view.estimate),
    pending: isPendingTaskId(view.id),
  };
}

/** A cached `TaskView` as the list shows it; a temporary row (an add in flight) is pending. */
export function toTaskItem(view: TaskView): TaskItem {
  return {
    ...toSubtaskItem(view),
    // A task with subtasks shows their sum in its edit form, not the amounts (R12). Its fields
    // stay empty, so a sum above the typed-amount cap never fails the form's hidden fields.
    ...(savedSubtasks(view).length > 0 && { amount: "", upTo: "" }),
    unestimatedSubtasks: view.unestimatedSubtasks,
    subtasks: view.subtasks.map(toSubtaskItem),
  };
}

type Read = { ok: true; value: CreateTaskInput } | { ok: false; fieldErrors: TaskFieldErrors };

/**
 * The form's text → the task's fields, through `estimateFromAmounts` and `createTaskInput`: one
 * amount is an exact price, both a range, none no estimate (R18).
 */
function readValues(values: TaskFormValues): Read {
  const textErrors = firstFieldErrors(createTaskInput, values);
  const amounts = estimateFromAmounts(values.amount, values.upTo);
  if (!amounts.ok) return { ok: false, fieldErrors: { ...textErrors, ...amounts.fieldErrors } };
  const parsed = createTaskInput.safeParse({
    title: values.title,
    description: values.description,
    estimate: amounts.estimate,
  });
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, fieldErrors: textErrors };
}

/** The rules of quick add and the edit form, from the shared schema; a message per field. */
export function validateTaskForm(values: TaskFormValues): TaskFieldErrors {
  const read = readValues(values);
  return read.ok ? {} : read.fieldErrors;
}

/**
 * What quick add sends (`createTaskInput`), or "Add subtask" with the parent's `parentId`. The
 * forms submit only text `validateTaskForm` accepted, so invalid text throws, which the form
 * shows as "Something went wrong".
 */
export function toCreateInput(
  values: TaskFormValues,
  parentId: string | null = null,
): CreateTaskInput {
  const read = readValues(values);
  if (!read.ok) throw new Error("The task form was submitted with invalid values");
  return { ...read.value, parentId };
}

const sameEstimate = (a: Estimate | null, b: EstimateView) =>
  a === null || b === null ? a === b : a.minGrosze === b.minGrosze && a.maxGrosze === b.maxGrosze;

function findTask(
  tasks: readonly TaskView[],
  id: string,
): { current: SubtaskView; summed: boolean } | undefined {
  for (const task of tasks) {
    if (task.id === id) return { current: task, summed: savedSubtasks(task).length > 0 };
    const subtask = task.subtasks.find((candidate) => candidate.id === id);
    if (subtask) return { current: subtask, summed: false };
  }
  return undefined;
}

/**
 * What an edit sends: only the fields that differ from the cached task (`updateTaskInput`), or
 * `null` when nothing changed. Clearing both amounts sends `estimate: null`. The edited row is on
 * screen, so its task is in the cache. A task with subtasks never sends an estimate: its form
 * shows their sum instead of the amounts, and the server refuses the whole edit (409) if it does.
 */
export function toUpdateInput(
  tasks: readonly TaskView[],
  id: string,
  values: TaskFormValues,
): UpdateTaskInput | null {
  const found = findTask(tasks, id);
  if (found === undefined) throw new Error("The edited task is not in the list");
  const { current, summed } = found;
  const { title, description, estimate } = toCreateInput(values);
  const changes = {
    ...(title !== current.title && { title }),
    ...(description !== current.description && { description }),
    ...(!summed && !sameEstimate(estimate, current.estimate) && { estimate }),
  };
  return Object.keys(changes).length === 0 ? null : updateTaskInput.parse(changes);
}

/**
 * What a confirmed "Add subtask" shows: the new subtask, to highlight (the one in the server's
 * parent that the parent did not have before the add), and the first-subtask message when the
 * parent had no subtask yet and an estimate of its own (spec E01, Roll-up messages). `before` is
 * the list as it was before the temporary subtask went in.
 */
export function subtaskAdded(
  before: readonly TaskView[],
  parent: TaskView,
): { id: string | undefined; notice: string | undefined } {
  const previous = before.find((task) => task.id === parent.id);
  const known = new Set(previous?.subtasks.map((subtask) => subtask.id));
  const added = parent.subtasks.filter((subtask) => !known.has(subtask.id));
  const startsSum =
    previous !== undefined && savedSubtasks(previous).length === 0 && previous.estimate !== null;
  return {
    id: added.at(-1)?.id,
    notice: startsSum ? TASK_SCREEN_TEXT.sumStarted(parent.title) : undefined,
  };
}

/**
 * The last-subtask message after a delete (spec E01, Roll-up messages): the server's parent has
 * no subtask left and its own estimate is back. `null` (a task was deleted) and a parent that
 * never had an estimate of its own give none.
 */
export function subtaskDeleted(parent: TaskView | null): string | undefined {
  if (parent === null || parent.subtasks.length > 0 || parent.estimate === null) return undefined;
  const { minGrosze, maxGrosze } = parent.estimate;
  return TASK_SCREEN_TEXT.sumBack(parent.title, formatPlnRange(minGrosze, maxGrosze));
}

/** True when the list contains this task or subtask. */
export function hasTask(tasks: readonly TaskView[], id: string): boolean {
  return findTask(tasks, id) !== undefined;
}

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

/**
 * The server's `fieldErrors` under the form's fields. With one amount typed, both bounds came
 * from it, so a message about either bound goes under that field (spec E01, Validation).
 */
function serverFieldErrors(
  fieldErrors: Record<string, string[]>,
  values: TaskFormValues,
): TaskFieldErrors {
  const amountField: TaskField = values.amount.trim() === "" ? "upTo" : "amount";
  const upToField: TaskField = values.upTo.trim() === "" ? "amount" : "upTo";
  // A Map, so a key such as "constructor" never hits a prototype property.
  const fieldOf = new Map<string, TaskField>([
    ["title", "title"],
    ["description", "description"],
    ["estimate", amountField],
    ["estimate.minGrosze", amountField],
    ["estimate.maxGrosze", upToField],
  ]);
  const errors: TaskFieldErrors = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    const field = fieldOf.get(key);
    const [message] = messages;
    if (field !== undefined && message !== undefined) errors[field] ??= message;
  }
  return errors;
}

/**
 * A refused add or edit as the form shows it: 400 field errors under their fields, a 409's own
 * message (fixed, user-facing texts) above the form, anything else `fallback`, with the typed
 * text kept.
 */
export function submitError(
  error: unknown,
  values: TaskFormValues,
  fallback: string,
): SubmitResult<TaskField> {
  if (error instanceof ApiError && error.status === 409) {
    return { ok: false, formError: error.message };
  }
  if (error instanceof ApiError && error.status === 400 && error.fieldErrors) {
    const fieldErrors = serverFieldErrors(error.fieldErrors, values);
    if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  }
  return { ok: false, formError: fallback };
}
