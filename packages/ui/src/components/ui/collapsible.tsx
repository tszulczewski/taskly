import { ChevronRight } from "lucide-react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/** Shows and hides a part of the screen in place, e.g. quick-add "Details" or an expanded row (Q2). */
export function Collapsible(props: ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root {...props} data-slot="collapsible" />;
}

/**
 * The control that opens and closes the content. Use `asChild` with a Button or TextAction; it
 * gets `aria-expanded` and `aria-controls`.
 */
export function CollapsibleTrigger({
  className,
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      {...props}
      data-slot="collapsible-trigger"
      className={cn("group/trigger", className)}
    />
  );
}

/** The arrow inside a trigger: points right when closed and down when open (Luki 7). */
export function CollapsibleIndicator({ className, ...props }: ComponentProps<typeof ChevronRight>) {
  return (
    <ChevronRight
      aria-hidden="true"
      {...props}
      className={cn(
        "size-icon shrink-0 stroke-icon transition-transform duration-base ease-standard",
        "group-data-[state=open]/trigger:rotate-90",
        className,
      )}
    />
  );
}

/** The part that opens; it slides open over `motion-duration-base` (Luki 8). */
export function CollapsibleContent({
  className,
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      {...props}
      data-slot="collapsible-content"
      className={cn("collapsible-content", className)}
    />
  );
}
