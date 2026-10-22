"use client";

import { Checkbox } from "../../components/ui/checkbox";

export interface TaskCheckboxProps {
  /** Names the checkbox, e.g. "Complete “Seal the bath”"; checked says it is done. */
  label: string;
  completed: boolean;
  onCompletedChange: (completed: boolean) => void;
  disabled?: boolean;
}

/**
 * Completes or reopens a task or subtask (E03-S01): the 20px box in a 44px target after the arrow
 * (R02.1, T7, T10), checked in `color-action-primary` (R02.2, R02.3).
 */
export function TaskCheckbox({ label, completed, onCompletedChange, disabled }: TaskCheckboxProps) {
  return (
    <Checkbox
      aria-label={label}
      checked={completed}
      onCheckedChange={onCompletedChange}
      disabled={disabled}
      data-task-checkbox=""
    />
  );
}
