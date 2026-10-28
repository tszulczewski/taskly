import type { SortableText } from "./sortable";
import { defaultTaskFieldsText, type TaskFieldsText } from "./task-fields";

/** Every string the task components show; pass a `Partial` to translate (stories: Polish). */
export interface TaskText extends TaskFieldsText, SortableText {
  title: string;
  newTask: string;
  newSubtask: string;
  add: string;
  adding: string;
  save: string;
  saving: string;
  cancel: string;
  unexpectedError: string;
  noEstimate: string;
  /** The meta line of a row the server has not confirmed yet. */
  pending: string;
  subtaskCount: (count: number) => string;
  /** The meta line of a task whose sum leaves some subtasks out (R13). */
  unestimatedSubtasks: (count: number) => string;
  /** The edit form of a task with subtasks shows their sum instead of the amounts (R12). */
  sumOfSubtasks: string;
  sumNone: string;
  sumHint: string;
  moreActions: (title: string) => string;
  editTask: (title: string) => string;
  subtasksOf: (title: string) => string;
  addSubtask: string;
  edit: string;
  delete: string;
  list: string;
  loading: string;
  loadError: string;
  retry: string;
  retrying: string;
  emptyTitle: string;
  emptyBody: string;
  deleteTitle: (title: string, subtasks: number) => string;
  deleteConfirm: string;
  deleting: string;
  deleteError: string;
  important: string;
  urgent: string;
  places: string;
  moveUp: string;
  moveDown: string;
  dragHandle: (title: string) => string;
  /** Read out for the handle in place of "button" (`aria-roledescription`). */
  sortable: string;
  /** The completion checkbox's name; its checked state says whether the task is done. */
  complete: (title: string) => string;
  /** "1/3" in the meta line, and what a screen reader hears instead. */
  subtaskProgress: (done: number, total: number) => string;
  subtaskProgressLabel: (done: number, total: number) => string;
  completeTitle: (title: string, openSubtasks: number) => string;
  completeDescription: string;
  completeConfirm: string;
}

/** English first (Luki 5); messages from spec E01, UI/UX. */
export const defaultTaskText: TaskText = {
  ...defaultTaskFieldsText,
  title: "Title",
  newTask: "New task",
  newSubtask: "New subtask",
  add: "Add",
  adding: "Adding…",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  unexpectedError: "Something went wrong. Try again.",
  noEstimate: "No estimate",
  pending: "Saving…",
  subtaskCount: (count) => (count === 1 ? "1 subtask" : `${count} subtasks`),
  unestimatedSubtasks: (count) =>
    count === 1 ? "1 subtask without an estimate" : `${count} subtasks without an estimate`,
  sumOfSubtasks: "Sum of subtasks:",
  sumNone: "no estimate yet",
  sumHint: "Change the amounts on the subtasks.",
  moreActions: (title) => `More actions for “${title}”`,
  editTask: (title) => `Edit “${title}”`,
  subtasksOf: (title) => `Subtasks of “${title}”`,
  addSubtask: "Add subtask",
  edit: "Edit",
  delete: "Delete",
  list: "Tasks",
  loading: "Loading tasks…",
  loadError: "Could not load your tasks.",
  retry: "Try again",
  retrying: "Trying again…",
  emptyTitle: "No tasks yet.",
  emptyBody: "Add the first thing you need to do.",
  deleteTitle: (title, subtasks) =>
    subtasks === 0
      ? `Delete “${title}”?`
      : `Delete “${title}” and its ${subtasks === 1 ? "subtask" : `${subtasks} subtasks`}?`,
  deleteConfirm: "Delete task",
  deleting: "Deleting…",
  deleteError: "Could not delete the task. Try again.",
  important: "Important",
  urgent: "Urgent",
  places: "Places…",
  moveUp: "Move up",
  moveDown: "Move down",
  dragHandle: (title) => `Move “${title}”`,
  sortable: "movable row",
  dragInstructions:
    "To move a task, press Space or Enter, use the up and down arrow keys, then press Space or Enter to drop it. Escape cancels.",
  pickedUp: (title) => `Picked up “${title}”.`,
  movedOver: (title, overTitle) => `“${title}” is now at “${overTitle}”.`,
  dropped: (title, overTitle) => `“${title}” was moved to “${overTitle}”.`,
  cancelled: (title) => `Moving “${title}” was cancelled.`,
  complete: (title) => `Complete “${title}”`,
  subtaskProgress: (done, total) => `${done}/${total}`,
  subtaskProgressLabel: (done, total) =>
    `${done} of ${total} ${total === 1 ? "subtask" : "subtasks"} completed`,
  completeTitle: (title, openSubtasks) =>
    `Complete “${title}” and its ${openSubtasks === 1 ? "open subtask" : `${openSubtasks} open subtasks`}?`,
  completeDescription: "Reopening the task later does not reopen its subtasks.",
  completeConfirm: "Complete task",
};
