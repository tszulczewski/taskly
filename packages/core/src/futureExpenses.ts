import type { FutureExpenses, TaskView } from "./schemas";

/**
 * Future expenses of a list (R17): the sum of the minimums and of the maximums of its open main
 * tasks' estimates, in integer grosze. Each view's `estimate` is already the effective one from
 * `rollUpEstimate`, so a task with subtasks counts their sum once and a subtask is never counted
 * a second time (R12, R15); its completed subtasks still count (R14). Completed tasks and tasks
 * without an estimate are left out (R09, R10, R13); `total` is null when nothing was added.
 */
export function futureExpenses(views: readonly TaskView[]): FutureExpenses {
  let minGrosze = 0;
  let maxGrosze = 0;
  let counted = 0;
  for (const view of views) {
    if (view.completed || view.estimate === null) continue;
    minGrosze += view.estimate.minGrosze;
    maxGrosze += view.estimate.maxGrosze;
    counted += 1;
  }
  return { total: counted === 0 ? null : { minGrosze, maxGrosze } };
}
