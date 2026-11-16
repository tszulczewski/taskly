import { schema } from "@taskly/db";
import { and, asc, desc, DrizzleQueryError, eq, exists, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "./access";
import type { Action } from "./authorization";
import { rollUpEstimate } from "./estimate";
import { ConflictError, NotFoundError } from "./errors";
import { movePosition } from "./move";
import type { PlaceView } from "./place-rules";
import { placeColumns, placeOrder } from "./places";
import { positionBetween } from "./position";
import {
  completionInput,
  createTaskInput,
  type Estimate,
  LIST_CHANGED_MESSAGE,
  moveTaskInput,
  TASK_COMPLETED_MESSAGE,
  type SubtaskView,
  type TaskView,
  updateTaskInput,
} from "./schemas";
import type { Db, Tx } from "./types";

const { tasks, places, taskPlaces, listMembers } = schema;
const uuid = z.uuid();

/** The columns a `TaskView` is built from. */
const viewColumns = {
  id: tasks.id,
  parentId: tasks.parentId,
  title: tasks.title,
  description: tasks.description,
  estimateMinGrosze: tasks.estimateMinGrosze,
  estimateMaxGrosze: tasks.estimateMaxGrosze,
  status: tasks.status,
  position: tasks.position,
  important: tasks.important,
  urgent: tasks.urgent,
};
type ViewRow = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  estimateMinGrosze: number | null;
  estimateMaxGrosze: number | null;
  status: "todo" | "done";
  position: string;
  important: boolean;
  urgent: boolean;
};

/** The columns `updateTask` may write. */
type TaskChanges = Partial<
  Pick<
    typeof tasks.$inferInsert,
    "title" | "description" | "estimateMinGrosze" | "estimateMaxGrosze" | "important" | "urgent"
  >
>;

/** Sibling order: fractional keys compare bytewise, whatever the column collation. */
const byPosition = sql`${tasks.position} COLLATE "C"`;
/** Display order only: open rows before completed ones (`false` sorts first). */
const doneLast = sql`(${tasks.status} = 'done')`;

function estimateOf(row: ViewRow): Estimate | null {
  const { estimateMinGrosze: minGrosze, estimateMaxGrosze: maxGrosze } = row;
  return minGrosze !== null && maxGrosze !== null ? { minGrosze, maxGrosze } : null;
}

/** Each task's places, in the places' order. */
type PlacesOf = ReadonlyMap<string, PlaceView[]>;
const noPlaces: PlacesOf = new Map();

function subtaskView(row: ViewRow, placesOf: PlacesOf): SubtaskView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    estimate: estimateOf(row),
    completed: row.status === "done",
    important: row.important,
    urgent: row.urgent,
    places: placesOf.get(row.id) ?? [],
    position: row.position,
  };
}

function taskView(row: ViewRow, subtasks: readonly ViewRow[], placesOf: PlacesOf): TaskView {
  const { estimate, unestimatedSubtasks } = rollUpEstimate(
    estimateOf(row),
    subtasks.map(estimateOf),
  );
  return {
    ...subtaskView(row, placesOf),
    estimate,
    unestimatedSubtasks,
    subtasks: subtasks.map((subtask) => subtaskView(subtask, placesOf)),
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

/** Serializes the list's appends and completions (`createTask`, `setTaskCompleted`). */
async function lockList(tx: Tx, listId: string): Promise<void> {
  await tx
    .select({ id: schema.lists.id })
    .from(schema.lists)
    .where(eq(schema.lists.id, listId))
    .for("no key update");
}

/**
 * Authorizes `action` on the task's list and returns the task row locked `FOR UPDATE`. Lock order
 * as in `deleteList`: membership first (via `requireRole`), then, with `withListLock`, the list row
 * (as `createTask` takes it), then the task. An unknown or malformed id, a list the user is not a
 * member of, or a task deleted meanwhile → NotFoundError("Task").
 */
export async function requireTaskRole(
  tx: Tx,
  userId: string,
  taskId: string,
  action: Action,
  { withListLock = false } = {},
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
  if (withListLock) await lockList(tx, ref.listId);
  const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).for("update");
  if (!task) throw new NotFoundError("Task");
  return task;
}

async function hasSubtasks(tx: Tx, task: { id: string; listId: string }): Promise<boolean> {
  const [subtask] = await tx
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.listId, task.listId), eq(tasks.parentId, task.id)))
    .limit(1);
  return subtask !== undefined;
}

/** The places of the tasks `which` selects (one query, in the places' order), by task id. */
async function readPlaces(tx: Tx, which: ReturnType<typeof eq>): Promise<PlacesOf> {
  const rows = await tx
    .select({ taskId: taskPlaces.taskId, ...placeColumns })
    .from(taskPlaces)
    .innerJoin(places, eq(places.id, taskPlaces.placeId))
    .innerJoin(tasks, eq(tasks.id, taskPlaces.taskId))
    .where(which)
    .orderBy(...placeOrder);
  const placesOf = new Map<string, PlaceView[]>();
  for (const { taskId, ...place } of rows) {
    const list = placesOf.get(taskId);
    if (list) list.push(place);
    else placesOf.set(taskId, [place]);
  }
  return placesOf;
}

/**
 * The `TaskView` of a top-level task: its row and its subtasks in list order (open first, then
 * completed, each in plan order), with their places.
 */
async function topLevelView(tx: Tx, topLevelId: string): Promise<TaskView> {
  const holds = or(eq(tasks.id, topLevelId), eq(tasks.parentId, topLevelId))!;
  const rows = await tx
    .select(viewColumns)
    .from(tasks)
    .where(holds)
    .orderBy(doneLast, byPosition, asc(tasks.id));
  const subtasks = rows.filter((row) => row.parentId === topLevelId);
  return taskView(
    rows.find((row) => row.id === topLevelId)!,
    subtasks,
    await readPlaces(tx, holds),
  );
}

/**
 * Top-level tasks in list order (open first, then completed, each in plan order), each with its
 * subtasks (same order) and effective estimate.
 */
export async function listTasks(db: Db, userId: string, listId: string): Promise<TaskView[]> {
  return inTransaction(db, async (tx) => {
    await requireRole(tx, userId, listId, "read");
    const rows = await tx
      .select(viewColumns)
      .from(tasks)
      .where(eq(tasks.listId, listId))
      .orderBy(doneLast, byPosition, asc(tasks.id));
    const placesOf = await readPlaces(tx, eq(tasks.listId, listId));
    const subtasksOf = new Map<string, ViewRow[]>();
    for (const row of rows) {
      if (row.parentId === null) continue;
      const siblings = subtasksOf.get(row.parentId);
      if (siblings) siblings.push(row);
      else subtasksOf.set(row.parentId, [row]);
    }
    return rows
      .filter((row) => row.parentId === null)
      .map((row) => taskView(row, subtasksOf.get(row.id) ?? [], placesOf));
  });
}

/**
 * Appends a task to the list, or a subtask to its parent's subtasks, and returns the `TaskView` of
 * the top-level task that holds it: the new task, or the parent with its new effective estimate.
 */
export async function createTask(
  db: Db,
  userId: string,
  listId: string,
  input: unknown,
): Promise<TaskView> {
  const { title, description, estimate, parentId } = createTaskInput.parse(input);
  return inTransaction(db, async (tx) => {
    await requireRole(tx, userId, listId, "write");
    // Serializes appends to this list, so concurrent creates never pick the same position. A
    // completion takes the same lock first, so the parent's status read below is committed.
    await lockList(tx, listId);
    if (parentId !== null) {
      // A concurrent delete of the parent waits for this transaction, then cascades the subtask;
      // an estimate edit of the parent (FOR UPDATE) waits too, then sees the subtask.
      const [parent] = await tx
        .select({ parentId: tasks.parentId, status: tasks.status })
        .from(tasks)
        .where(and(eq(tasks.id, parentId), eq(tasks.listId, listId)))
        .for("key share");
      if (!parent) throw new NotFoundError("Task");
      if (parent.parentId !== null) throw new ConflictError("Subtasks cannot have subtasks");
      if (parent.status === "done") throw new ConflictError(TASK_COMPLETED_MESSAGE);
    }
    const [last] = await tx
      .select({ position: tasks.position })
      .from(tasks)
      .where(
        and(
          eq(tasks.listId, listId),
          parentId === null ? isNull(tasks.parentId) : eq(tasks.parentId, parentId),
        ),
      )
      .orderBy(desc(byPosition))
      .limit(1);
    const [row] = await tx
      .insert(tasks)
      .values({
        listId,
        parentId,
        title,
        description,
        estimateMinGrosze: estimate?.minGrosze ?? null,
        estimateMaxGrosze: estimate?.maxGrosze ?? null,
        position: positionBetween(last?.position ?? null, null),
      })
      .returning(viewColumns);
    return parentId === null ? taskView(row!, [], noPlaces) : topLevelView(tx, parentId);
  });
}

/**
 * Writes only the keys present in the input (`estimate: null` clears both bounds; a marker alone
 * leaves the other one as it is) and returns the `TaskView` of the top-level task that holds it:
 * the task, or a subtask's parent. A task with subtasks takes its estimate from them, so an
 * estimate edit of one is refused. Markers can change on a completed row too.
 */
export async function updateTask(
  db: Db,
  userId: string,
  taskId: string,
  input: unknown,
): Promise<TaskView> {
  const { title, description, estimate, important, urgent } = updateTaskInput.parse(input);
  const changes: TaskChanges = {};
  if (title !== undefined) changes.title = title;
  if (description !== undefined) changes.description = description;
  if (important !== undefined) changes.important = important;
  if (urgent !== undefined) changes.urgent = urgent;
  if (estimate !== undefined) {
    changes.estimateMinGrosze = estimate?.minGrosze ?? null;
    changes.estimateMaxGrosze = estimate?.maxGrosze ?? null;
  }
  return inTransaction(db, async (tx) => {
    const task = await requireTaskRole(tx, userId, taskId, "write");
    // A separate statement after the FOR UPDATE: under READ COMMITTED it sees a subtask whose
    // insert held this row FOR KEY SHARE and committed while we waited for the lock.
    if (estimate !== undefined && task.parentId === null && (await hasSubtasks(tx, task))) {
      throw new ConflictError("A task with subtasks takes its estimate from them");
    }
    await tx.update(tasks).set(changes).where(eq(tasks.id, task.id));
    return topLevelView(tx, task.parentId ?? task.id);
  });
}

/** The row and, for a task, its subtasks (R09). Positions are not touched. */
async function completeWithSubtasks(tx: Tx, taskId: string): Promise<void> {
  await tx
    .update(tasks)
    .set({ status: "done" })
    .where(or(eq(tasks.id, taskId), eq(tasks.parentId, taskId)));
}

/** Only this row: open, and keyed before its first sibling; with no sibling the key stays. */
async function reopen(tx: Tx, task: typeof tasks.$inferSelect): Promise<void> {
  const [first] = await tx
    .select({ position: tasks.position })
    .from(tasks)
    .where(
      and(
        eq(tasks.listId, task.listId),
        task.parentId === null ? isNull(tasks.parentId) : eq(tasks.parentId, task.parentId),
        ne(tasks.id, task.id),
      ),
    )
    .orderBy(byPosition)
    .limit(1);
  await tx
    .update(tasks)
    .set({
      status: "todo",
      position: first ? positionBetween(null, first.position) : task.position,
    })
    .where(eq(tasks.id, task.id));
}

/**
 * Completes or reopens a task or subtask and returns the `TaskView` of the top-level task that holds
 * it (spec E03). Completing a task completes its subtasks in one statement (R09) and writes no
 * position. Reopening writes only that row, with a position before its first sibling (completed
 * ones included), so it reads first among the open rows (decision 2026-10-21); its subtasks, or a
 * subtask's task, keep their state (R11, Q2). A row already in the target state is not written.
 * The list lock comes before the task's, the order of `createTask`, which holds the list while it
 * waits for the parent: the other order would deadlock against a concurrent subtask add.
 */
export async function setTaskCompleted(
  db: Db,
  userId: string,
  taskId: string,
  input: unknown,
): Promise<TaskView> {
  const { completed } = completionInput.parse(input);
  return inTransaction(db, async (tx) => {
    const task = await requireTaskRole(tx, userId, taskId, "write", { withListLock: true });
    if (task.status !== (completed ? "done" : "todo")) {
      await (completed ? completeWithSubtasks(tx, task.id) : reopen(tx, task));
    }
    return topLevelView(tx, task.parentId ?? task.id);
  });
}

/**
 * Assigns a place to a task or subtask, or removes it (`assigned: false`), and returns the
 * `TaskView` of the top-level task that holds it (spec E02, #19). Idempotent: assigning twice or
 * removing an absent place writes nothing. Only that row changes, never its task or subtasks
 * (AC9, D21). Lock order: membership → task (`requireTaskRole`) → place `FOR KEY SHARE`, so a
 * concurrent delete of the place waits for this or wins cleanly (404). The place must belong to an
 * owner of the task's list (Q3); `EXISTS`, since a list may have several owner rows (P4). A
 * malformed place id answers 404 before any query (P3).
 */
export async function setTaskPlace(
  db: Db,
  userId: string,
  taskId: string,
  placeId: string,
  { assigned }: { assigned: boolean },
): Promise<TaskView> {
  if (!uuid.safeParse(placeId).success) throw new NotFoundError("Place");
  return inTransaction(db, async (tx) => {
    const task = await requireTaskRole(tx, userId, taskId, "write");
    const ownedByListOwner = exists(
      tx
        .select({ userId: listMembers.userId })
        .from(listMembers)
        .where(
          and(
            eq(listMembers.listId, task.listId),
            eq(listMembers.userId, places.userId),
            eq(listMembers.role, "owner"),
          ),
        ),
    );
    const [place] = await tx
      .select({ id: places.id })
      .from(places)
      .where(and(eq(places.id, placeId), ownedByListOwner))
      .for("key share");
    if (!place) throw new NotFoundError("Place");
    if (assigned) {
      await tx.insert(taskPlaces).values({ taskId: task.id, placeId }).onConflictDoNothing();
    } else {
      await tx
        .delete(taskPlaces)
        .where(and(eq(taskPlaces.taskId, task.id), eq(taskPlaces.placeId, placeId)));
    }
    return topLevelView(tx, task.parentId ?? task.id);
  });
}

/**
 * Moves a task, or a subtask within its task, between `afterId` and `beforeId`, its new neighbours
 * among its open siblings (spec E02, #17), and returns the `TaskView` of the top-level task that
 * holds it. Under the list lock (the order of `createTask` and a reopen, which choose keys in the
 * list too), so no two siblings get the same key. Only the moved row is written, and not at all
 * when it already sits there. A completed row → 409 "Task is completed" (AC9); neighbours that are
 * not adjacent open siblings, under another parent or at the other level → 409 (AC5, M-1).
 */
export async function moveTask(
  db: Db,
  userId: string,
  taskId: string,
  input: unknown,
): Promise<TaskView> {
  const { afterId, beforeId } = moveTaskInput.parse(input);
  return inTransaction(db, async (tx) => {
    const task = await requireTaskRole(tx, userId, taskId, "write", { withListLock: true });
    if (task.status === "done") throw new ConflictError(TASK_COMPLETED_MESSAGE);
    const siblings = await tx
      .select({ id: tasks.id, position: tasks.position, status: tasks.status })
      .from(tasks)
      .where(
        and(
          eq(tasks.listId, task.listId),
          task.parentId === null ? isNull(tasks.parentId) : eq(tasks.parentId, task.parentId),
        ),
      )
      .orderBy(byPosition);
    const outcome = movePosition(
      siblings.map(({ id, position, status }) => ({ id, position, completed: status === "done" })),
      task.id,
      afterId,
      beforeId,
    );
    if (outcome.kind === "conflict") throw new ConflictError(LIST_CHANGED_MESSAGE);
    if (outcome.kind === "move") {
      await tx.update(tasks).set({ position: outcome.position }).where(eq(tasks.id, task.id));
    }
    return topLevelView(tx, task.parentId ?? task.id);
  });
}

/**
 * Deletes the task; its subtasks go with it through the parent FK's cascade. Returns null for a
 * top-level task and the parent's `TaskView` for a subtask: after the last one, the parent's own
 * figure is its estimate again, with no write to the parent.
 */
export async function deleteTask(db: Db, userId: string, taskId: string): Promise<TaskView | null> {
  return inTransaction(db, async (tx) => {
    const task = await requireTaskRole(tx, userId, taskId, "write");
    await tx.delete(tasks).where(eq(tasks.id, task.id));
    return task.parentId === null ? null : topLevelView(tx, task.parentId);
  });
}
