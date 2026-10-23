import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ReactElement } from "react";
import { cn } from "../../lib/cn";
import { overlayPlacement } from "./overlay";

type IconButtonElement = ReactElement<{ "aria-label": string }>;

export interface TooltipProps {
  /** One icon button. Its `aria-label` is the tooltip text, so the two can never differ (P4). */
  children: IconButtonElement;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * A visible caption for an icon button on hover and keyboard focus. Only a second copy of the
 * button's name (P4): never put information the user needs to act in a tooltip.
 */
export function Tooltip({ children, side = "top" }: TooltipProps) {
  const label = children.props["aria-label"];
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        {/*
          Radix adds aria-describedby to its trigger. The text is already the button's name, so the
          trigger is a wrapper without a role: screen readers ignore its description and read the
          name once. Focus and hover on the button bubble to the wrapper.
        */}
        <TooltipPrimitive.Trigger asChild>
          <span data-slot="tooltip-trigger" className="inline-flex">
            {children}
          </span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            {...overlayPlacement()}
            side={side}
            data-slot="tooltip"
            aria-hidden="true"
            className={cn(
              "max-w-overlay rounded-control border border-control bg-raised px-group py-inline",
              "font-base text-meta text-primary",
            )}
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
