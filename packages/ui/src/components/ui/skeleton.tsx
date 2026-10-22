import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/**
 * A static placeholder bar while content loads: `color-surface-raised`, no shimmer (Luki 8). One
 * text line high by default; size it with token utilities. Hidden from assistive tech; the region
 * that loads says "Loading…" itself (see the docs).
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      {...props}
      data-slot="skeleton"
      className={cn("h-lh rounded-control bg-raised", className)}
    />
  );
}
