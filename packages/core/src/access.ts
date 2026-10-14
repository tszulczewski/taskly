import { type Action } from "./authorization";
import { NotImplementedError } from "./errors";
import type { Role } from "./schemas";
import type { Db } from "./types";

// TODO: look up the user's list_members role; non-members -> NotFoundError, insufficient -> ForbiddenError.
export async function getRole(_db: Db, _userId: string, _listId: string): Promise<Role | null> {
  throw new NotImplementedError("getRole");
}

export async function requireRole(_db: Db, _userId: string, _listId: string, _action: Action): Promise<Role> {
  throw new NotImplementedError("requireRole");
}
