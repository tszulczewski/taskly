"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

export type FieldErrors<F extends string> = Partial<Record<F, string>>;

/** What the server said about a submitted form. Field errors are shown under their fields. */
export type SubmitResult<F extends string> =
  { ok: true } | { ok: false; fieldErrors?: FieldErrors<F>; formError?: string };

export interface UseFormOptions<F extends string> {
  /** Every field, in screen order; the order decides which error gets focus first. */
  initialValues: Record<F, string>;
  /** The app's rules (the shared Zod schema); returns a message per invalid field. */
  validate: (values: Record<F, string>) => FieldErrors<F>;
  /** Sends the form. Resolving `{ ok: true }` is the only way the form counts as done. */
  onSubmit: (values: Record<F, string>) => Promise<SubmitResult<F>>;
  /** Shown when `onSubmit` throws, e.g. no network. */
  unexpectedError: string;
  /**
   * Quick capture: after the server confirmed, clear the form and put focus back in the first
   * field for the next entry (spec E01, "After an add"). Default: stay busy until the page changes.
   */
  resetOnSuccess?: boolean;
}

const hasErrors = <F extends string>(errors: FieldErrors<F>) => Object.values(errors).some(Boolean);

/**
 * The form pattern: validate a field when the user leaves it after typing and the whole form on
 * submit, focus the first invalid field, keep what was typed, block a second submit while one is
 * running, and treat the form as done only when the server confirms (sign-in spec, UI/UX).
 */
export function useForm<F extends string>({
  initialValues,
  validate,
  onSubmit,
  unexpectedError,
  resetOnSuccess = false,
}: UseFormOptions<F>) {
  const [initial] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const [edited, setEdited] = useState<ReadonlySet<F>>(new Set());
  const [errors, setErrors] = useState<FieldErrors<F>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const focusRequest = useRef<F | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const fields = Object.keys(initialValues) as F[];

  // Focus moves in the same commit that shows the errors (a passive effect could run after the
  // message is painted and read), so the field is announced together with its message.
  useLayoutEffect(() => {
    const name = focusRequest.current;
    if (name === undefined) return;
    focusRequest.current = undefined;
    const control = formRef.current?.elements.namedItem(name);
    if (control instanceof HTMLElement) control.focus();
  }, [errors]);

  // With Cache Components a page the user left is hidden (React Activity), not unmounted, and the
  // same instance is shown on the next visit, e.g. `/sign-in` after signing out. Hiding is the page
  // change that ends a finished form's busy state, so it comes back idle and empty instead of
  // spinning and still holding what was sent (a password).
  useLayoutEffect(() => {
    if (status !== "done") return;
    return () => {
      setValues(initial);
      setEdited(new Set());
      setStatus("idle");
    };
  }, [status, initial]);

  const showErrors = (found: FieldErrors<F>) => {
    setErrors(found);
    focusRequest.current = fields.find((name) => found[name]);
  };

  const field = (name: F) => ({
    name,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = { ...values, [name]: event.target.value };
      setValues(next);
      setEdited((current) => new Set(current).add(name));
      // An error already shown clears as soon as the value becomes valid.
      if (errors[name]) setErrors({ ...errors, [name]: validate(next)[name] });
    },
    // Tabbing through an untouched field does not show an error before the user typed anything.
    onBlur: () => {
      if (edited.has(name)) setErrors({ ...errors, [name]: validate(values)[name] });
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== "idle") return;
    const found = validate(values);
    setFormError(null);
    if (hasErrors(found)) {
      showErrors(found);
      return;
    }
    setErrors({});
    setStatus("pending");
    let result: SubmitResult<F>;
    try {
      result = await onSubmit(values);
    } catch {
      result = { ok: false, formError: unexpectedError };
    }
    if (result.ok && resetOnSuccess) {
      setValues(initialValues);
      setEdited(new Set());
      setStatus("idle");
      focusRequest.current = fields[0];
      setErrors({});
      return;
    }
    if (result.ok) {
      setStatus("done");
      return;
    }
    setStatus("idle");
    setFormError(result.formError ?? null);
    showErrors(result.fieldErrors ?? {});
  };

  return {
    formProps: { ref: formRef, onSubmit: handleSubmit, noValidate: true },
    field,
    errors,
    formError,
    /** True while sending and after the server confirmed, so the button cannot submit twice. */
    pending: status !== "idle",
  };
}
