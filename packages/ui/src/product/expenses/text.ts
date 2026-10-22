/** Every string of the future expenses components; pass a `Partial` to translate. */
export interface ExpensesText {
  label: string;
  /** Shown instead of a range when no open task has an estimate. */
  noTotal: string;
  loading: string;
  loadError: string;
  retry: string;
  retrying: string;
  unestimated: (count: number) => string;
  /** The rule in one sentence, where it changes the number (Luki 5). */
  unestimatedRule: string;
  addEstimate: string;
  /** The accessible name of a task's "Add estimate"; it starts with the visible words. */
  addEstimateFor: (title: string) => string;
  estimateFor: (title: string) => string;
  min: string;
  max: string;
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
  unestimated: (count) =>
    count === 1 ? "1 task without an estimate" : `${count} tasks without an estimate`,
  unestimatedRule: "They are not counted in future expenses until they have an estimate.",
  addEstimate: "Add estimate",
  addEstimateFor: (title) => `Add estimate for “${title}”`,
  estimateFor: (title) => `Estimate for “${title}”`,
  min: "Min",
  max: "Max",
  currency: "zł",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  unexpectedError: "Something went wrong. Try again.",
};
