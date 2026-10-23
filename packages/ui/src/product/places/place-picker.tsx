"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
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
import { freePlaceColors, placeColorIsAutomatic, type Place, type PlaceColor } from "./types";

export interface PlaceValues {
  name: string;
  color: PlaceColor;
}

export type PlaceSubmit = (values: PlaceValues) => Promise<SubmitResult<"name">>;

export interface PlacePickerProps {
  /** The task whose places are chosen; names the panel. */
  taskTitle: string;
  /** Every place of the list. */
  places: Place[];
  /** The places this task belongs to. */
  selectedIds: string[];
  /** Adds the task to a place or removes it; the app saves at once (optimistic). */
  onToggle: (placeId: string, assigned: boolean) => void;
  /** Creates a place and adds this task to it. */
  onCreate: PlaceSubmit;
  onUpdate: (placeId: string, values: PlaceValues) => Promise<SubmitResult<"name">>;
  /** Deletes a place everywhere; resolve `false` (or throw) to show the failure. */
  onDelete: (placeId: string) => Promise<boolean>;
  /** The app's name rules (not empty, at most 30 characters, unique, G4); `placeId` when renaming. */
  validateName: (name: string, placeId?: string) => string | undefined;
  /** The app's limit of places is reached (decision G5): no new place can be created. */
  atLimit: boolean;
  text?: Partial<PlaceText>;
}

interface PlaceFormProps {
  places: Place[];
  placeId?: string;
  initialName: string;
  /** The colour shown until the user picks another one. */
  defaultColor: PlaceColor;
  /** Show the colour choice; the first six new places get theirs without asking. */
  chooseColor: boolean;
  nameLabel: string;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: PlaceSubmit;
  onCancel?: () => void;
  validateName: PlacePickerProps["validateName"];
  autoFocus?: boolean;
  t: PlaceText;
}

/** Name and colour of a place: "New place" when creating, the place's own values when editing. */
function PlaceForm({
  places,
  placeId,
  initialName,
  defaultColor,
  chooseColor,
  nameLabel,
  submitLabel,
  pendingLabel,
  onSubmit,
  onCancel,
  validateName,
  autoFocus,
  t,
}: PlaceFormProps) {
  const [chosen, setChosen] = useState<PlaceColor | null>(null);
  const free = freePlaceColors(places, placeId);
  // A colour taken meanwhile (e.g. by the place just created) falls back to the default.
  const color = chosen !== null && free.includes(chosen) ? chosen : defaultColor;
  const form = useForm<"name">({
    initialValues: { name: initialName },
    validate: (values) => ({ name: validateName(values.name, placeId) }),
    onSubmit: (values) => onSubmit({ name: values.name, color }),
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
      {chooseColor ? (
        <fieldset className="flex min-w-0 flex-col gap-inline">
          <legend className="mb-inline">{t.color}</legend>
          <PlaceColorPicker
            value={color}
            onValueChange={setChosen}
            places={places}
            placeId={placeId}
            label={t.color}
            text={t}
          />
        </fieldset>
      ) : null}
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
  places,
  onUpdate,
  onDelete,
  onClose,
  validateName,
  t,
}: {
  place: Place;
  places: Place[];
  onUpdate: PlacePickerProps["onUpdate"];
  onDelete: PlacePickerProps["onDelete"];
  onClose: () => void;
  validateName: PlacePickerProps["validateName"];
  t: PlaceText;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

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
        places={places}
        placeId={place.id}
        initialName={place.name}
        defaultColor={place.color}
        chooseColor
        nameLabel={t.name}
        submitLabel={t.save}
        pendingLabel={t.saving}
        onSubmit={async (values) => {
          const result = await onUpdate(place.id, values);
          if (result.ok) onClose();
          return result;
        }}
        onCancel={onClose}
        validateName={validateName}
        autoFocus
        t={t}
      />
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
 * one, and "Edit places" to rename, recolour or delete them (decisions G3–G6). Shown in a popover
 * from the row's "…" menu.
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
  const firstFree = freePlaceColors(places)[0];
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
                  places={places}
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
      {atLimit || firstFree === undefined ? (
        <p className="text-muted">{t.atLimit}</p>
      ) : (
        <PlaceForm
          places={places}
          initialName=""
          defaultColor={firstFree}
          chooseColor={!placeColorIsAutomatic(places)}
          nameLabel={t.newPlace}
          submitLabel={t.create}
          pendingLabel={t.creating}
          onSubmit={onCreate}
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
