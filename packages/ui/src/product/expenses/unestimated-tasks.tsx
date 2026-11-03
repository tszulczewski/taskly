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

/** Something that still needs a price: an open task without subtasks, or an open subtask (D27). */
export interface UnestimatedItem {
  id: string;
  title: string;
  /** Set for a subtask: the title of its task, shown after it ("Tiles · Bathroom tiles"). */
  taskTitle?: string;
}

export interface UnestimatedTasksProps {
  /**
   * What has no estimate, in list order (R10, R13, D27): open tasks without subtasks and open
   * subtasks of open tasks, never a task with subtasks itself (its amounts come from them, R12).
   */
  items: UnestimatedItem[];
  /** The app's rules for the two amounts (the shared Zod schema). */
  validate: (values: EstimateValues) => FieldErrors<EstimateField>;
  /** Saves the estimate; on `{ ok: true }` the form stays busy until the item leaves `items`. */
  onAddEstimate: (id: string, values: EstimateValues) => Promise<SubmitResult<EstimateField>>;
  /** No "Add estimate" is left after a save (the list is gone); the parent takes focus. */
  onEmptied?: () => void;
  text?: Partial<ExpensesText>;
}

function EstimateForm({
  title,
  taskTitle,
  validate,
  onSubmit,
  onCancel,
  t,
}: {
  title: string;
  taskTitle?: string;
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
        <legend className="mb-inline font-strong break-words">
          {t.estimateFor(title, taskTitle)}
        </legend>
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
 * The collapsed line under future expenses, "2 tasks and 1 subtask without an estimate" (Luki 9,
 * R02.10, R10, D27), shown only when something is missing. Open, it says why they are not counted
 * and offers "Add estimate" for each item, a subtask named with its task; the amounts are typed in
 * place (decision I4) and the item leaves the list once it has them.
 */
export function UnestimatedTasks({
  items,
  validate,
  onAddEstimate,
  onEmptied,
  text,
}: UnestimatedTasksProps) {
  const t = { ...defaultExpensesText, ...text };
  const [adding, setAdding] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // After Cancel focus returns to that item's "Add estimate"; after a save, once the item has left
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
    const target =
      "id" in request ? button(request.id) : (buttons[request.index] ?? buttons.at(-1));
    if (target) target.focus();
    else onEmptied?.();
  }, [adding, items, onEmptied]);

  if (items.length === 0) return null;
  const tasks = items.filter((item) => item.taskTitle === undefined).length;
  const count = t.unestimated(tasks, items.length - tasks);

  return (
    <Collapsible data-slot="unestimated-tasks">
      <CollapsibleTrigger asChild>
        <TextAction>
          <CollapsibleIndicator />
          {count}
        </TextAction>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-group pt-inline">
          <p className="max-w-measure text-muted">{t.unestimatedRule}</p>
          <ul ref={listRef} aria-label={count} className="flex flex-col">
            {items.map((item, index) => (
              <li key={item.id} className="border-t border-divider py-row-y first:border-t-0">
                {adding === item.id ? (
                  <EstimateForm
                    title={item.title}
                    taskTitle={item.taskTitle}
                    validate={validate}
                    onSubmit={async (values) => {
                      const result = await onAddEstimate(item.id, values);
                      // The form stays busy until the item leaves the list; focus then moves on.
                      if (result.ok) focusRequest.current = { index };
                      return result;
                    }}
                    onCancel={() => {
                      focusRequest.current = { id: item.id };
                      setAdding(null);
                    }}
                    t={t}
                  />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-x-group">
                    <span className="min-w-0 break-words">
                      {item.title}
                      {item.taskTitle === undefined ? null : (
                        <span className="text-muted"> · {item.taskTitle}</span>
                      )}
                    </span>
                    <TextAction
                      data-add-estimate={item.id}
                      aria-label={t.addEstimateFor(item.title, item.taskTitle)}
                      onClick={() => setAdding(item.id)}
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
