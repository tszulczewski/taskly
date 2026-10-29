import { schema } from "@taskly/db";
import { and, asc, desc, DrizzleQueryError, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "./access";
import type { Action } from "./authorization";
import { rollUpEstimate } from "./estimate";
import { ConflictError, NotFoundError, NotImplementedError } from "./errors";
import { positionBetween } from "./position";
import { createTaskInput, type Estimate, type SubtaskView, type TaskView } from "./schemas";
import type { Db, Tx } from "./types";

const { tasks } = schema;
const uuid = z.uuid();

/** The columns a `TaskView` is built from. */
const viewColumns = {
  id: tasks.id,
  parentId: tasks.parentId,
  title: tasks.title,
  description: tasks.description,
  estimateMinGrosze: tasks.estimateMinGrosze,
  estimateMaxGrosze: tasks.estimateMaxGrosze,
};
type ViewRow = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  estimateMinGrosze: number | null;
  estimateMaxGrosze: number | null;
};

/** Sibling order: fractional keys compare bytewise, whatever the column collation. */
const byPosition = sql`${tasks.position} COLLATE "C"`;

function estimateOf(row: ViewRow): Estimate | null {
  const { estimateMinGrosze: minGrosze, estimateMaxGrosze: maxGrosze } = row;
  return minGrosze !== null && maxGrosze !== null ? { minGrosze, maxGrosze } : null;
}

function subtaskView(row: ViewRow): SubtaskView {
  return { id: row.id, title: row.title, description: row.description, estimate: estimateOf(row) };
}

function taskView(row: ViewRow, subtasks: readonly ViewRow[]): TaskView {
  const { estimate, unestimatedSubtasks } = rollUpEstimate(
    estimateOf(row),
    subtasks.map(estimateOf),
  );
  return {
    ...subtaskView(row),
    estimate,
    unestimatedSubtasks,
    subtasks: subtasks.map(subtaskView),
  };
}

/**
 * Constraint violations become 404/409. The new error carries no pg message or detail: those
 * hold the row values ("Failing row contains …"), and a DrizzleQueryError also holds the params.
 */
function translateDbError(error: unknown): unknown {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : null;
  switch (code) {
    case "23503":
      return new NotFoundError("Task");
    case "23505":
      return new ConflictError("Please try again");
    case "23514":
      return new ConflictError("Invalid estimate");
    default:
      return error;
  }
}

/** Runs the service's transaction; a constraint violation is translated after the rollback. */
async function inTransaction<T>(db: Db, work: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.transaction(work);
  } catch (error) {
    throw translateDbError(error);
  }
}

/**
 * Authorizes `action` on the task's list and returns the task row locked `FOR UPDATE`. Lock order
 * as in `deleteList`: membership first (via `requireRole`), then the task. An unknown or malformed
 * id, a list the user is not a member of, or a task deleted meanwhile → NotFoundError("Task").
 */
export async function requireTaskRole(
  tx: Tx,
  userId: string,
  taskId: string,
  action: Action,
): Promise<typeof tasks.$inferSelect> {
  if (!uuid.safeParse(taskId).success) throw new NotFoundError("Task");
  // Unlocked: list_id never changes, and locking the task here would precede the membership.
  const [ref] = await tx.select({ listId: tasks.listId }).from(tasks).where(eq(tasks.id, taskId));
  if (!ref) throw new NotFoundError("Task");
  try {
    await requireRole(tx, userId, ref.listId, action);
  } catch (error) {
    throw error instanceof NotFoundError ? new NotFoundError("Task") : error;
  }
  const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).for("update");
  if (!task) throw new NotFoundError("Task");
  return task;
}

/** Top-level tasks in list order, each with its subtasks (same order) and effective estimate. */
export async function listTasks(db: Db, userId: string, listId: string): Promise<TaskView[]> {
  return inTransaction(db, async (tx) => {
    await requireRole(tx, userId, listId, "read");
    const rows = await tx
      .select(viewColumns)
      .from(tasks)
      .where(eq(tasks.listId, listId))
      .orderBy(byPosition, asc(tasks.id));
    const subtasksOf = new Map<string, ViewRow[]>();
    for (const row of rows) {
      if (row.parentId === null) continue;
      const siblings = subtasksOf.get(row.parentId);
      if (siblings) siblings.push(row);
      else subtasksOf.set(row.parentId, [row]);
    }
    return rows
      .filter((row) => row.parentId === null)
      .map((row) => taskView(row, subtasksOf.get(row.id) ?? []));
  });
}

/** Appends a top-level task to the list and returns its `TaskView`. */
export async function createTask(
  db: Db,
  userId: string,
  listId: string,
  input: unknown,
): Promise<TaskView> {
  const { title, description, estimate } = createTaskInput.parse(input);
  return inTransaction(db, async (tx) => {
    await requireRole(tx, userId, listId, "write");
    // Serializes appends to this list, so concurrent creates never pick the same position.
    await tx
      .select({ id: schema.lists.id })
      .from(schema.lists)
      .where(eq(schema.lists.id, listId))
      .for("no key update");
    const [last] = await tx
      .select({ position: tasks.position })
      .from(tasks)
      .where(and(eq(tasks.listId, listId), isNull(tasks.parentId)))
      .orderBy(desc(byPosition))
      .limit(1);
    const [row] = await tx
      .insert(tasks)
      .values({
        listId,
        title,
        description,
        estimateMinGrosze: estimate?.minGrosze ?? null,
        estimateMaxGrosze: estimate?.maxGrosze ?? null,
        position: positionBetween(last?.position ?? null, null),
      })
      .returning(viewColumns);
    return taskView(row!, []);
  });
}

export async function updateTask(
  _db: Db,
  _userId: string,
  _taskId: string,
  _input: unknown,
): Promise<unknown> {
  throw new NotImplementedError("updateTask");
}
export async function moveTask(
  _db: Db,
  _userId: string,
  _taskId: string,
  _input: { afterId: string | null; beforeId: string | null },
): Promise<unknown> {
  throw new NotImplementedError("moveTask");
}
export async function deleteTask(_db: Db, _userId: string, _taskId: string): Promise<void> {
  throw new NotImplementedError("deleteTask");
}
