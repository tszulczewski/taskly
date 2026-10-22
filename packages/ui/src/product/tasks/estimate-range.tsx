import { cn } from "../../lib/cn";

export interface EstimateRangeProps {
  /** The formatted range, e.g. "1 200–1 500 zł"; null when the task has no estimate. */
  value: string | null;
  emptyText?: string;
  className?: string;
}

/**
 * A task's estimate: a min–max range in tabular figures and the strong weight (Luki 1, tokens
 * rule 5), or "No estimate" in muted text (spec E01, R02.5).
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
