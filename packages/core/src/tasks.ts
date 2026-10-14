import { NotImplementedError } from "./errors";
import type { Db } from "./types";

// TODO: task/subtask CRUD; reorder writes only the moved row (fractional `position`).
export async function listTasks(_db: Db, _userId: string, _listId: string): Promise<unknown[]> {
  throw new NotImplementedError("listTasks");
}
export async function createTask(_db: Db, _userId: string, _input: unknown): Promise<unknown> {
  throw new NotImplementedError("createTask");
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
