import { schema } from "@taskly/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { type Action, can } from "./authorization";
import { ForbiddenError, NotFoundError } from "./errors";
import type { Role } from "./schemas";
import type { DbOrTx } from "./types";

const uuid = z.uuid();

/**
 * The user's role on a list, or null for a non-member (or a malformed list id).
 * The membership row is locked (`FOR SHARE` by default): inside a transaction a concurrent
 * removal waits for it.
 */
export async function getRole(
  db: DbOrTx,
  userId: string,
  listId: string,
  lock: "share" | "update" = "share",
): Promise<Role | null> {
  if (!uuid.safeParse(listId).success) return null;
  const [row] = await db
    .select({ role: schema.listMembers.role })
    .from(schema.listMembers)
    .where(and(eq(schema.listMembers.listId, listId), eq(schema.listMembers.userId, userId)))
    .limit(1)
    .for(lock);
  return row?.role ?? null;
}

/**
 * Non-member -> NotFoundError (no existence leak); insufficient role -> ForbiddenError.
 * `manage` locks the row `FOR UPDATE`: managers that delete the list cascade-delete their own
 * membership row, and two `FOR SHARE` holders upgrading to that delete would deadlock.
 */
export async function requireRole(
  db: DbOrTx,
  userId: string,
  listId: string,
  action: Action,
): Promise<Role> {
  const role = await getRole(db, userId, listId, action === "manage" ? "update" : "share");
  if (role === null) throw new NotFoundError("List");
  if (!can(role, action)) throw new ForbiddenError();
  return role;
}
