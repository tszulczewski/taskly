import { NotImplementedError } from "./errors";
import type { Db } from "./types";

// TODO: shopping items live in a "shopping" list, so sharing reuses list membership.
export async function listShoppingItems(
  _db: Db,
  _userId: string,
  _listId: string,
): Promise<unknown[]> {
  throw new NotImplementedError("listShoppingItems");
}
export async function addShoppingItem(
  _db: Db,
  _userId: string,
  _input: { title: string; listId?: string },
): Promise<unknown> {
  throw new NotImplementedError("addShoppingItem");
}
export async function setShoppingItemChecked(
  _db: Db,
  _userId: string,
  _id: string,
  _checked: boolean,
): Promise<unknown> {
  throw new NotImplementedError("setShoppingItemChecked");
}
export async function deleteShoppingItem(_db: Db, _userId: string, _id: string): Promise<void> {
  throw new NotImplementedError("deleteShoppingItem");
}
