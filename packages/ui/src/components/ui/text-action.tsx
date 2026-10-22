import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

const textActionVariants = cva(
  [
    "inline-flex min-h-touch items-center gap-inline rounded-control font-base text-body leading-body text-left",
    "outline-none focus-visible:focus-ring hover:underline active:underline",
    "disabled:pointer-events-none disabled:opacity-disabled",
  ],
  {
    variants: {
      tone: {
        action: "font-strong text-action",
        muted: "font-regular text-muted",
      },
    },
  },
);

export interface TextActionProps extends ComponentProps<"button"> {
  /**
   * action: a secondary action written as words, e.g. "Add estimate" (R02.3). muted: the prompt
   * that stands in for an empty value, e.g. "Add a description" (R01.4, tokens rule 6).
   */
  tone?: "action" | "muted";
}

/** A button that reads as text: for actions inside rows and lists where a framed button is too loud. */
export function TextAction({
  className,
  tone = "action",
  type = "button",
  ...props
}: TextActionProps) {
  return (
    <button
      {...props}
      type={type}
      data-slot="text-action"
      className={cn(textActionVariants({ tone }), className)}
    />
  );
}
