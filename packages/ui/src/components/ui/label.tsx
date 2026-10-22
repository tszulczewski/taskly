import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/** The visible name of a field. FormField renders it for you; use Label alone only next to a checkbox or radio. */
export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      {...props}
      data-slot="label"
      className={cn("font-base text-body leading-body font-regular text-primary", className)}
    />
  );
}
