import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

type RootProps = ComponentProps<typeof CheckboxPrimitive.Root>;

export interface CheckboxProps extends Omit<
  RootProps,
  "checked" | "defaultChecked" | "onCheckedChange"
> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * A yes/no choice, e.g. marking a task complete. The visible box is 20px; the clickable area is
 * 44 × 44 px (T10, K1). Name it with a Label (`htmlFor`) or `aria-label`.
 */
export function Checkbox({ className, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      {...props}
      data-slot="checkbox"
      onCheckedChange={(state) => onCheckedChange?.(state === true)}
      className={cn(
        "group inline-flex size-touch shrink-0 items-center justify-center rounded-control outline-none",
        "disabled:pointer-events-none disabled:opacity-disabled",
        className,
      )}
    >
      <span
        data-slot="checkbox-box"
        className={cn(
          "flex size-checkbox items-center justify-center rounded-checkbox border border-control bg-list text-on-action",
          "transition-colors duration-quick ease-standard group-focus-visible:focus-ring",
          "group-data-[state=unchecked]:group-hover:bg-raised group-data-[state=unchecked]:group-active:bg-raised",
          "group-data-[state=checked]:border-action group-data-[state=checked]:bg-action",
          "group-data-[state=checked]:group-hover:border-action-hover group-data-[state=checked]:group-hover:bg-action-hover",
          "group-data-[state=checked]:group-active:bg-action-hover",
        )}
      >
        <CheckboxPrimitive.Indicator className="flex size-full items-center justify-center">
          <Check aria-hidden="true" className="size-full stroke-icon" />
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  );
}
