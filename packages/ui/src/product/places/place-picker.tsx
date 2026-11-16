"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ErrorState } from "../../components/error-state";
import { FormField } from "../../components/form-field";
import { Alert } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
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

/**
 * Whether the owner's places have loaded (spec E02, F2). Only `ready` shows the places, "New place"
 * and "Edit places", so a list that has not arrived never reads as "No places yet.". `loading`
 * shows a skeleton; `error` the failure with "Try again" (`onRetry`), kept on screen with
 * "Trying again…" while `retrying`.
 */
export interface PlacesState {
  status: "loading" | "error" | "ready";
  onRetry: () => void;
  retrying?: boolean;
}

export interface PlacePickerProps extends PlacesState {
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
  /** Only fields changed from the values when the edit opened; unchanged saves do not write. */
  onUpdate: (placeId: string, values: Partial<PlaceValues>) => Promise<SubmitResult<"name">>;
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
  /** Hides Save and Cancel while the delete question, with its own Cancel, is open. */
  actionsHidden?: boolean;
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
  actionsHidden,
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
      {onCancel && !actionsHidden ? (
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
  onDeleted,
  validateName,
  t,
}: {
  place: Place;
  onUpdate: PlacePickerProps["onUpdate"];
  onDelete: PlacePickerProps["onDelete"];
  onClose: () => void;
  onDeleted: () => void;
  validateName: PlacePickerProps["validateName"];
  t: PlaceText;
}) {
  const [opened] = useState(place);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const [color, setColor] = useState(place.color);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const askChanged = useRef(false);

  // Asking replaces "Delete place" and answering removes the question, so focus follows the
  // button that takes the removed one's place (WCAG 2.4.3).
  useLayoutEffect(() => {
    if (!askChanged.current) return;
    askChanged.current = false;
    (confirming ? keepRef : deleteRef).current?.focus();
  }, [confirming]);

  const ask = (next: boolean) => {
    askChanged.current = true;
    setConfirming(next);
  };

  const remove = async () => {
    setDeleting(true);
    setError(false);
    const deleted = await onDelete(place.id).catch(() => false);
    setDeleting(false);
    if (deleted) onDeleted();
    else setError(true);
  };

  return (
    <div className="flex flex-col gap-between-groups border-y border-divider py-group">
      <PlaceForm
        placeId={place.id}
        initialName={opened.name}
        nameLabel={t.name}
        submitLabel={t.save}
        pendingLabel={t.saving}
        onSubmit={async (name) => {
          // A stale form must not overwrite a field edited elsewhere or refreshed while open.
          const changes: Partial<PlaceValues> = {};
          if (name !== opened.name) changes.name = name;
          if (color !== opened.color) changes.color = color;
          const result =
            Object.keys(changes).length === 0
              ? { ok: true as const }
              : await onUpdate(place.id, changes);
          if (result.ok) onClose();
          return result;
        }}
        onCancel={onClose}
        actionsHidden={confirming}
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
            <Button ref={keepRef} disabled={deleting} onClick={() => ask(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button ref={deleteRef} variant="danger" className="self-start" onClick={() => ask(true)}>
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
export function PlacePicker(props: PlacePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const retried = useRef(false);
  const ready = props.status === "ready";

  // "Try again" goes with the failure, so once the places arrive the first one takes the focus
  // (or "New place" when there are none), not the page (WCAG 2.4.3).
  useLayoutEffect(() => {
    if (!ready || !retried.current) return;
    retried.current = false;
    rootRef.current?.querySelector<HTMLElement>('[role="checkbox"], input')?.focus();
  }, [ready]);

  const retry = () => {
    retried.current = true;
    props.onRetry();
  };

  return (
    <div ref={rootRef} className="contents">
      {ready ? <ReadyPicker {...props} /> : <PlacesNotReady {...props} onRetry={retry} />}
    </div>
  );
}

/** The skeleton of three place rows (U2), or the failure with "Try again" (F2, P-1). */
function PlacesNotReady({ taskTitle, text, status, onRetry, retrying }: PlacePickerProps) {
  const t = { ...defaultPlaceText, ...text };
  const id = useId();
  return (
    <div
      data-slot="place-picker"
      aria-busy={status === "loading" || undefined}
      className="flex flex-col gap-between-groups"
    >
      <p id={`${id}-title`} className="font-strong">
        {t.placesFor(taskTitle)}
      </p>
      {status === "error" ? (
        <ErrorState
          title={t.loadFailed}
          onRetry={onRetry}
          retrying={retrying}
          retryLabel={t.retry}
          retryingLabel={t.retrying}
        />
      ) : (
        <>
          <ul aria-hidden="true" className="flex flex-col gap-inline">
            {[1, 2, 3].map((row) => (
              <li key={row} className="flex min-h-touch items-center">
                <Skeleton className="w-2/3 bg-list" />
              </li>
            ))}
          </ul>
          <span role="status" className="sr-only">
            {t.loading}
          </span>
        </>
      )}
    </div>
  );
}

function ReadyPicker({
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
  const editRefs = useRef(new Map<string, HTMLButtonElement>());
  const limitRef = useRef<HTMLParagraphElement>(null);
  const viewChanged = useRef(false);
  const wasAtLimit = useRef(atLimit);
  /** The place whose "Edit" takes focus once its form closes; none: "Back to choosing". */
  const returnTo = useRef<{ placeId?: string } | null>(null);
  const editing = places.find((place) => place.id === editingId);

  useLayoutEffect(() => {
    if (!viewChanged.current) return;
    viewChanged.current = false;
    (view === "edit" ? backRef : editPlacesRef).current?.focus();
  }, [view]);

  // Runs after every render: the closed form's row may come back in a later render than the one
  // that closed it.
  useLayoutEffect(() => {
    if (returnTo.current === null) return;
    const target = editRefs.current.get(returnTo.current.placeId ?? "") ?? backRef.current;
    returnTo.current = null;
    target?.focus();
  });

  // The create that reached the limit removed the focused form; its message takes the focus, so
  // a screen reader hears why the form is gone.
  useLayoutEffect(() => {
    const reached = atLimit && !wasAtLimit.current;
    wasAtLimit.current = atLimit;
    if (reached && document.activeElement === document.body) limitRef.current?.focus();
  }, [atLimit]);

  const closeEditing = (placeId?: string) => {
    returnTo.current = { placeId };
    setEditingId(null);
  };

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
                  onClose={() => closeEditing(place.id)}
                  onDeleted={() => {
                    const index = places.findIndex(({ id }) => id === place.id);
                    closeEditing((places[index + 1] ?? places[index - 1])?.id);
                  }}
                  validateName={validateName}
                  t={t}
                />
              </li>
            ) : (
              <li key={place.id} className="flex items-center justify-between gap-group">
                <PlaceTag place={place} />
                <TextAction
                  ref={(button) => {
                    if (button) editRefs.current.set(place.id, button);
                    else editRefs.current.delete(place.id);
                  }}
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
        <p
          ref={limitRef}
          tabIndex={-1}
          className="text-muted outline-none focus-visible:focus-ring"
        >
          {t.atLimit}
        </p>
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
