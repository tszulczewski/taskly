import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export interface RadioGroupProps extends ComponentProps<typeof RadioGroupPrimitive.Root> {
  /**
   * list: one option per line, each a RadioGroupItem with a Label. segmented: two or three short
   * options side by side, each a RadioGroupSegment, e.g. the Dark / Light theme switch (P4).
   */
  variant?: "list" | "segmented";
}

/** One choice out of a few options that are all visible at once. Name the group with `aria-label`. */
export function RadioGroup({ className, variant = "list", ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      {...props}
      data-slot="radio-group"
      data-variant={variant}
      className={cn(
        variant === "list"
          ? "flex flex-col"
          : "inline-flex max-w-full rounded-control border border-control bg-list",
        className,
      )}
    />
  );
}

/** A round option for `variant="list"`: 20px circle in a `touch-target-min` square. Pair it with a Label. */
export function RadioGroupItem({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      {...props}
      data-slot="radio-group-item"
      className={cn(
        "group inline-flex size-touch shrink-0 items-center justify-center rounded-control outline-none",
        "disabled:pointer-events-none disabled:opacity-disabled",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-checkbox items-center justify-center rounded-full border border-control bg-list",
          "transition-colors duration-quick ease-standard group-focus-visible:focus-ring",
          "group-hover:bg-raised group-active:bg-raised group-data-[state=checked]:border-action",
        )}
      >
        <RadioGroupPrimitive.Indicator className="size-radio-dot rounded-full bg-action" />
      </span>
    </RadioGroupPrimitive.Item>
  );
}

/**
 * A segment for `variant="segmented"`: its children are the visible name (text, optionally with
 * an icon). The selected segment is raised and bold, so the state is not shown by colour alone.
 */
export function RadioGroupSegment({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      {...props}
      data-slot="radio-group-segment"
      className={cn(
        "inline-flex min-h-control min-w-0 flex-1 items-center justify-center gap-inline rounded-control px-control-x",
        "font-base text-body leading-body font-regular text-muted outline-none focus-visible:focus-ring",
        "transition-colors duration-quick ease-standard hover:text-primary active:text-primary",
        "data-[state=checked]:bg-raised data-[state=checked]:font-strong data-[state=checked]:text-primary",
        "disabled:pointer-events-none disabled:opacity-disabled",
        "[&_svg]:size-icon [&_svg]:shrink-0 [&_svg]:stroke-icon",
        className,
      )}
    />
  );
}
