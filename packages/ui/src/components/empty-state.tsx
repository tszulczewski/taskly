import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface EmptyStateProps extends Omit<ComponentProps<"div">, "title"> {
  /** Why it is empty, said plainly: "No tasks yet." (Luki 5, tokens rule 13). */
  title: ReactNode;
  /** The next step: "Add the first thing you need to do." */
  children?: ReactNode;
  /** Optional action when the next step is not already on screen. */
  action?: ReactNode;
}

/**
 * What the user sees where content will be, before there is any. Left-aligned words, no picture
 * or icon (Luki 7, A02).
 */
export function EmptyState({ className, title, children, action, ...props }: EmptyStateProps) {
  return (
    <div
      {...props}
      data-slot="empty-state"
      className={cn("flex flex-col items-start gap-group p-inset text-body", className)}
    >
      <p className="font-strong text-primary">{title}</p>
      {children ? <div className="max-w-measure text-muted">{children}</div> : null}
      {action}
    </div>
  );
}
