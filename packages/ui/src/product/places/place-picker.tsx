"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { FormField } from "../../components/form-field";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { TextAction } from "../../components/ui/text-action";
import { useForm, type SubmitResult } from "../../lib/use-form";
import { PlaceColorPicker } from "./place-color-picker";
import { PlaceTag } from "./place-tag";
import { defaultPlaceText, type PlaceText } from "./text";
import type { Place, PlaceColor } from "./types";

export interface PlaceValues {
  name: string;
  color: PlaceColor;
}

/** A new place has only a name: the app gives it the next colour (D26). */
export type NewPlaceValues = Pick<PlaceValues, "name">;

export type PlaceSubmit = (values: NewPlaceValues) => Promise<SubmitResult<"name">>;

export interface PlacePickerProps {
  /** The task whose places are chosen; names the panel. */
  taskTitle: string;
  /** Every place of the owner, the predefined ones included (D26). */
  places: Place[];
  /** The places this task belongs to. */
  selectedIds: string[];
  /** Adds the task to a place or removes it; the app saves at once (optimistic). */
  onToggle: (placeId: string, assigned: boolean) => void;
  /** Creates a place, coloured by the app, and adds this task to it. */
  onCreate: PlaceSubmit;
  onUpdate: (placeId: string, values: PlaceValues) => Promise<SubmitResult<"name">>;
  /** Deletes a place everywhere; resolve `false` (or throw) to show the failure. */
  onDelete: (placeId: string) => Promise<boolean>;
  /** The app's name rules (not empty, at most 30 characters, unique ignoring case, G4, D26); `placeId` when renaming. */
  validateName: (name: string, placeId?: string) => string | undefined;
  /** The app's limit of 20 places is reached (D26): no new place can be created. */
  atLimit: boolean;
  text?: Partial<PlaceText>;
}

interface PlaceFormProps {
  placeId?: string;
  initialName: string;
  nameLabel: string;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (name: string) => Promise<SubmitResult<"name">>;
  onCancel?: () => void;
  validateName: PlacePickerProps["validateName"];
  autoFocus?: boolean;
  /** Fields under the name: the colour, when editing a place. */
  children?: ReactNode;
  t: PlaceText;
}

/** The name of a place: "New place" when creating, the place's own name (and colour) when editing. */
function PlaceForm({
  placeId,
  initialName,
  nameLabel,
  submitLabel,
  pendingLabel,
  onSubmit,
  onCancel,
  validateName,
  autoFocus,
  children,
  t,
}: PlaceFormProps) {
  const form = useForm<"name">({
    initialValues: { name: initialName },
    validate: (values) => ({ name: validateName(values.name, placeId) }),
    onSubmit: (values) => onSubmit(values.name),
    unexpectedError: t.unexpectedError,
    resetOnSuccess: placeId === undefined,
  });
  const submit = (
    <Button type="submit" variant={onCancel ? "primary" : "secondary"} loading={form.pending}>
      {form.pending ? pendingLabel : submitLabel}
    </Button>
  );

  return (
    <form {...form.formProps} className="flex flex-col gap-group">
      {form.formError ? <Alert title={form.formError} /> : null}
      <FormField label={nameLabel} error={form.errors.name}>
        {(control) => (
          <div className="flex gap-group">
            <Input {...control} {...form.field("name")} autoFocus={autoFocus} autoComplete="off" />
            {onCancel ? null : submit}
          </div>
        )}
      </FormField>
      {children}
      {onCancel ? (
        <div className="flex flex-wrap gap-group">
          {submit}
          <Button disabled={form.pending} onClick={onCancel}>
            {t.cancel}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function EditPlace({
  place,
  onUpdate,
  onDelete,
  onClose,
  validateName,
  t,
}: {
  place: Place;
  onUpdate: PlacePickerProps["onUpdate"];
  onDelete: PlacePickerProps["onDelete"];
  onClose: () => void;
  validateName: PlacePickerProps["validateName"];
  t: PlaceText;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const [color, setColor] = useState(place.color);

  const remove = async () => {
    setDeleting(true);
    setError(false);
    const deleted = await onDelete(place.id).catch(() => false);
    setDeleting(false);
    if (deleted) onClose();
    else setError(true);
  };

  return (
    <div className="flex flex-col gap-between-groups border-y border-divider py-group">
      <PlaceForm
        placeId={place.id}
        initialName={place.name}
        nameLabel={t.name}
        submitLabel={t.save}
        pendingLabel={t.saving}
        onSubmit={async (name) => {
          const result = await onUpdate(place.id, { name, color });
          if (result.ok) onClose();
          return result;
        }}
        onCancel={onClose}
        validateName={validateName}
        autoFocus
        t={t}
      >
        <fieldset className="flex min-w-0 flex-col gap-inline">
          <legend className="mb-inline">{t.color}</legend>
          <PlaceColorPicker value={color} onValueChange={setColor} label={t.color} text={t} />
        </fieldset>
      </PlaceForm>
      {/* Deleting removes the place from every task, so it asks once, in place (pattern
          Delete confirmation, decision G6). */}
      {confirming ? (
        <div className="flex flex-col gap-group">
          <p className="font-strong">{t.deleteQuestion(place.name)}</p>
          {error ? (
            <p role="alert" className="text-danger">
              {t.deleteError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-group">
            <Button variant="danger" loading={deleting} onClick={() => void remove()}>
              {deleting ? t.deleting : t.deletePlace}
            </Button>
            <Button disabled={deleting} onClick={() => setConfirming(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" className="self-start" onClick={() => setConfirming(true)}>
          {t.deletePlace}
        </Button>
      )}
    </div>
  );
}

/**
 * Chooses the places of a task or subtask (D09, D21): a checkbox per place, "New place" to create
 * one by name, and "Edit places" to rename, recolour or delete them (decisions G3, G6, D26). The
 * owner starts with the predefined places; the app colours a new one and allows up to 20 (D26).
 * Shown in a popover from the row's "…" menu.
 */
export function PlacePicker({
  taskTitle,
  places,
  selectedIds,
  onToggle,
  onCreate,
  onUpdate,
  onDelete,
  validateName,
  atLimit,
  text,
}: PlacePickerProps) {
  const t = { ...defaultPlaceText, ...text };
  const id = useId();
  const [view, setView] = useState<"choose" | "edit">("choose");
  const [editingId, setEditingId] = useState<string | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const editPlacesRef = useRef<HTMLButtonElement>(null);
  const viewChanged = useRef(false);
  const editing = places.find((place) => place.id === editingId);

  useLayoutEffect(() => {
    if (!viewChanged.current) return;
    viewChanged.current = false;
    (view === "edit" ? backRef : editPlacesRef).current?.focus();
  }, [view]);

  const show = (next: "choose" | "edit") => {
    viewChanged.current = true;
    setEditingId(null);
    setView(next);
  };

  if (view === "edit") {
    return (
      <div data-slot="place-picker" className="flex flex-col gap-between-groups">
        <TextAction ref={backRef} tone="muted" onClick={() => show("choose")}>
          {t.back}
        </TextAction>
        <p id={`${id}-edit`} className="font-strong">
          {t.editPlaces}
        </p>
        <ul aria-labelledby={`${id}-edit`} className="flex flex-col gap-inline">
          {places.map((place) =>
            editing?.id === place.id ? (
              <li key={place.id}>
                <EditPlace
                  place={place}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onClose={() => setEditingId(null)}
                  validateName={validateName}
                  t={t}
                />
              </li>
            ) : (
              <li key={place.id} className="flex items-center justify-between gap-group">
                <PlaceTag place={place} />
                <TextAction
                  tone="muted"
                  aria-label={t.editPlace(place.name)}
                  onClick={() => setEditingId(place.id)}
                >
                  {t.edit}
                </TextAction>
              </li>
            ),
          )}
        </ul>
      </div>
    );
  }

  return (
    <div data-slot="place-picker" className="flex flex-col gap-between-groups">
      <p id={`${id}-title`} className="font-strong">
        {t.placesFor(taskTitle)}
      </p>
      {places.length === 0 ? (
        <p className="text-muted">{t.noPlaces}</p>
      ) : (
        <ul aria-labelledby={`${id}-title`} className="flex flex-col">
          {places.map((place) => (
            <li key={place.id} className="flex items-center">
              <Checkbox
                id={`${id}-${place.id}`}
                checked={selectedIds.includes(place.id)}
                onCheckedChange={(assigned) => onToggle(place.id, assigned)}
              />
              <Label htmlFor={`${id}-${place.id}`} className="min-w-0 break-words">
                <PlaceTag place={place} />
              </Label>
            </li>
          ))}
        </ul>
      )}
      {atLimit ? (
        <p className="text-muted">{t.atLimit}</p>
      ) : (
        <PlaceForm
          initialName=""
          nameLabel={t.newPlace}
          submitLabel={t.create}
          pendingLabel={t.creating}
          onSubmit={(name) => onCreate({ name })}
          validateName={validateName}
          t={t}
        />
      )}
      {places.length > 0 ? (
        <TextAction ref={editPlacesRef} tone="muted" onClick={() => show("edit")}>
          {t.editPlaces}
        </TextAction>
      ) : null}
    </div>
  );
}
