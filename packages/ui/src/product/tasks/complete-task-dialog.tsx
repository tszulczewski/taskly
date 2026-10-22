"use client";

import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { defaultTaskText, type TaskText } from "./text";
import type { TaskItem } from "./types";

export interface CompleteTaskDialogProps {
  /** The task to complete; null keeps the dialog closed. */
  task: TaskItem | null;
  /** How many of its subtasks are still open (at least one, or the list completes at once). */
  openSubtasks: number;
  onConfirm: (task: TaskItem) => void;
  onCancel: () => void;
  /** Where focus goes on close; the list moves it to the task's checkbox. */
  onCloseAutoFocus?: (event: Event) => void;
  text?: Partial<TaskText>;
}

/**
 * Asks before completing a task that still has open subtasks: they are completed with it (R09)
 * and reopening the task does not reopen them (R11), so the cascade cannot be undone (decision I2).
 */
export function CompleteTaskDialog({
  task,
  openSubtasks,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
  text,
}: CompleteTaskDialogProps) {
  const t = { ...defaultTaskText, ...text };
  if (task === null) return null;
  return (
    <ConfirmDialog
      open
      onOpenChange={onCancel}
      title={t.completeTitle(task.title, openSubtasks)}
      description={t.completeDescription}
      confirmLabel={t.completeConfirm}
      confirmVariant="primary"
      cancelLabel={t.cancel}
      onConfirm={() => onConfirm(task)}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  );
}
