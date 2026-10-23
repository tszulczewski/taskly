"use client";

import { FormField } from "../../components/form-field";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useForm } from "../../lib/use-form";
import { defaultTaskText, type TaskText } from "./text";
import { TaskFields } from "./task-fields";
import type { TaskField, TaskFieldErrors, TaskFormValues, TaskSubmit } from "./types";

export interface TaskFormProps {
  /** The task as it is now; the form opens prefilled (spec E01, Edit). */
  initialValues: TaskFormValues;
  /** Field messages from the shared schema (`taskFields`, `parsePlnToGrosze`). */
  validate: (values: TaskFormValues) => TaskFieldErrors;
  /** Saves; resolve `{ ok: true }` and the row closes the form. Clearing both amounts removes the estimate. */
  onSubmit: TaskSubmit;
  /** Closes the form without saving; Escape does the same. */
  onCancel: () => void;
  /** Put focus in the title when the form opens, as it does when the row switches to it. */
  autoFocus?: boolean;
  text?: Partial<TaskText>;
}

/** Edits a task or subtask in place of its row: title, description and the min–max estimate. */
export function TaskForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
  autoFocus = true,
  text,
}: TaskFormProps) {
  const t = { ...defaultTaskText, ...text };
  const form = useForm<TaskField>({
    initialValues,
    validate,
    onSubmit,
    unexpectedError: t.unexpectedError,
  });

  return (
    <form
      {...form.formProps}
      aria-label={t.editTask(initialValues.title)}
      data-slot="task-form"
      className="flex flex-col gap-between-groups"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !form.pending) onCancel();
      }}
    >
      {form.formError ? <Alert title={form.formError} /> : null}
      <FormField label={t.title} error={form.errors.title}>
        {(control) => <Input {...control} {...form.field("title")} autoFocus={autoFocus} />}
      </FormField>
      <TaskFields form={form} text={t} />
      <div className="flex flex-col gap-group wide:flex-row">
        <Button type="submit" variant="primary" loading={form.pending}>
          {form.pending ? t.saving : t.save}
        </Button>
        <Button disabled={form.pending} onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
