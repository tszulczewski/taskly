import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { overlayPlacement, overlaySurfaceClass } from "./overlay";

/** A small panel of controls next to its trigger, e.g. choosing places for a task (E02). */
export function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />;
}

/** Use `asChild` with a Button or TextAction. */
export function PopoverTrigger(props: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger {...props} data-slot="popover-trigger" />;
}

/** Name it with `aria-label` (or `aria-labelledby` pointing at a heading inside). */
export function PopoverContent({
  className,
  align = "start",
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        {...overlayPlacement()}
        {...props}
        align={align}
        data-slot="popover-content"
        className={cn(
          overlaySurfaceClass,
          "flex max-w-overlay flex-col gap-group p-inset outline-none",
          className,
        )}
      />
    </PopoverPrimitive.Portal>
  );
}

/**
 * Places the popover next to an element that does not open it, e.g. the row's "…" when a menu
 * item opens the popover (E02 places). Use `asChild`.
 */
export function PopoverAnchor(props: ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor {...props} data-slot="popover-anchor" />;
}
