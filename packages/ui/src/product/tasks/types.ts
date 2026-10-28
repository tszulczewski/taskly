import type { FieldErrors, SubmitResult } from "../../lib/use-form";
import type { Place } from "../places/types";

export type TaskField = "title" | "amount" | "upTo" | "description";
/**
 * What the task forms send: text as typed. The app turns the two amounts into an estimate
 * (`estimateFromAmounts`): one filled field is an exact price, both a range (R18).
 */
export type TaskFormValues = Record<TaskField, string>;
export type TaskFieldErrors = FieldErrors<TaskField>;
export type TaskSubmit = (values: TaskFormValues) => Promise<SubmitResult<TaskField>>;

/** One task or subtask as the list shows it. Amounts arrive formatted (P1). */
export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  /**
   * The estimate as shown (`formatPlnRange`): a range, "1 200–1 500 zł", or one amount, "500 zł",
   * when it is an exact price (R18). For a task with subtasks it is their sum (R12). Null when
   * there is none.
   */
  estimate: string | null;
  /**
   * The amounts as the edit form shows them, e.g. "1 200": an exact price in `amount` with `upTo`
   * empty, a range in both; both empty when there is no estimate.
   */
  amount: string;
  upTo: string;
  /** Subtasks without an estimate, left out of the task's sum (R13); shown in the meta line. */
  unestimatedSubtasks?: number;
  /**
   * A short note in the row after the server confirmed a change to it, e.g. that its estimate is
   * now the sum of its subtasks (spec E01, Roll-up messages). The app clears it on the next change.
   */
  notice?: string;
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

export const emptyTaskValues: TaskFormValues = { title: "", amount: "", upTo: "", description: "" };

export type Marker = "important" | "urgent";
