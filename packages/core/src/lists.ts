import { NotImplementedError } from "./errors";
import type { Role } from "./schemas";
import type { Db } from "./types";

// TODO: list CRUD with authorization (owner manages; members read via list_members).
export type ListSummaryRow = { id: string; name: string; kind: "project" | "shopping"; role: Role };

export async function listsForUser(_db: Db, _userId: string): Promise<ListSummaryRow[]> {
  throw new NotImplementedError("listsForUser");
}
export async function createList(_db: Db, _userId: string, _input: { name: string }): Promise<{ id: string }> {
  throw new NotImplementedError("createList");
}
export async function renameList(_db: Db, _userId: string, _listId: string, _input: { name: string }): Promise<void> {
  throw new NotImplementedError("renameList");
}
export async function deleteList(_db: Db, _userId: string, _listId: string): Promise<void> {
  throw new NotImplementedError("deleteList");
}
/** The user's global shopping list id; created on first use. */
export async function ensureShoppingList(_db: Db, _userId: string): Promise<string> {
  throw new NotImplementedError("ensureShoppingList");
}
