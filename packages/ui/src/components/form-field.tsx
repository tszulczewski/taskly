"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Label } from "./ui/label";

/** Props FormField hands to its control, so label, hint and error are announced with it. */
export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
}

export interface FormFieldProps {
  /** Always visible; a placeholder is an example, never the name of the field. */
  label: ReactNode;
  /** Help that is needed before typing, e.g. "At least 10 characters". */
  hint?: ReactNode;
  /** What is wrong and how to fix it. Setting it marks the control invalid. */
  error?: ReactNode;
  /** Marks the field as optional in words (K5); fields without it are required. */
  optional?: boolean;
  /** The optional marker, e.g. "(opcjonalnie)" in Polish. */
  optionalText?: string;
  /** Id for the control; generated when omitted. */
  id?: string;
  className?: string;
  /** Renders the control with the props it needs: `{(field) => <Input {...field} />}`. */
  children: (control: FieldControlProps) => ReactNode;
}

/** A label, the control, an optional hint and an error message, wired together for assistive tech. */
export function FormField({
  label,
  hint,
  error,
  optional = false,
  optionalText = "(optional)",
  id,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const hasError = error !== undefined && error !== null && error !== false;
  const describedBy = [hint ? hintId : null, hasError ? errorId : null].filter(Boolean).join(" ");

  return (
    <div data-slot="form-field" className={cn("flex min-w-0 flex-col gap-inline", className)}>
      <Label htmlFor={controlId}>
        {label}
        {optional ? <span className="text-muted"> {optionalText}</span> : null}
      </Label>
      {children({
        id: controlId,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": hasError ? true : undefined,
        "aria-required": optional ? undefined : true,
      })}
      {hint ? (
        <p id={hintId} className="text-meta text-muted">
          {hint}
        </p>
      ) : null}
      {hasError ? (
        <p id={errorId} className="text-meta text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
