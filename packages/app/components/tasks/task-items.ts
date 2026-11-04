import {
  type CreateTaskInput,
  createTaskInput,
  type Estimate,
  estimateFromAmounts,
  formatPlnAmount,
  formatPlnRange,
  type FutureExpenses,
  positionBetween,
  type SubtaskView,
  type TaskView,
  type UpdateTaskInput,
  updateTaskInput,
} from "@taskly/core";
import type {
  FutureExpensesProps,
  SubmitResult,
  TaskField,
  TaskFieldErrors,
  TaskFormValues,
  TaskItem,
} from "@taskly/ui";
import { ApiError } from "../../lib/api-client";
import { firstFieldErrors } from "../../lib/form-errors";

// Server ids are UUIDs (`taskViewSchema`), so an id with this prefix can only be a temporary row.
export const PENDING_PREFIX = "pending-";

/**
 * True for a row the server has not confirmed yet (an optimistic add). The screen renders it as
 * pending (dimmed, actions disabled); the update and delete hooks refuse it, so no request is ever
 * sent with a temporary id (spec E01, Optimistic updates).
 */
export function isPendingTaskId(id: string): boolean {
  return id.startsWith(PENDING_PREFIX);
}

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
  /** A refused completion or reopen, after the row went back (spec E03, s04.28). */
  changeFailed: (title: string) => `Could not save “${title}”. It is back as it was.`,
  /** A subtask add refused because its task was completed meanwhile (spec E03, Q3). */
  addToCompleted: (title: string, taskTitle: string) =>
    `Could not add “${title}”. “${taskTitle}” is completed.`,
} as const;

type EstimateView = TaskView["estimate"];

const estimateText = (estimate: EstimateView) =>
  estimate === null ? null : formatPlnRange(estimate.minGrosze, estimate.maxGrosze);

/** The total as `FutureExpenses` shows it: a range, or one amount (R18); null for "No estimates yet". */
export const totalText = ({ total }: FutureExpenses): string | null => estimateText(total);

/**
 * "Add estimate" of `FutureExpenses` until spec E03 Phase 3 (#47): the response names no
 * unestimated item yet, so the list is empty and its form never opens.
 */
export const NO_UNESTIMATED = {
  unestimated: [],
  validate: () => ({}),
  onAddEstimate: async () => ({ ok: false, formError: TASK_SCREEN_TEXT.saveFailed }),
} satisfies Pick<FutureExpensesProps, "unestimated" | "validate" | "onAddEstimate">;

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
    completed: view.completed,
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

const sameEstimate = (a: Estimate | null, b: Estimate | null) =>
  a === null || b === null ? a === b : a.minGrosze === b.minGrosze && a.maxGrosze === b.maxGrosze;

/** Whether the list has this task or subtask, and whether it is a task with saved subtasks. */
function findTask(tasks: readonly TaskView[], id: string): { summed: boolean } | undefined {
  for (const task of tasks) {
    if (task.id === id) return { summed: savedSubtasks(task).length > 0 };
    if (task.subtasks.some((subtask) => subtask.id === id)) return { summed: false };
  }
  return undefined;
}

/**
 * What an edit sends (`updateTaskInput`): only the fields the user changed from what the form was
 * opened with (`opened`, the task as it was then), or `null` when nothing changed. A refetch
 * while the form is open changes nothing here. Clearing both amounts sends `estimate: null`.
 * What the form shows now decides the estimate: it goes only when the task has no saved subtasks
 * now (the form shows the amount fields) and the amounts differ from their prefill. A task with
 * subtasks takes its estimate from them, and the server refuses the whole edit (409) if it is
 * sent. A form opened on a task with subtasks was prefilled with empty amounts, so empty fields
 * that appear after a refetch send nothing, while amounts typed into them do. The edited row is on
 * screen, so its task is in the cache.
 */
export function toUpdateInput(
  tasks: readonly TaskView[],
  id: string,
  values: TaskFormValues,
  opened: TaskItem,
): UpdateTaskInput | null {
  const found = findTask(tasks, id);
  if (found === undefined) throw new Error("The edited task is not in the list");
  // The amounts are read only while the form shows them: text typed into them before a refetch
  // brought the first subtask is hidden behind the sum, so it is neither read nor sent.
  const shown = found.summed ? { ...values, amount: "", upTo: "" } : values;
  const { title, description, estimate } = toCreateInput(shown);
  const estimateChanged =
    !found.summed &&
    !sameEstimate(
      estimate,
      toCreateInput({ ...values, amount: opened.amount, upTo: opened.upTo }).estimate,
    );
  const changes = {
    ...(title !== opened.title && { title }),
    ...(description !== opened.description && { description }),
    ...(estimateChanged && { estimate }),
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

/**
 * A change the screen shows before the server confirms it (spec E03, UI/UX): the variables of a
 * pending mutation under `queryKeys.taskChanges`, whose last key part is the kind.
 */
export type PendingChange = { kind: "completion"; id: string; completed: boolean };

/** Open saved rows, then temporary ones (an add in flight, appended by the server), then completed. */
const rank = (row: SubtaskView) => (row.completed ? 2 : isPendingTaskId(row.id) ? 1 : 0);

/**
 * Rows in the server's read order: open before completed, each by `position` (JS `<` on these
 * ASCII keys compares as `COLLATE "C"`). Temporary rows have no key yet and keep their order.
 */
function inReadOrder<T extends SubtaskView>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0 || rank(a) === 1) return byRank;
    if (a.position === b.position) return 0;
    return a.position < b.position ? -1 : 1;
  });
}

/** The tasks and each task's subtasks in the server's read order. */
export function sortTasks(views: readonly TaskView[]): TaskView[] {
  return inReadOrder(views.map((view) => ({ ...view, subtasks: inReadOrder(view.subtasks) })));
}

/**
 * The row opened or completed, as the server writes it: a reopened row is keyed before its first
 * saved sibling, completed ones included, or keeps its key without one. The server's answer
 * replaces this temporary key.
 */
function toggled<T extends SubtaskView>(
  row: T,
  siblings: readonly SubtaskView[],
  completed: boolean,
): T {
  if (completed) return { ...row, completed };
  const keys = siblings
    .filter((sibling) => sibling.id !== row.id && !isPendingTaskId(sibling.id))
    .map((sibling) => sibling.position);
  const first = keys.reduce<string | null>(
    (min, key) => (min === null || key < min ? key : min),
    null,
  );
  return {
    ...row,
    completed,
    position: first === null ? row.position : positionBetween(null, first),
  };
}

/**
 * What `PUT …/completion` does, applied to the views: completing a task also completes its
 * subtasks (R09); reopening changes only that row, which goes first among its open siblings (R11,
 * Q2). A row already in that state, or not in the list (deleted meanwhile), stays as it is.
 */
export function applyCompletion(
  views: readonly TaskView[],
  { id, completed }: { id: string; completed: boolean },
): TaskView[] {
  const changed = views.map((task) => {
    if (task.id === id) {
      if (task.completed === completed) return task;
      const row = toggled(task, views, completed);
      return completed
        ? { ...row, subtasks: row.subtasks.map((subtask) => ({ ...subtask, completed })) }
        : row;
    }
    return {
      ...task,
      subtasks: task.subtasks.map((subtask) =>
        subtask.id === id && subtask.completed !== completed
          ? toggled(subtask, task.subtasks, completed)
          : subtask,
      ),
    };
  });
  return sortTasks(changed);
}

const applyChange: Record<
  PendingChange["kind"],
  (views: readonly TaskView[], change: PendingChange) => TaskView[]
> = { completion: applyCompletion };

/**
 * What the screen shows: the server's views in read order, with the pending changes applied in
 * the order they were made. Every answer, refetch or failure changes the inputs, and the changes
 * still pending are applied again on top, so none of them ever undoes a newer change (review R2).
 */
export function replayChanges(
  views: readonly TaskView[],
  changes: readonly PendingChange[],
): TaskView[] {
  return changes.reduce(
    (shown, change) => applyChange[change.kind](shown, change),
    sortTasks(views),
  );
}

/** The title of a task or subtask on screen, for its row message. */
export function titleOf(views: readonly TaskView[], id: string): string {
  for (const task of views) {
    if (task.id === id) return task.title;
    const subtask = task.subtasks.find((row) => row.id === id);
    if (subtask !== undefined) return subtask.title;
  }
  throw new Error("The task is not in the list");
}
