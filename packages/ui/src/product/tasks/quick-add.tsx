"use client";

import { useState } from "react";
import { FormField } from "../../components/form-field";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { TextAction } from "../../components/ui/text-action";
import { cn } from "../../lib/cn";
import { useForm } from "../../lib/use-form";
import { defaultTaskText, type TaskText } from "./text";
import { DescriptionField, EstimateFields } from "./task-fields";
import { emptyTaskValues, type TaskField, type TaskFieldErrors, type TaskSubmit } from "./types";

export interface QuickAddProps {
  /** Field messages from the shared schema; only the title is required (spec E01, R10). */
  validate: (values: Record<TaskField, string>) => TaskFieldErrors;
  /** Adds the task. On `{ ok: true }` the form clears and focus goes back to the title. */
  onSubmit: TaskSubmit;
  /** A subtask under a task: labelled "New subtask", with Cancel; Escape cancels too. */
  onCancel?: () => void;
  /** Put focus in the title on mount, e.g. on an empty list (spec E01, Empty). */
  autoFocus?: boolean;
  className?: string;
  text?: Partial<TaskText>;
}

/**
 * From 640px the estimate's legend sits above its labels, one line higher than the title's label;
 * this keeps the title and the Add button level with the amount fields.
 */
function LineSpace() {
  return <span aria-hidden="true" className="hidden h-lh wide:block" />;
}

/**
 * Captures a task in one row: the title, the amounts and "Add" (spec E01, discovery prototype C1),
 * so the estimate goes in when the task is added; only the title is required. The description sits
 * behind its toggle. After an add the form is ready for the next one.
 */
export function QuickAdd({
  validate,
  onSubmit,
  onCancel,
  autoFocus,
  className,
  text,
}: QuickAddProps) {
  const t = { ...defaultTaskText, ...text };
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const form = useForm<TaskField>({
    initialValues: emptyTaskValues,
    validate,
    onSubmit: async (values) => {
      const result = await onSubmit(values);
      if (result.ok) setDescriptionOpen(false);
      return result;
    },
    unexpectedError: t.unexpectedError,
    resetOnSuccess: true,
  });

  return (
    <form
      {...form.formProps}
      data-slot="quick-add"
      className={cn("flex flex-col gap-group", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onCancel && !form.pending) onCancel();
      }}
    >
      {form.formError ? <Alert title={form.formError} /> : null}
      <div className="flex flex-col gap-group wide:flex-row wide:items-start">
        <div className="flex min-w-0 flex-col gap-inline wide:flex-1">
          <LineSpace />
          <FormField label={onCancel ? t.newSubtask : t.newTask} error={form.errors.title}>
            {(control) => <Input {...control} {...form.field("title")} autoFocus={autoFocus} />}
          </FormField>
        </div>
        <EstimateFields form={form} text={t} className="wide:w-2/5" />
        <div className="flex flex-col gap-inline">
          <LineSpace />
          <LineSpace />
          <Button type="submit" variant="primary" loading={form.pending} className="self-start">
            {form.pending ? t.adding : t.add}
          </Button>
        </div>
      </div>
      <DescriptionField
        form={form}
        text={t}
        open={descriptionOpen}
        onOpenChange={setDescriptionOpen}
        actions={
          onCancel ? (
            <TextAction tone="muted" disabled={form.pending} onClick={onCancel}>
              {t.cancel}
            </TextAction>
          ) : null
        }
      />
    </form>
  );
}
