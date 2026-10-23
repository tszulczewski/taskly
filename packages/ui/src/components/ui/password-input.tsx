"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { fieldFrameClass, fieldInputClass, type InputProps } from "./input";

export interface PasswordInputProps extends Omit<InputProps, "type" | "suffix"> {
  /** Name of the show-password button; it stays the same, `aria-pressed` says the state. */
  toggleLabel?: string;
}

/**
 * A password field with a show-password button inside it (sign-in spec, Q10). The password starts
 * hidden and is hidden again when its form is submitted.
 */
export function PasswordInput({
  className,
  toggleLabel = "Show password",
  id,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  useEffect(() => {
    const form = toggleRef.current?.form;
    if (!form) return;
    const hide = () => setVisible(false);
    form.addEventListener("submit", hide);
    return () => form.removeEventListener("submit", hide);
  }, []);

  return (
    <div data-slot="password-input" className={cn("relative w-full min-w-0", className)}>
      <div className={cn(fieldFrameClass, "pr-touch")}>
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          data-slot="input"
          className={fieldInputClass}
        />
      </div>
      <button
        ref={toggleRef}
        type="button"
        aria-label={toggleLabel}
        aria-pressed={visible}
        aria-controls={inputId}
        disabled={props.disabled}
        onClick={() => setVisible((v) => !v)}
        className={cn(
          "absolute inset-y-0 right-0 inline-flex w-touch items-center justify-center rounded-control text-muted",
          "outline-none hover:text-primary active:text-primary focus-visible:focus-ring-field",
          "disabled:pointer-events-none [&_svg]:size-icon [&_svg]:stroke-icon",
        )}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}
