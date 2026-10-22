"use client";

import { useState } from "react";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { defaultTaskText, type TaskText } from "./text";
import type { TaskItem } from "./types";

export interface DeleteTaskDialogProps {
  /** The task to delete; null keeps the dialog closed. */
  task: TaskItem | null;
  /** Deletes; resolve `false` (or throw) to keep the dialog open with an error. */
  onConfirm: (task: TaskItem) => Promise<boolean>;
  /** The dialog closed; `deleted` says whether the task is gone. */
  onClose: (deleted: boolean) => void;
  /** Where focus goes on close (ConfirmDialog); the list moves it to the row's "…" or the list. */
  onCloseAutoFocus?: (event: Event) => void;
  text?: Partial<TaskText>;
}

/**
 * Asks before a task and its subtasks are deleted for good, naming both (spec E01, Delete; there
 * is no undo). The dialog stays open while deleting and shows a failure inside.
 */
export function DeleteTaskDialog({
  task,
  onConfirm,
  onClose,
  onCloseAutoFocus,
  text,
}: DeleteTaskDialogProps) {
  const t = { ...defaultTaskText, ...text };
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const close = (deleted: boolean) => {
    setPending(false);
    setError(undefined);
    onClose(deleted);
  };

  if (task === null) return null;

  const confirm = async () => {
    setPending(true);
    setError(undefined);
    const deleted = await onConfirm(task).catch(() => false);
    if (deleted) {
      close(true);
      return;
    }
    setPending(false);
    setError(t.deleteError);
  };

  return (
    <ConfirmDialog
      open
      // Without a trigger the dialog can only ask to close (Cancel or Escape).
      onOpenChange={() => close(false)}
      title={t.deleteTitle(task.title, task.subtasks?.length ?? 0)}
      confirmLabel={t.deleteConfirm}
      pendingLabel={t.deleting}
      cancelLabel={t.cancel}
      onConfirm={() => void confirm()}
      pending={pending}
      error={error}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  );
}
