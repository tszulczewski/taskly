import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/** Several lines of free text, e.g. a task description. Pair it with FormField for a label. */
export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      rows={rows}
      data-slot="textarea"
      className={cn(
        "block w-full min-w-0 resize-y rounded-control border border-control bg-list px-field-x py-field-y",
        "font-base text-input-mobile wide:text-body leading-body text-primary placeholder:text-muted",
        "outline-none focus-visible:focus-ring-field focus-visible:border-action",
        "aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-disabled",
        className,
      )}
    />
  );
}
