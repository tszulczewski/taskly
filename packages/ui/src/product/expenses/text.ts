/** Every string of the future expenses components; pass a `Partial` to translate. */
export interface ExpensesText {
  label: string;
  /** Shown instead of a range when no open task has an estimate. */
  noTotal: string;
  loading: string;
  loadError: string;
  retry: string;
  retrying: string;
  /** Counts what the list names: open tasks without subtasks, and open subtasks (D27). */
  unestimated: (tasks: number, subtasks: number) => string;
  /** The rule in one sentence, where it changes the number (Luki 5). */
  unestimatedRule: string;
  addEstimate: string;
  /** The accessible name of an item's "Add estimate"; it starts with the visible words. `taskTitle` is a subtask's task. */
  addEstimateFor: (title: string, taskTitle?: string) => string;
  estimateFor: (title: string) => string;
  amount: string;
  upTo: string;
  optional: string;
  currency: string;
  save: string;
  saving: string;
  cancel: string;
  unexpectedError: string;
}

/** English first (Luki 5); "future expenses" from the glossary (D18). */
export const defaultExpensesText: ExpensesText = {
  label: "Future expenses",
  noTotal: "No estimates yet",
  loading: "Loading future expenses…",
  loadError: "Could not load future expenses.",
  retry: "Try again",
  retrying: "Trying again…",
  unestimated: (tasks, subtasks) =>
    `${[
      tasks > 0 ? `${tasks} ${tasks === 1 ? "task" : "tasks"}` : "",
      subtasks > 0 ? `${subtasks} ${subtasks === 1 ? "subtask" : "subtasks"}` : "",
    ]
      .filter(Boolean)
      .join(" and ")} without an estimate`,
  unestimatedRule: "They are not counted in future expenses until they have an estimate.",
  addEstimate: "Add estimate",
  addEstimateFor: (title, taskTitle) =>
    taskTitle === undefined
      ? `Add estimate for “${title}”`
      : `Add estimate for “${title}” in “${taskTitle}”`,
  estimateFor: (title) => `Estimate for “${title}”`,
  amount: "Amount",
  upTo: "up to",
  optional: "(optional)",
  currency: "zł",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  unexpectedError: "Something went wrong. Try again.",
};
