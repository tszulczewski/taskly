"use client";

import { FormField } from "../../components/form-field";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import type { useForm } from "../../lib/use-form";
import type { TaskField } from "./types";

export interface TaskFieldsText {
  description: string;
  estimate: string;
  min: string;
  max: string;
  currency: string;
  optional: string;
}

export const defaultTaskFieldsText: TaskFieldsText = {
  description: "Description",
  estimate: "Estimate",
  min: "Min",
  max: "Max",
  currency: "zł",
  optional: "(optional)",
};

/** Description and the min–max estimate, shared by quick add and the edit form (spec E01). */
export function TaskFields({
  form,
  text,
}: {
  form: ReturnType<typeof useForm<TaskField>>;
  text: TaskFieldsText;
}) {
  const amount = (name: "min" | "max", label: string) => (
    <FormField label={label} error={form.errors[name]} optional optionalText="" className="flex-1">
      {(control) => (
        <Input {...control} {...form.field(name)} inputMode="decimal" suffix={text.currency} />
      )}
    </FormField>
  );
  return (
    <>
      <FormField
        label={text.description}
        error={form.errors.description}
        optional
        optionalText={text.optional}
      >
        {(control) => <Textarea {...control} {...form.field("description")} rows={2} />}
      </FormField>
      <fieldset className="flex min-w-0 flex-col gap-inline">
        <legend className="mb-inline">
          {text.estimate} <span className="text-muted">{text.optional}</span>
        </legend>
        <div className="flex gap-group">
          {amount("min", text.min)}
          {amount("max", text.max)}
        </div>
      </fieldset>
    </>
  );
}
