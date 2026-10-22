import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export interface SurfaceProps extends ComponentProps<"div"> {
  /** none: rows inside bring their own padding (the task list). inset: free content (sign-in card). */
  padding?: "none" | "inset";
  /** Render the single child (e.g. `<ul>` or `<section>`) as the surface. */
  asChild?: boolean;
}

/**
 * The one continuous panel that holds a screen's content: one tone lighter than the page, a 1px
 * line and `radius-surface`, never a shadow (R01.1, R02.1). Never nest one Surface in another.
 */
export function Surface({ className, padding = "none", asChild = false, ...props }: SurfaceProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      {...props}
      data-slot="surface"
      className={cn(
        "rounded-surface border border-divider bg-list text-primary",
        padding === "inset" && "p-inset",
        className,
      )}
    />
  );
}
