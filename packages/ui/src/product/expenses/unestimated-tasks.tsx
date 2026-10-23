"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
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
import { useForm, type FieldErrors, type SubmitResult } from "../../lib/use-form";
import { defaultExpensesText, type ExpensesText } from "./text";

export type EstimateField = "min" | "max";
/** The amounts as typed; the app parses them (`parsePlnToGrosze`). */
export type EstimateValues = Record<EstimateField, string>;

export interface UnestimatedTask {
  id: string;
  title: string;
}

export interface UnestimatedTasksProps {
  /** Open main tasks without an estimate, in list order (R08, R10). */
  tasks: UnestimatedTask[];
  /** The app's rules for the two amounts (the shared Zod schema). */
  validate: (values: EstimateValues) => FieldErrors<EstimateField>;
  /** Saves the estimate; on `{ ok: true }` the form stays busy until the task leaves `tasks`. */
  onAddEstimate: (id: string, values: EstimateValues) => Promise<SubmitResult<EstimateField>>;
  /** The last task got its estimate and this list is gone; the parent takes focus. */
  onEmptied?: () => void;
  text?: Partial<ExpensesText>;
}

function EstimateForm({
  title,
  validate,
  onSubmit,
  onCancel,
  t,
}: {
  title: string;
  validate: UnestimatedTasksProps["validate"];
  onSubmit: (values: EstimateValues) => Promise<SubmitResult<EstimateField>>;
  onCancel: () => void;
  t: ExpensesText;
}) {
  const form = useForm<EstimateField>({
    initialValues: { min: "", max: "" },
    validate,
    onSubmit,
    unexpectedError: t.unexpectedError,
  });
  const amount = (name: EstimateField, label: string, autoFocus: boolean) => (
    <FormField label={label} error={form.errors[name]} className="flex-1">
      {(control) => (
        <Input
          {...control}
          {...form.field(name)}
          inputMode="decimal"
          suffix={t.currency}
          autoFocus={autoFocus}
        />
      )}
    </FormField>
  );
  return (
    <form
      {...form.formProps}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape" && !form.pending) onCancel();
      }}
      className="flex flex-col gap-group"
    >
      {form.formError ? <Alert title={form.formError} /> : null}
      <fieldset className="flex min-w-0 flex-col gap-inline">
        <legend className="mb-inline font-strong break-words">{t.estimateFor(title)}</legend>
        <div className="flex gap-group">
          {amount("min", t.min, true)}
          {amount("max", t.max, false)}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-group">
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

/**
 * The collapsed line under future expenses, "3 tasks without an estimate" (Luki 9, R02.10, R10).
 * Open, it says why they are not counted and offers "Add estimate" for each; the amounts are
 * typed in place (decision I4) and the task leaves the list once it has them.
 */
export function UnestimatedTasks({
  tasks,
  validate,
  onAddEstimate,
  onEmptied,
  text,
}: UnestimatedTasksProps) {
  const t = { ...defaultExpensesText, ...text };
  const [adding, setAdding] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // After Cancel focus returns to that task's "Add estimate"; after a save, once the task has left
  // the list, to the next one (or the parent, when none is left).
  const focusRequest = useRef<{ id: string } | { index: number } | null>(null);

  useLayoutEffect(() => {
    const request = focusRequest.current;
    if (request === null) return;
    focusRequest.current = null;
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-add-estimate]") ?? [],
    );
    const target =
      "id" in request
        ? buttons.find((button) => button.dataset.addEstimate === request.id)
        : buttons[Math.min(request.index, buttons.length - 1)];
    if (target) target.focus();
    else onEmptied?.();
  }, [adding, tasks, onEmptied]);

  if (tasks.length === 0) return null;

  return (
    <Collapsible data-slot="unestimated-tasks">
      <CollapsibleTrigger asChild>
        <TextAction>
          <CollapsibleIndicator />
          {t.unestimated(tasks.length)}
        </TextAction>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-group pt-inline">
          <p className="max-w-measure text-muted">{t.unestimatedRule}</p>
          <ul ref={listRef} aria-label={t.unestimated(tasks.length)} className="flex flex-col">
            {tasks.map((task, index) => (
              <li key={task.id} className="border-t border-divider py-row-y first:border-t-0">
                {adding === task.id ? (
                  <EstimateForm
                    title={task.title}
                    validate={validate}
                    onSubmit={async (values) => {
                      const result = await onAddEstimate(task.id, values);
                      // The form stays busy until the task leaves the list; focus then moves on.
                      if (result.ok) focusRequest.current = { index };
                      return result;
                    }}
                    onCancel={() => {
                      focusRequest.current = { id: task.id };
                      setAdding(null);
                    }}
                    t={t}
                  />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-x-group">
                    <span className="min-w-0 break-words">{task.title}</span>
                    <TextAction
                      data-add-estimate={task.id}
                      aria-label={t.addEstimateFor(task.title)}
                      onClick={() => setAdding(task.id)}
                    >
                      {t.addEstimate}
                    </TextAction>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
