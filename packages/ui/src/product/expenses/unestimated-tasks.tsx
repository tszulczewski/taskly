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

export type EstimateField = "amount" | "upTo";
/** The amounts as typed; one filled field is an exact price (R18, `estimateFromAmounts`). */
export type EstimateValues = Record<EstimateField, string>;

export interface UnestimatedTask {
  id: string;
  title: string;
  /**
   * Set for a task whose subtasks all lack an estimate (R13): its estimate is their sum, so it
   * gets none of its own and the line says to price the subtasks instead.
   */
  subtasksWithoutEstimate?: number;
}

export interface UnestimatedTasksProps {
  /** Open main tasks without an estimate, in list order (R10, R13, R17). */
  tasks: UnestimatedTask[];
  /** The app's rules for the two amounts (the shared Zod schema). */
  validate: (values: EstimateValues) => FieldErrors<EstimateField>;
  /** Saves the estimate; on `{ ok: true }` the form stays busy until the task leaves `tasks`. */
  onAddEstimate: (id: string, values: EstimateValues) => Promise<SubmitResult<EstimateField>>;
  /** No "Add estimate" is left after a save (the list is gone or names only tasks priced through their subtasks); the parent takes focus. */
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
    initialValues: { amount: "", upTo: "" },
    validate,
    onSubmit,
    unexpectedError: t.unexpectedError,
  });
  const amount = (name: EstimateField, label: string, optionalText: string) => (
    <FormField
      label={label}
      error={form.errors[name]}
      optional
      optionalText={optionalText}
      className="flex-1"
    >
      {(control) => (
        <Input
          {...control}
          {...form.field(name)}
          inputMode="decimal"
          suffix={t.currency}
          autoFocus={name === "amount"}
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
          {amount("amount", t.amount, "")}
          {amount("upTo", t.upTo, t.optional)}
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
 * typed in place (decision I4) and the task leaves the list once it has them. A task whose
 * subtasks all lack an estimate says to price them instead (R13; owner, 2026-10-28).
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
    const button = (id: string) =>
      buttons.find((candidate) => candidate.dataset.addEstimate === id);
    // A task priced through its subtasks has no button, so look for the next one that has.
    const target =
      "id" in request
        ? button(request.id)
        : (tasks
            .slice(request.index)
            .map((task) => button(task.id))
            .find(Boolean) ?? buttons.at(-1));
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
                    {task.subtasksWithoutEstimate ? (
                      <span className="text-meta text-muted">
                        {t.addSubtaskEstimates(task.subtasksWithoutEstimate)}
                      </span>
                    ) : (
                      <TextAction
                        data-add-estimate={task.id}
                        aria-label={t.addEstimateFor(task.title)}
                        onClick={() => setAdding(task.id)}
                      >
                        {t.addEstimate}
                      </TextAction>
                    )}
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
