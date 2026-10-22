import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface AlertProps extends Omit<ComponentProps<"div">, "title"> {
  /** What happened, in `color-text-danger` (P3, C7). Always given. */
  title: ReactNode;
  /** Optional way out, e.g. a "Try again" Button. */
  action?: ReactNode;
}

/**
 * A problem that concerns the whole form or screen, e.g. "Could not sign out. Try again."
 * Announced at once (`role="alert"`). Errors of a single field belong to FormField. The title says
 * what happened in the danger colour; the optional message (children) says what to do in normal
 * text (C7).
 */
export function Alert({ className, title, action, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      {...props}
      data-slot="alert"
      className={cn(
        "flex flex-col items-start gap-group rounded-surface bg-raised p-inset text-body text-primary",
        className,
      )}
    >
      <p className="font-strong text-danger">{title}</p>
      {children ? <div>{children}</div> : null}
      {action}
    </div>
  );
}
