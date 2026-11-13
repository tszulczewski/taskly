"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { EmptyState } from "../../components/empty-state";
import { ErrorState } from "../../components/error-state";
import { Skeleton } from "../../components/ui/skeleton";
import { Surface } from "../../components/ui/surface";
import { useMoveAnimation } from "../../lib/use-move-animation";
import { CompleteTaskDialog } from "./complete-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { SortableGroup, rowMove, type MovePosition } from "./sortable";
import { TaskRow, type PlaceOptions, type TaskChange, type TaskEdit } from "./task-row";
import { defaultTaskText, type TaskText } from "./text";
import type { Marker, TaskFieldErrors, TaskFormValues, TaskItem } from "./types";

export interface TaskListProps {
  /** loading: the first load (a skeleton). error: it failed (a message with "Try again"). */
  status: "loading" | "error" | "ready";
  /** Tasks in list order, each with its subtasks. */
  tasks: TaskItem[];
  /** Loads the list again (refetch). */
  onRetry: () => void;
  retrying?: boolean;
  validate: (values: TaskFormValues) => TaskFieldErrors;
  /** Saves an edit; gets the task as it was when the form opened. */
  onEdit: TaskEdit;
  /** Adds a subtask; turns on "Add subtask". Without it the list shows tasks only. */
  onAddSubtask?: TaskChange;
  /** Deletes after the user confirmed; resolve `false` (or throw) to show the failure in the dialog. */
  onDelete: (id: string) => Promise<boolean>;
  /** The task or subtask just added (spec E01, After an add). */
  highlightId?: string;
  /** Moves a task or a subtask within its group (E02-S01, decision G1); turns on ordering. */
  onMove?: (id: string, position: MovePosition) => void;
  /** Sets or clears a marker (E02-S02). */
  onToggleMarker?: (id: string, marker: Marker, on: boolean) => void;
  /** Places of the list (E02-S03). */
  places?: PlaceOptions;
  /**
   * Completes or reopens a task or subtask (E03-S01); turns on the checkboxes. The app completes
   * the subtasks of a completed task (R09) and puts completed rows after the open ones.
   */
  onToggleComplete?: (id: string, completed: boolean) => void;
  text?: Partial<TaskText>;
}

const skeletonRows = ["first", "second", "third"];

/**
 * The task list: one surface, a row per task with its subtasks nested (R02.1). Covers the first
 * load, a failed load and an empty list (spec E01, States), and asks before a delete and before
 * completing a task with open subtasks (decision I2). Rows slide to their new place when a task is
 * completed or reopened (Luki 8).
 */
export function TaskList({
  status,
  tasks,
  onRetry,
  retrying,
  validate,
  onEdit,
  onAddSubtask,
  onDelete,
  highlightId,
  onMove,
  onToggleMarker,
  places,
  onToggleComplete,
  text,
}: TaskListProps) {
  const t = { ...defaultTaskText, ...text };
  const [deleting, setDeleting] = useState<TaskItem | null>(null);
  const [completing, setCompleting] = useState<{ task: TaskItem; open: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLElement | null>(null);
  const deleted = useRef(false);
  // The row whose checkbox was used; it moves, so focus is put back on its checkbox.
  const toggled = useRef<string | null>(null);
  const completedKey = tasks
    .flatMap((task) => [task, ...(task.subtasks ?? [])])
    .filter((task) => task.completed)
    .map((task) => task.id)
    .join(" ");
  const animation = useMoveAnimation(listRef, completedKey);

  const checkboxOf = (id: string | null) =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-move-id]") ?? [])
      .find((row) => row.dataset.moveId === id)
      ?.querySelector<HTMLElement>("[data-task-checkbox]");

  useLayoutEffect(() => {
    const box = checkboxOf(toggled.current);
    if (box && document.activeElement !== box) box.focus();
  }, [completedKey]);

  const applyToggle = (task: TaskItem, completed: boolean) => {
    animation.snapshot();
    toggled.current = task.id;
    onToggleComplete?.(task.id, completed);
  };

  if (status === "loading") {
    return (
      <Surface data-slot="task-list" aria-busy="true">
        {/* The same box as a row's text (one target high between the row's padding), so the list
            does not move when the rows arrive (decision N8): two meta-sized bars on phones, where
            the estimate goes under the title, and one from 640px, where a 36px block holds one line
            (V1).
            The columns before the title stay empty, so the bars start where titles start (O3). */}
        {skeletonRows.map((row) => (
          <div
            key={row}
            className="flex gap-group border-t border-divider px-inset py-row-y first:border-t-0"
          >
            {onMove ? (
              <span aria-hidden="true" className="hidden w-touch shrink-0 wide:block" />
            ) : null}
            <span aria-hidden="true" className="hidden w-touch shrink-0 wide:block" />
            {onToggleComplete ? <span aria-hidden="true" className="w-touch shrink-0" /> : null}
            <div className="flex min-h-touch min-w-0 flex-1 flex-col justify-center gap-inline text-meta">
              <Skeleton className="w-2/3" />
              <Skeleton className="w-1/3 wide:hidden" />
            </div>
          </div>
        ))}
        <span role="status" className="sr-only">
          {t.loading}
        </span>
      </Surface>
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        title={t.loadError}
        onRetry={onRetry}
        retrying={retrying}
        retryLabel={t.retry}
        retryingLabel={t.retrying}
      />
    );
  }

  if (tasks.length === 0) {
    return (
      // Focusable so focus has a place to go after the last task was deleted (O4).
      <Surface
        ref={emptyRef}
        tabIndex={-1}
        data-slot="task-list"
        className="outline-none focus-visible:focus-ring"
      >
        <EmptyState title={t.emptyTitle}>{t.emptyBody}</EmptyState>
      </Surface>
    );
  }

  // Pending rows have temporary ids, which must never reach the server (spec E01); completed rows
  // stay after the open ones (decision 2026-10-21).
  const movable = tasks.filter((task) => !task.pending && !task.completed);
  const ids = movable.map((task) => task.id);

  const list = (
    <Surface asChild>
      {/* Focusable so focus has a place to go after its row was deleted. */}
      <ul
        ref={listRef}
        tabIndex={-1}
        aria-label={t.list}
        data-slot="task-list"
        className="outline-none focus-visible:focus-ring"
      >
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            level="task"
            validate={validate}
            onEdit={onEdit}
            onAddSubtask={onAddSubtask}
            onRequestDelete={(target, trigger) => {
              menuTrigger.current = trigger;
              setDeleting(target);
            }}
            highlightId={highlightId}
            move={onMove && rowMove(ids, task.id, onMove)}
            onMove={onMove}
            onToggleMarker={onToggleMarker}
            places={places}
            onToggleComplete={
              onToggleComplete &&
              ((target, completed) => {
                const open = (target.subtasks ?? []).filter((subtask) => !subtask.completed);
                if (completed && open.length > 0) {
                  toggled.current = target.id;
                  setCompleting({ task: target, open: open.length });
                } else applyToggle(target, completed);
              })
            }
            text={text}
          />
        ))}
      </ul>
    </Surface>
  );

  return (
    <>
      <SortableGroup
        items={movable.map(({ id, title }) => ({ id, title }))}
        onMove={onMove}
        text={t}
      >
        {list}
      </SortableGroup>
      <DeleteTaskDialog
        task={deleting}
        onConfirm={(task) => onDelete(task.id)}
        onClose={(wasDeleted) => {
          deleted.current = wasDeleted;
          setDeleting(null);
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          // The row (and its "…") may already be gone, and after the last task the list too:
          // focus goes to the first of these still on the page, never to the page (O4).
          const targets = [deleted.current ? null : menuTrigger.current, listRef.current];
          (targets.find((target) => target?.isConnected) ?? emptyRef.current)?.focus();
        }}
        text={text}
      />
      <CompleteTaskDialog
        task={completing?.task ?? null}
        openSubtasks={completing?.open ?? 0}
        onConfirm={(task) => {
          setCompleting(null);
          applyToggle(task, true);
        }}
        onCancel={() => setCompleting(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          checkboxOf(toggled.current)?.focus();
        }}
        text={text}
      />
    </>
  );
}
