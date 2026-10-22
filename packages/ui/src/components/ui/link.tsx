import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export interface LinkProps extends ComponentProps<"a"> {
  /** Render the single child (e.g. the app's router link) with the link styles instead of `<a>`. */
  asChild?: boolean;
}

/** Goes somewhere: another page or another site. Always underlined, so colour is not the only cue. */
export function Link({ className, asChild = false, ...props }: LinkProps) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      {...props}
      data-slot="link"
      className={cn(
        "rounded-control font-strong text-action underline outline-none focus-visible:focus-ring",
        className,
      )}
    />
  );
}
