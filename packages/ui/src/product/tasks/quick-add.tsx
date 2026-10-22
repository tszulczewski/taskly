"use client";

import { useState } from "react";
import { FormField } from "../../components/form-field";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { Input } from "../../components/ui/input";
import { TextAction } from "../../components/ui/text-action";
import { cn } from "../../lib/cn";
import { useForm } from "../../lib/use-form";
import { defaultTaskText, type TaskText } from "./text";
import { TaskFields } from "./task-fields";
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

const detailFields: TaskField[] = ["description", "min", "max"];

/**
 * Captures a task by its title alone: Enter or "Add" saves it, "Details" reveals the description
 * and the estimate (spec E01, R02.9, A03). After an add the form is ready for the next one.
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const form = useForm<TaskField>({
    initialValues: emptyTaskValues,
    validate,
    onSubmit,
    unexpectedError: t.unexpectedError,
    resetOnSuccess: true,
  });
  // A field with an error is never hidden: Details stays open until it is fixed.
  const detailsError = detailFields.some((name) => form.errors[name]);

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
      <FormField label={onCancel ? t.newSubtask : t.newTask} error={form.errors.title}>
        {/* The button sits beside the input, so a title error shows under both. */}
        {(control) => (
          <div className="flex gap-group">
            <Input {...control} {...form.field("title")} autoFocus={autoFocus} />
            <Button type="submit" variant="primary" loading={form.pending}>
              {form.pending ? t.adding : t.add}
            </Button>
          </div>
        )}
      </FormField>
      <Collapsible open={detailsOpen || detailsError} onOpenChange={setDetailsOpen}>
        <div className="flex flex-wrap items-center gap-group">
          <CollapsibleTrigger asChild>
            <TextAction tone="muted">
              <CollapsibleIndicator />
              {t.details}
            </TextAction>
          </CollapsibleTrigger>
          {onCancel ? (
            <TextAction tone="muted" disabled={form.pending} onClick={onCancel}>
              {t.cancel}
            </TextAction>
          ) : null}
        </div>
        <CollapsibleContent>
          <div className="flex flex-col gap-between-groups pt-group">
            <TaskFields form={form} text={t} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </form>
  );
}
