"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "../../components/form-field";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { TextAction } from "../../components/ui/text-action";
import { cn } from "../../lib/cn";
import { useForm, type SubmitResult } from "../../lib/use-form";
import {
  PlacePicker,
  type NewPlaceValues,
  type PlacePickerProps,
  type PlacesState,
} from "../places/place-picker";
import { PlaceTag } from "../places/place-tag";
import type { PlaceText } from "../places/text";
import type { Place } from "../places/types";
import { defaultTaskText, type TaskText } from "./text";
import { DescriptionField, EstimateFields } from "./task-fields";
import { emptyTaskValues, type TaskAdd, type TaskField, type TaskFieldErrors } from "./types";

/** A place created from a draft: its id, which the draft then selects, or why it was refused. */
export type PlaceCreateResult =
  { ok: true; placeId: string } | Extract<SubmitResult<"name">, { ok: false }>;

/**
 * The owner's places for the draft of a new task (spec E02, #83): the catalog, whether it has
 * loaded, and what the app does with it. Nothing here touches a task: the choice stays in the
 * form until Add.
 */
export interface DraftPlaces extends PlacesState {
  all: Place[];
  /** The app's limit of 20 places is reached (D26). */
  atLimit: boolean;
  validateName: (name: string, placeId?: string) => string | undefined;
  /** Creates a place, coloured by the app (D26), without adding any task to it. */
  onCreate: (values: NewPlaceValues) => Promise<PlaceCreateResult>;
  onUpdate: PlacePickerProps["onUpdate"];
  onDelete: PlacePickerProps["onDelete"];
  text?: Partial<PlaceText>;
}

export interface QuickAddProps {
  /** Field messages from the shared schema; only the title is required (spec E01, R10). */
  validate: (values: Record<TaskField, string>) => TaskFieldErrors;
  /**
   * Adds the task with the places chosen for it. On `{ ok: true }` the form clears, the choice
   * too, and focus goes back to the title; otherwise both stay for a retry (#83 AC14).
   */
  onSubmit: TaskAdd;
  /** A subtask under a task: labelled "New subtask", with Cancel; Escape cancels too. */
  onCancel?: () => void;
  /** Turns on "Places…": choose or create places before Add (spec E02, #83). */
  places?: DraftPlaces;
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
 * "Places…" of a draft and the places chosen so far, each a dot and its name; a chosen place that
 * was deleted meanwhile shows as such, with Remove, so the task is never saved with fewer places
 * than the owner chose without them seeing it (#83 AC18).
 */
function DraftPlacePicker({
  places,
  title,
  selectedIds,
  onToggle,
  onCreate,
  disabled,
  t,
}: {
  places: DraftPlaces;
  title: string;
  selectedIds: string[];
  onToggle: (placeId: string, selected: boolean) => void;
  onCreate: PlacePickerProps["onCreate"];
  disabled: boolean;
  t: TaskText;
}) {
  const [open, setOpen] = useState(false);
  const chosen = places.all.filter((place) => selectedIds.includes(place.id));
  const deleted = selectedIds.filter((id) => !places.all.some((place) => place.id === id));

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <TextAction tone="muted" disabled={disabled}>
            {t.places}
          </TextAction>
        </PopoverTrigger>
        {/* Portalled out of the form's DOM but not out of its React tree: the picker's own forms
            and keys must not submit or cancel the quick add. */}
        <PopoverContent
          aria-label={title}
          onSubmit={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <PlacePicker
            status={places.status}
            onRetry={places.onRetry}
            retrying={places.retrying}
            taskTitle={title}
            places={places.all}
            selectedIds={selectedIds}
            onToggle={onToggle}
            onCreate={onCreate}
            onUpdate={places.onUpdate}
            onDelete={places.onDelete}
            validateName={places.validateName}
            atLimit={places.atLimit}
            text={{ ...places.text, placesFor: () => title }}
          />
        </PopoverContent>
      </Popover>
      {chosen.length + deleted.length > 0 ? (
        <ul aria-label={t.chosenPlaces} className="flex flex-wrap items-center gap-group">
          {chosen.map((place) => (
            <li key={place.id}>
              <PlaceTag place={place} />
            </li>
          ))}
          {deleted.map((id) => (
            <li key={id} className="flex items-center gap-inline">
              <span className="text-danger">{t.deletedPlace}</span>
              <TextAction tone="muted" disabled={disabled} onClick={() => onToggle(id, false)}>
                {t.removeDeletedPlace}
              </TextAction>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/**
 * Captures a task in one row: the title, the amounts and "Add" (spec E01, discovery prototype C1),
 * so the estimate goes in when the task is added; only the title is required. The description sits
 * behind its toggle, and with `places` the task's places behind "Places…" (spec E02, #83). After an
 * add the form is ready for the next one, with no places chosen.
 */
export function QuickAdd({
  validate,
  onSubmit,
  onCancel,
  places,
  autoFocus,
  className,
  text,
}: QuickAddProps) {
  const t = { ...defaultTaskText, ...text };
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // A place being created from the picker: Add and Cancel wait for it, so the task never goes
  // without a place the owner is still creating (#83 AC17).
  const [creatingPlace, setCreatingPlace] = useState(false);
  const unavailable =
    places !== undefined && selectedIds.some((id) => !places.all.some((place) => place.id === id));
  const form = useForm<TaskField>({
    initialValues: emptyTaskValues,
    validate,
    onSubmit: async (values) => {
      if (unavailable) return { ok: false, formError: t.placeUnavailable };
      const result = await onSubmit(values, selectedIds);
      if (result.ok) {
        setDescriptionOpen(false);
        setSelectedIds([]);
      }
      return result;
    },
    unexpectedError: t.unexpectedError,
    resetOnSuccess: true,
  });
  const busy = form.pending || creatingPlace;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (creatingPlace) event.preventDefault();
    else void form.formProps.onSubmit(event);
  };

  // The choice is frozen while the task or a new place is being saved.
  const toggle = (placeId: string, selected: boolean) => {
    if (busy) return;
    setSelectedIds((ids) =>
      selected
        ? [...ids.filter((id) => id !== placeId), placeId]
        : ids.filter((id) => id !== placeId),
    );
  };

  const createPlace = async (values: NewPlaceValues): Promise<SubmitResult<"name">> => {
    setCreatingPlace(true);
    try {
      const result = await places!.onCreate(values);
      if (!result.ok) return result;
      setSelectedIds((ids) => [...ids, result.placeId]);
      return { ok: true };
    } finally {
      setCreatingPlace(false);
    }
  };

  return (
    <form
      {...form.formProps}
      onSubmit={submit}
      data-slot="quick-add"
      className={cn("flex flex-col gap-group", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onCancel && !busy) onCancel();
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
          <Button
            type="submit"
            variant="primary"
            loading={form.pending}
            disabled={creatingPlace}
            className="self-start"
          >
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
          <>
            {places ? (
              <DraftPlacePicker
                places={places}
                title={onCancel ? t.newSubtaskPlaces : t.newTaskPlaces}
                selectedIds={selectedIds}
                onToggle={toggle}
                onCreate={createPlace}
                disabled={form.pending}
                t={t}
              />
            ) : null}
            {onCancel ? (
              <TextAction tone="muted" disabled={busy} onClick={onCancel}>
                {t.cancel}
              </TextAction>
            ) : null}
          </>
        }
      />
    </form>
  );
}
