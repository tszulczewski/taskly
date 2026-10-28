"use client";

import type { ReactNode } from "react";
import { FormField } from "../../components/form-field";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { TextAction } from "../../components/ui/text-action";
import { cn } from "../../lib/cn";
import type { useForm } from "../../lib/use-form";
import type { TaskField } from "./types";

export interface TaskFieldsText {
  description: string;
  estimate: string;
  amount: string;
  upTo: string;
  currency: string;
  optional: string;
}

export const defaultTaskFieldsText: TaskFieldsText = {
  description: "Description",
  estimate: "Estimate",
  amount: "Amount",
  upTo: "up to",
  currency: "zł",
  optional: "(optional)",
};

type TaskFormState = ReturnType<typeof useForm<TaskField>>;

/**
 * The estimate as two fields, "Amount" and "up to (optional)": one filled field is an exact price,
 * both a range (R18, D24). The group carries "(optional)": a task may have no estimate (R10).
 */
export function EstimateFields({
  form,
  text,
  className,
}: {
  form: TaskFormState;
  text: TaskFieldsText;
  className?: string;
}) {
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-inline", className)}>
      <legend className="mb-inline">
        {text.estimate} <span className="text-muted">{text.optional}</span>
      </legend>
      <div className="flex gap-group">
        <FormField
          label={text.amount}
          error={form.errors.amount}
          optional
          optionalText=""
          className="flex-1"
        >
          {(control) => (
            <Input
              {...control}
              {...form.field("amount")}
              inputMode="decimal"
              suffix={text.currency}
            />
          )}
        </FormField>
        <FormField
          label={text.upTo}
          error={form.errors.upTo}
          optional
          optionalText={text.optional}
          className="flex-1"
        >
          {(control) => (
            <Input
              {...control}
              {...form.field("upTo")}
              inputMode="decimal"
              suffix={text.currency}
            />
          )}
        </FormField>
      </div>
    </fieldset>
  );
}

/**
 * The optional description behind a "Description" toggle, so a quick capture stays one row
 * (discovery prototype C1, spec E01). A field with an error is never hidden. `actions` sit beside
 * the toggle (Cancel of a subtask form).
 */
export function DescriptionField({
  form,
  text,
  open,
  onOpenChange,
  actions,
}: {
  form: TaskFormState;
  text: TaskFieldsText;
  /** Owned by the form: quick add closes it after an add, the edit form opens it when set. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: ReactNode;
}) {
  return (
    <Collapsible open={open || form.errors.description !== undefined} onOpenChange={onOpenChange}>
      <div className="flex flex-wrap items-center gap-group">
        <CollapsibleTrigger asChild>
          <TextAction tone="muted">
            <CollapsibleIndicator />
            {text.description}
          </TextAction>
        </CollapsibleTrigger>
        {actions}
      </div>
      <CollapsibleContent>
        <div className="pt-group">
          <FormField
            label={text.description}
            error={form.errors.description}
            optional
            optionalText={text.optional}
          >
            {(control) => <Textarea {...control} {...form.field("description")} rows={2} />}
          </FormField>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
