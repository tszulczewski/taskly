"use client";

import { useSortable } from "@dnd-kit/sortable";
import { Ellipsis, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "../../components/ui/menu";
import { Popover, PopoverAnchor, PopoverContent } from "../../components/ui/popover";
import { TextAction } from "../../components/ui/text-action";
import { cn } from "../../lib/cn";
import type { SubmitResult } from "../../lib/use-form";
import { PlacePicker, type PlaceValues } from "../places/place-picker";
import { PlaceTag } from "../places/place-tag";
import { defaultPlaceText, type PlaceText } from "../places/text";
import type { Place } from "../places/types";
import { DragHandle } from "./drag-handle";
import { EstimateRange } from "./estimate-range";
import { Markers } from "./markers";
import { QuickAdd } from "./quick-add";
import { SortableGroup, rowMove, type MovePosition, type RowMove } from "./sortable";
import { SubtaskProgress } from "./subtask-progress";
import { TaskCheckbox } from "./task-checkbox";
import { TaskForm } from "./task-form";
import { defaultTaskText, type TaskText } from "./text";
import type {
  Marker,
  TaskField,
  TaskFieldErrors,
  TaskFormValues,
  TaskItem,
  TaskSubmit,
} from "./types";

export type TaskChange = (id: string, values: TaskFormValues) => Promise<SubmitResult<TaskField>>;

/** Places of the list and what the app does with them (E02-S03; decisions G3–G6). */
export interface PlaceOptions {
  all: Place[];
  /** The app's limit of places is reached (decision G5). */
  atLimit: boolean;
  validateName: (name: string, placeId?: string) => string | undefined;
  onToggle: (taskId: string, placeId: string, assigned: boolean) => void;
  /** Creates a place and adds the task to it. */
  onCreate: (taskId: string, values: PlaceValues) => Promise<SubmitResult<"name">>;
  onUpdate: (placeId: string, values: PlaceValues) => Promise<SubmitResult<"name">>;
  onDelete: (placeId: string) => Promise<boolean>;
  text?: Partial<PlaceText>;
}

export interface TaskRowProps {
  task: TaskItem;
  validate: (values: TaskFormValues) => TaskFieldErrors;
  /** Saves an edit; resolve `{ ok: true }` to close the form. */
  onEdit: TaskChange;
  /** Adds a subtask under this task. Leave it out for a subtask: one level only (spec E01). */
  onAddSubtask?: TaskChange;
  /** "Delete" was chosen; the list asks first. `trigger` is this row's "…", for focus on cancel. */
  onRequestDelete: (task: TaskItem, trigger: HTMLElement | null) => void;
  /** The row just added: scrolled into view and briefly highlighted (spec E01, After an add). */
  highlightId?: string;
  /** This row's place in its group; the group (`SortableGroup`) makes it draggable (E02-S01). */
  move?: RowMove;
  /** Moves a subtask within this task (decision G1); turns on ordering for the subtasks. */
  onMove?: (id: string, position: MovePosition) => void;
  /** Sets or clears a marker (E02-S02); turns on "Important" and "Urgent" in the menu. */
  onToggleMarker?: (id: string, marker: Marker, on: boolean) => void;
  /** Turns on "Places…" in the menu (E02-S03). */
  places?: PlaceOptions;
  /** The checkbox was ticked or cleared (E03-S01); the list asks first when subtasks are open. */
  onToggleComplete?: (task: TaskItem, completed: boolean) => void;
  text?: Partial<TaskText>;
}

/** The columns before the title: handle (from 640px, in a sortable group), arrow, checkbox. */
interface Columns {
  handle: boolean;
  checkbox: boolean;
}

/** Keeps the handle column when this row cannot move, so titles stay in line. */
function HandleSpace() {
  return <span aria-hidden="true" className="hidden w-touch shrink-0 wide:block" />;
}

/** Keeps the arrow column from 640px; below it there is no arrow (decision J1). */
function ArrowSpace() {
  return <span aria-hidden="true" className="hidden w-touch shrink-0 wide:block" />;
}

/** Lines content up under the title, past the columns before it. */
function UnderTitle({
  columns,
  className,
  children,
}: {
  columns: Columns;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex gap-group px-inset", className)}>
      {columns.handle ? <HandleSpace /> : null}
      <ArrowSpace />
      {columns.checkbox ? <span aria-hidden="true" className="w-touch shrink-0" /> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * One task or subtask in the list. Collapsed it shows the title, the estimate and a meta line with
 * places and markers (Luki 6); the title opens the description, the subtasks and "Add subtask" in
 * place (Q2, decision 2026-10-22). The arrow before it shows that from 640px; below, the title
 * alone does, which leaves the title room next to the checkbox (decision J1). Actions sit behind "…" (R02.1, P2); editing replaces the row
 * with the form. In a `SortableGroup` it moves by its handle, a long press, or "Move up / Move
 * down" (decision G2). A completed row is muted and struck through and does not move (E03-S01,
 * R02.2, decision I3).
 */
export function TaskRow({
  task,
  validate,
  onEdit,
  onAddSubtask,
  onRequestDelete,
  highlightId,
  move,
  onMove,
  onToggleMarker,
  places,
  onToggleComplete,
  text,
}: TaskRowProps) {
  const t = { ...defaultTaskText, ...text };
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const lineRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const addSubtaskRef = useRef<HTMLButtonElement>(null);
  // An action that moves focus itself (a form, the dialog) stops the menu returning it to "…".
  const menuMovedFocus = useRef(false);
  const focusRequest = useRef<"menu" | "add-subtask" | undefined>(undefined);
  const subtasks = task.subtasks ?? [];
  const isSubtask = onAddSubtask === undefined;
  const hasDetails = !isSubtask || task.description !== null;
  const highlighted = highlightId === task.id;
  const completed = task.completed === true;
  const columns: Columns = { handle: move !== undefined, checkbox: onToggleComplete !== undefined };
  // Completed rows keep their place at the end of the group (decision 2026-10-21).
  const movable = move !== undefined && !completed;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useSortable({
      id: task.id,
      // A pending row has a temporary id, which must never reach the server (spec E01).
      disabled: !movable || task.pending === true,
      transition: null,
      attributes: { roleDescription: t.sortable },
    });

  useLayoutEffect(() => {
    const target = focusRequest.current;
    if (target === undefined) return;
    focusRequest.current = undefined;
    (target === "menu" ? menuTriggerRef : addSubtaskRef).current?.focus();
  }, [editing, addingSubtask]);

  useEffect(() => {
    if (!highlighted) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lineRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [highlighted]);

  const closeEditing = () => {
    focusRequest.current = "menu";
    setEditing(false);
  };
  const save: TaskSubmit = async (values) => {
    const result = await onEdit(task.id, values);
    if (result.ok) closeEditing();
    return result;
  };
  const closeAddSubtask = () => {
    focusRequest.current = "add-subtask";
    setAddingSubtask(false);
  };
  const runMenuAction = (action: () => void) => {
    menuMovedFocus.current = true;
    action();
  };

  const movableSubtasks = subtasks.filter((subtask) => !subtask.pending && !subtask.completed);
  const subtasksDone = subtasks.filter((subtask) => subtask.completed).length;
  const subtaskIds = movableSubtasks.map((subtask) => subtask.id);
  const subtaskList = (
    <ul aria-label={t.subtasksOf(task.title)} className="pl-row-indent">
      {subtasks.map((subtask) => (
        <TaskRow
          key={subtask.id}
          task={subtask}
          validate={validate}
          onEdit={onEdit}
          onRequestDelete={onRequestDelete}
          highlightId={highlightId}
          move={onMove && rowMove(subtaskIds, subtask.id, onMove)}
          onToggleMarker={onToggleMarker}
          places={places}
          onToggleComplete={onToggleComplete}
          text={text}
        />
      ))}
    </ul>
  );

  const showMeta =
    task.pending ||
    subtasks.length > 0 ||
    task.important ||
    task.urgent ||
    (task.places?.length ?? 0) > 0;

  const titleClass = cn(
    "min-w-0 flex-1 text-left font-strong break-words",
    // The whole text block (title, estimate, meta) is the title's 44px target (K1).
    hasDetails &&
      "cursor-pointer outline-none after:absolute after:inset-0 after:rounded-control focus-visible:after:focus-ring",
    (task.pending || completed) && "text-muted",
    completed && "line-through",
  );

  const menu = (
    <Menu modal={false}>
      <MenuTrigger asChild>
        <PopoverAnchor asChild>
          <Button
            ref={menuTriggerRef}
            variant="ghost"
            size="icon"
            aria-label={t.moreActions(task.title)}
          >
            <Ellipsis />
          </Button>
        </PopoverAnchor>
      </MenuTrigger>
      <MenuContent
        onCloseAutoFocus={(event) => {
          if (!menuMovedFocus.current) return;
          menuMovedFocus.current = false;
          event.preventDefault();
        }}
      >
        {isSubtask || completed ? null : (
          <MenuItem
            disabled={task.pending}
            onSelect={() =>
              runMenuAction(() => {
                setExpanded(true);
                setAddingSubtask(true);
              })
            }
          >
            {t.addSubtask}
          </MenuItem>
        )}
        <MenuItem disabled={task.pending} onSelect={() => runMenuAction(() => setEditing(true))}>
          {t.edit}
        </MenuItem>
        {places ? (
          <MenuItem
            disabled={task.pending}
            onSelect={() => runMenuAction(() => setPlacesOpen(true))}
          >
            {t.places}
          </MenuItem>
        ) : null}
        {onToggleMarker ? (
          <>
            <MenuSeparator />
            <MenuCheckboxItem
              disabled={task.pending}
              checked={task.important === true}
              onCheckedChange={(on) => onToggleMarker(task.id, "important", on)}
            >
              {t.important}
            </MenuCheckboxItem>
            <MenuCheckboxItem
              disabled={task.pending}
              checked={task.urgent === true}
              onCheckedChange={(on) => onToggleMarker(task.id, "urgent", on)}
            >
              {t.urgent}
            </MenuCheckboxItem>
          </>
        ) : null}
        {movable ? (
          <>
            <MenuSeparator />
            <MenuItem disabled={task.pending || move.up === null} onSelect={() => move.up?.()}>
              {t.moveUp}
            </MenuItem>
            <MenuItem disabled={task.pending || move.down === null} onSelect={() => move.down?.()}>
              {t.moveDown}
            </MenuItem>
          </>
        ) : null}
        <MenuSeparator />
        <MenuItem
          tone="danger"
          disabled={task.pending}
          onSelect={() => runMenuAction(() => onRequestDelete(task, menuTriggerRef.current))}
        >
          {t.delete}
        </MenuItem>
      </MenuContent>
    </Menu>
  );

  return (
    <li
      ref={setNodeRef}
      data-slot="task-row"
      data-move-id={task.id}
      data-completed={completed || undefined}
      data-dragging={isDragging || undefined}
      // The dragged row is lifted above the rows it passes (no shadow: tokens rule 1).
      style={{
        transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 1 : undefined,
      }}
      className={cn(
        "border-t border-divider",
        !isSubtask && "first:border-t-0",
        isDragging ? "relative bg-raised" : "transition-transform duration-quick ease-standard",
      )}
    >
      <Collapsible
        open={expanded}
        onOpenChange={setExpanded}
        className={cn(!isSubtask && "data-[state=open]:bg-raised")}
      >
        {editing ? (
          <div className="bg-raised p-inset">
            <TaskForm
              initialValues={{
                title: task.title,
                description: task.description ?? "",
                min: task.min,
                max: task.max,
              }}
              validate={validate}
              onSubmit={save}
              onCancel={closeEditing}
              text={text}
            />
          </div>
        ) : (
          <div
            ref={lineRef}
            {...listeners}
            data-pending={task.pending || undefined}
            className={cn(
              "flex min-h-row items-start gap-group px-inset py-row-y",
              isSubtask ? "hover:bg-raised-hover" : "hover:bg-raised",
              // A long press moves the row on touch screens; it must not select text (G2).
              movable && "select-none",
              highlighted && "row-highlight",
            )}
          >
            {movable ? (
              <DragHandle
                ref={setActivatorNodeRef}
                {...attributes}
                label={t.dragHandle(task.title)}
                disabled={task.pending}
                className="hidden wide:inline-flex"
              />
            ) : columns.handle ? (
              <HandleSpace />
            ) : null}
            {hasDetails ? (
              // The title is the disclosure for keyboards and screen readers; the arrow only
              // repeats it for the pointer, so there is one control per row (decision J1).
              <Button
                variant="ghost"
                size="icon"
                aria-label={task.title}
                aria-hidden="true"
                tabIndex={-1}
                data-state={expanded ? "open" : "closed"}
                onClick={() => setExpanded((open) => !open)}
                className="group/trigger hidden wide:inline-flex"
              >
                <CollapsibleIndicator />
              </Button>
            ) : (
              <ArrowSpace />
            )}
            {onToggleComplete ? (
              <TaskCheckbox
                label={t.complete(task.title)}
                completed={completed}
                onCompletedChange={(next) => onToggleComplete(task, next)}
                disabled={task.pending}
              />
            ) : null}
            <div className="relative flex min-h-touch min-w-0 flex-1 flex-col justify-center">
              <div className="flex flex-col wide:flex-row wide:items-baseline wide:gap-group">
                {hasDetails ? (
                  <CollapsibleTrigger asChild>
                    <button type="button" data-slot="task-title" className={titleClass}>
                      {task.title}
                    </button>
                  </CollapsibleTrigger>
                ) : (
                  <span data-slot="task-title" className={titleClass}>
                    {task.title}
                  </span>
                )}
                <EstimateRange
                  value={task.estimate}
                  emptyText={t.noEstimate}
                  className={completed ? "text-muted" : undefined}
                />
              </div>
              {showMeta ? (
                <div className="flex flex-wrap items-center gap-x-group text-meta text-muted">
                  {task.pending ? <span>{t.pending}</span> : null}
                  {task.places?.map((place) => (
                    <PlaceTag key={place.id} place={place} />
                  ))}
                  <Markers
                    important={task.important}
                    urgent={task.urgent}
                    importantText={t.important}
                    urgentText={t.urgent}
                  />
                  {subtasks.length === 0 || task.pending ? null : onToggleComplete ? (
                    <SubtaskProgress
                      done={subtasksDone}
                      total={subtasks.length}
                      text={t.subtaskProgress}
                      label={t.subtaskProgressLabel}
                    />
                  ) : (
                    <span>{t.subtaskCount(subtasks.length)}</span>
                  )}
                </div>
              ) : null}
            </div>
            {/* "…" anchors the places popover, which "Places…" in its menu opens (G3). */}
            <Popover open={placesOpen} onOpenChange={setPlacesOpen}>
              {menu}
              {places ? (
                <PopoverContent
                  align="end"
                  aria-label={{ ...defaultPlaceText, ...places.text }.placesFor(task.title)}
                  onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    menuTriggerRef.current?.focus();
                  }}
                >
                  <PlacePicker
                    taskTitle={task.title}
                    places={places.all}
                    selectedIds={task.places?.map((place) => place.id) ?? []}
                    onToggle={(placeId, assigned) => places.onToggle(task.id, placeId, assigned)}
                    onCreate={(values) => places.onCreate(task.id, values)}
                    onUpdate={places.onUpdate}
                    onDelete={places.onDelete}
                    validateName={places.validateName}
                    atLimit={places.atLimit}
                    text={places.text}
                  />
                </PopoverContent>
              ) : null}
            </Popover>
          </div>
        )}
        {task.error ? (
          <UnderTitle columns={columns} className="pb-row-y">
            <p role="alert" className="text-meta text-danger">
              {task.error}
            </p>
          </UnderTitle>
        ) : null}
        <CollapsibleContent>
          {task.description !== null && !editing ? (
            <UnderTitle columns={columns} className="pb-row-y">
              <p className="max-w-measure break-words whitespace-pre-line">{task.description}</p>
            </UnderTitle>
          ) : null}
          {subtasks.length === 0 ? null : onMove ? (
            <SortableGroup
              items={movableSubtasks.map(({ id, title }) => ({ id, title }))}
              onMove={onMove}
              text={t}
            >
              {subtaskList}
            </SortableGroup>
          ) : (
            subtaskList
          )}
          {onAddSubtask && !completed ? (
            <UnderTitle columns={columns} className="py-row-y">
              {addingSubtask ? (
                <QuickAdd
                  validate={validate}
                  onSubmit={async (values) => {
                    const result = await onAddSubtask(task.id, values);
                    // One subtask per opening; "Add subtask" takes focus for the next (decision F7).
                    if (result.ok) closeAddSubtask();
                    return result;
                  }}
                  onCancel={closeAddSubtask}
                  autoFocus
                  text={text}
                />
              ) : (
                <TextAction
                  ref={addSubtaskRef}
                  disabled={task.pending}
                  onClick={() => setAddingSubtask(true)}
                >
                  <Plus aria-hidden="true" className="size-icon stroke-icon" />
                  {t.addSubtask}
                </TextAction>
              )}
            </UnderTitle>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
