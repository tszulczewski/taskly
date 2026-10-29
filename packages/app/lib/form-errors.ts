import type { FieldErrors } from "@taskly/ui";

interface FormIssue {
  readonly path: ReadonlyArray<PropertyKey>;
  readonly message: string;
}

/** The part of a Zod schema the forms use; kept structural so the app needs no `zod` import. */
export interface FormSchema {
  safeParse(
    value: unknown,
  ): { success: true } | { success: false; error: { issues: ReadonlyArray<FormIssue> } };
}

/** Runs the shared schema and keeps the first message of each field, for display under it. */
export function firstFieldErrors<F extends string>(
  schema: FormSchema,
  values: Record<F, string>,
): FieldErrors<F> {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const isField = (key: PropertyKey | undefined): key is F =>
    typeof key === "string" && Object.hasOwn(values, key);
  const errors: FieldErrors<F> = {};
  for (const { path, message } of result.error.issues) {
    const [field] = path;
    if (isField(field)) errors[field] ??= message;
  }
  return errors;
}
