"use client";

import { useState } from "react";
import { FormField } from "../../components/form-field";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useForm } from "../../lib/use-form";
import { defaultTaskText, type TaskText } from "./text";
import { DescriptionField, EstimateFields } from "./task-fields";
import type { TaskField, TaskFieldErrors, TaskFormValues, TaskSubmit } from "./types";

export interface TaskFormProps {
  /** The task as it is now; the form opens prefilled (spec E01, Edit). */
  initialValues: TaskFormValues;
  /** Field messages from the shared schema (`taskFields`, `estimateFromAmounts`). */
  validate: (values: TaskFormValues) => TaskFieldErrors;
  /** Saves; resolve `{ ok: true }` and the row closes the form. Clearing both amounts removes the estimate. */
  onSubmit: TaskSubmit;
  /** Closes the form without saving; Escape does the same. */
  onCancel: () => void;
  /**
   * A task with subtasks: its estimate is their sum (R12), shown here as text instead of the
   * amount fields, with null when none of them has one. The amounts are then sent unchanged.
   */
  summedEstimate?: string | null;
  /** Put focus in the title when the form opens, as it does when the row switches to it. */
  autoFocus?: boolean;
  text?: Partial<TaskText>;
}

/**
 * Edits a task or subtask in place of its row: title, estimate and description, in the order of
 * quick add. The description is open when the task has one, so nothing set is hidden.
 */
export function TaskForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
  summedEstimate,
  autoFocus = true,
  text,
}: TaskFormProps) {
  const t = { ...defaultTaskText, ...text };
  const [descriptionOpen, setDescriptionOpen] = useState(initialValues.description !== "");
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
      {summedEstimate === undefined ? (
        <EstimateFields form={form} text={t} />
      ) : (
        // Text, not disabled fields: a disabled field looks editable and screen readers skip it.
        <div data-slot="summed-estimate" className="flex flex-col gap-inline">
          <p className="flex flex-wrap items-baseline gap-x-group">
            <span className="text-muted">{t.sumOfSubtasks}</span>
            {summedEstimate === null ? (
              <span className="text-muted">{t.sumNone}</span>
            ) : (
              <span className="numeric font-strong">{summedEstimate}</span>
            )}
          </p>
          <p className="text-meta text-muted">{t.sumHint}</p>
        </div>
      )}
      <DescriptionField
        form={form}
        text={t}
        open={descriptionOpen}
        onOpenChange={setDescriptionOpen}
      />
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
