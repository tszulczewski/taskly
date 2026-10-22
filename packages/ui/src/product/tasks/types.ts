import type { FieldErrors, SubmitResult } from "../../lib/use-form";
import type { Place } from "../places/types";

export type TaskField = "title" | "description" | "min" | "max";
/** What the task forms send: text as typed; the app parses amounts (`parsePlnToGrosze`). */
export type TaskFormValues = Record<TaskField, string>;
export type TaskFieldErrors = FieldErrors<TaskField>;
export type TaskSubmit = (values: TaskFormValues) => Promise<SubmitResult<TaskField>>;

/** One task or subtask as the list shows it. Amounts arrive formatted (P1). */
export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  /** The range as shown, e.g. "1 200–1 500 zł" (`formatPlnRange`); null when there is none. */
  estimate: string | null;
  /** The amounts as the edit form shows them, e.g. "1 200"; empty when there is no estimate. */
  min: string;
  max: string;
  /** Not yet confirmed by the server: dimmed, with its actions disabled (spec E01). */
  pending?: boolean;
  /** Why the last change to this row failed after a rollback (spec E01: inline, no toast). */
  error?: string;
  /** The two independent markers (D07, D21; E02-S02). */
  important?: boolean;
  urgent?: boolean;
  /** The places this task belongs to, in the list's order of places (D09, D21; E02-S03). */
  places?: Place[];
  /** Marked done (E03-S01): shown muted and struck through, after the open rows of its group. */
  completed?: boolean;
  /** Subtasks of a task; subtasks have none (one level, spec E01). */
  subtasks?: TaskItem[];
}

export const emptyTaskValues: TaskFormValues = { title: "", description: "", min: "", max: "" };

export type Marker = "important" | "urgent";
