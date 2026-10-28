import { cn } from "../../lib/cn";

export interface EstimateRangeProps {
  /**
   * As formatted by the app: a range, "1 200–1 500 zł", or one amount, "500 zł", for an exact
   * price (R18); null when the task has no estimate.
   */
  value: string | null;
  emptyText?: string;
  className?: string;
}

/**
 * A task's estimate in tabular figures and the strong weight (Luki 1, tokens rule 5), or
 * "No estimate" in muted text (spec E01, R02.5). For a task with subtasks it is their sum (R12),
 * shown the same way.
 */
export function EstimateRange({ value, emptyText = "No estimate", className }: EstimateRangeProps) {
  return value === null ? (
    <span data-slot="estimate-range" className={cn("text-muted", className)}>
      {emptyText}
    </span>
  ) : (
    <span
      data-slot="estimate-range"
      className={cn("numeric font-strong whitespace-nowrap", className)}
    >
      {value}
    </span>
  );
}
