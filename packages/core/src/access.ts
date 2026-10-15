import { schema } from "@taskly/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { type Action, can } from "./authorization";
import { ForbiddenError, NotFoundError } from "./errors";
import type { Role } from "./schemas";
import type { Db } from "./types";

const uuid = z.uuid();

/**
 * The user's role on a list, or null for a non-member (or a malformed list id).
 * The membership row is read `FOR SHARE`: inside a transaction a concurrent removal waits for it.
 */
export async function getRole(db: Db, userId: string, listId: string): Promise<Role | null> {
  if (!uuid.safeParse(listId).success) return null;
  const [row] = await db
    .select({ role: schema.listMembers.role })
    .from(schema.listMembers)
    .where(and(eq(schema.listMembers.listId, listId), eq(schema.listMembers.userId, userId)))
    .limit(1)
    .for("share");
  return row?.role ?? null;
}

/** Non-member -> NotFoundError (no existence leak); insufficient role -> ForbiddenError. */
export async function requireRole(
  db: Db,
  userId: string,
  listId: string,
  action: Action,
): Promise<Role> {
  const role = await getRole(db, userId, listId);
  if (role === null) throw new NotFoundError("List");
  if (!can(role, action)) throw new ForbiddenError();
  return role;
}
