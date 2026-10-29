import { parsePlnToGrosze } from "./money";
import { type Estimate, estimateGroszeSchema, estimateMessages, estimateSchema } from "./schemas";

export type AmountField = "amount" | "upTo";

export type EstimateFromAmounts =
  | { ok: true; estimate: Estimate | null }
  | { ok: false; fieldErrors: Partial<Record<AmountField, string>> };

/** One field's text → grosze, `null` when empty, or the message to show under it. */
function readAmount(text: string): { grosze: number | null } | { error: string } {
  if (text.trim() === "") return { grosze: null };
  const grosze = parsePlnToGrosze(text);
  if (grosze === null) return { error: estimateMessages.amount };
  const checked = estimateGroszeSchema.safeParse(grosze);
  return checked.success ? { grosze } : { error: checked.error.issues[0]!.message };
}

/**
 * The form's "Amount" and "up to" fields → an estimate (R18). Both empty → none; one filled (either)
 * → an exact price, min = max; both → a range. Each error goes on the field holding the bad text;
 * amount above "up to" goes on "up to".
 */
export function estimateFromAmounts(amount: string, upTo: string): EstimateFromAmounts {
  const low = readAmount(amount);
  const high = readAmount(upTo);
  if ("error" in low || "error" in high) {
    return {
      ok: false,
      fieldErrors: {
        ...("error" in low && { amount: low.error }),
        ...("error" in high && { upTo: high.error }),
      },
    };
  }
  const min = low.grosze ?? high.grosze;
  const max = high.grosze ?? low.grosze;
  if (min === null || max === null) return { ok: true, estimate: null };
  const checked = estimateSchema.safeParse({ minGrosze: min, maxGrosze: max });
  if (!checked.success)
    return { ok: false, fieldErrors: { upTo: checked.error.issues[0]!.message } };
  return { ok: true, estimate: checked.data };
}

/**
 * A task's effective estimate (R12–R14). Without subtasks it is the task's own typed figure. With
 * subtasks, the own figure is ignored (it stays in the row, R15) and the estimate is the sum of the
 * minimums and of the maximums of the subtasks that have one, or null when none has. Takes no
 * status: completed subtasks count (R14). The sum may exceed MAX_ESTIMATE_GROSZE.
 */
export function rollUpEstimate(
  own: Estimate | null,
  subtasks: readonly (Estimate | null)[],
): { estimate: Estimate | null; unestimatedSubtasks: number } {
  if (subtasks.length === 0) return { estimate: own, unestimatedSubtasks: 0 };
  let minGrosze = 0;
  let maxGrosze = 0;
  let estimated = 0;
  for (const subtask of subtasks) {
    if (subtask === null) continue;
    minGrosze += subtask.minGrosze;
    maxGrosze += subtask.maxGrosze;
    estimated += 1;
  }
  return {
    estimate: estimated === 0 ? null : { minGrosze, maxGrosze },
    unestimatedSubtasks: subtasks.length - estimated,
  };
}
