import type { FutureExpenses, TaskView, UnestimatedItem } from "./schemas";

/** What an open main task leaves unpriced (D27): itself without subtasks, else its open subtasks. */
function unestimatedOf(view: TaskView): UnestimatedItem[] {
  // A task with subtasks takes its amounts from them, so it is never listed itself (R12).
  if (view.subtasks.length === 0) {
    return view.estimate === null ? [{ id: view.id, title: view.title }] : [];
  }
  return view.subtasks
    .filter((subtask) => !subtask.completed && subtask.estimate === null)
    .map((subtask) => ({ id: subtask.id, title: subtask.title, taskTitle: view.title }));
}

/**
 * Future expenses of a list (R17): the sum of the minimums and of the maximums of its open main
 * tasks' estimates, in integer grosze. Each view's `estimate` is already the effective one from
 * `rollUpEstimate`, so a task with subtasks counts their sum once and a subtask is never counted
 * a second time (R12, R15); its completed subtasks still count (R14). Completed tasks and tasks
 * without an estimate are left out (R09, R10, R13); `total` is null when nothing was added.
 * `unestimated` names, in the views' order, what still needs a price: open tasks without subtasks
 * and without an estimate, and the open subtasks without one of open tasks (R10, R13, D27).
 */
export function futureExpenses(views: readonly TaskView[]): FutureExpenses {
  let minGrosze = 0;
  let maxGrosze = 0;
  let counted = 0;
  const unestimated: UnestimatedItem[] = [];
  for (const view of views) {
    if (view.completed) continue;
    unestimated.push(...unestimatedOf(view));
    if (view.estimate === null) continue;
    minGrosze += view.estimate.minGrosze;
    maxGrosze += view.estimate.maxGrosze;
    counted += 1;
  }
  return { total: counted === 0 ? null : { minGrosze, maxGrosze }, unestimated };
}
