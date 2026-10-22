"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "../../lib/cn";

/** The bordered box around a text input; shared with PasswordInput. */
export const fieldFrameClass = [
  "flex min-h-control w-full min-w-0 items-center gap-group rounded-control border border-control bg-list px-field-x",
  "field-focus:focus-ring-field field-focus:border-action",
  "has-aria-invalid:border-danger has-disabled:opacity-disabled",
].join(" ");

/** The text input inside the frame: no border of its own, the frame draws it. */
export const fieldInputClass = [
  "min-w-0 flex-1 self-stretch bg-transparent font-base text-input-mobile wide:text-body text-primary",
  "outline-none placeholder:text-muted disabled:cursor-not-allowed",
].join(" ");

export interface InputProps extends ComponentProps<"input"> {
  /** A unit after the value, e.g. "zł" for amounts (spec E01). It is announced with the field. */
  suffix?: ReactNode;
  /** Classes for the frame (width, margins). The input inside takes the remaining space. */
  className?: string;
}

/** One line of text, a number or an e-mail address. Pair it with FormField for a label. */
export function Input({ className, suffix, ...props }: InputProps) {
  const suffixId = useId();
  const describedBy =
    suffix === undefined
      ? props["aria-describedby"]
      : [props["aria-describedby"], suffixId].filter(Boolean).join(" ");

  return (
    <div data-slot="input-frame" className={cn(fieldFrameClass, className)}>
      <input
        {...props}
        data-slot="input"
        aria-describedby={describedBy}
        className={cn(fieldInputClass, suffix !== undefined && "numeric")}
      />
      {suffix === undefined ? null : (
        <span id={suffixId} className="text-body text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}
