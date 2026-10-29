import { schema } from "@taskly/db";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { requireRole } from "./access";
import { ConflictError, NotImplementedError } from "./errors";
import { createListInput, type Role } from "./schemas";
import type { Db, DbOrTx, Tx } from "./types";

export type ListSummaryRow = { id: string; name: string; kind: "project" | "shopping"; role: Role };

/** Only the lists the user is a member of, oldest first. */
export async function listsForUser(db: Db, userId: string): Promise<ListSummaryRow[]> {
  return db
    .select({
      id: schema.lists.id,
      name: schema.lists.name,
      kind: schema.lists.kind,
      role: schema.listMembers.role,
    })
    .from(schema.listMembers)
    .innerJoin(schema.lists, eq(schema.lists.id, schema.listMembers.listId))
    .where(eq(schema.listMembers.userId, userId))
    .orderBy(asc(schema.lists.createdAt), asc(schema.lists.id));
}

export async function createList(db: Db, userId: string, input: unknown): Promise<{ id: string }> {
  const { name } = createListInput.parse(input);
  return db.transaction(async (tx) => {
    const [list] = await tx
      .insert(schema.lists)
      .values({ name })
      .returning({ id: schema.lists.id });
    await tx.insert(schema.listMembers).values({ listId: list!.id, userId, role: "owner" });
    return { id: list!.id };
  });
}

/** The global shopping list is permanent: it is recreated on first use, so it is never renamed or deleted. */
async function requireManagedProjectList(
  tx: Tx,
  userId: string,
  listId: string,
): Promise<{ defaultForUserId: string | null }> {
  await requireRole(tx, userId, listId, "manage");
  // The membership row is locked and cascades from the list, so the list exists. Not locked:
  // writers lock the list row after their membership, so taking it here would invert that order.
  const [list] = await tx
    .select({ kind: schema.lists.kind, defaultForUserId: schema.lists.defaultForUserId })
    .from(schema.lists)
    .where(eq(schema.lists.id, listId));
  if (list!.kind === "shopping") throw new ConflictError("The shopping list cannot be changed");
  return { defaultForUserId: list!.defaultForUserId };
}

export async function renameList(
  db: Db,
  userId: string,
  listId: string,
  input: unknown,
): Promise<void> {
  const { name } = createListInput.parse(input);
  await db.transaction(async (tx) => {
    await requireManagedProjectList(tx, userId, listId);
    await tx.update(schema.lists).set({ name }).where(eq(schema.lists.id, listId));
  });
}

/** Cascades to members, tasks, shopping items and invitations. The default list is kept. */
export async function deleteList(db: Db, userId: string, listId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const list = await requireManagedProjectList(tx, userId, listId);
    if (list.defaultForUserId !== null) {
      throw new ConflictError("The default list cannot be deleted");
    }
    // Writers hold their own membership FOR SHARE and then lock the list row. Locking every
    // membership (in one order) before the cascade makes this wait for them, not deadlock.
    await tx
      .select({ userId: schema.listMembers.userId })
      .from(schema.listMembers)
      .where(eq(schema.listMembers.listId, listId))
      .orderBy(asc(schema.listMembers.userId))
      .for("update");
    await tx.delete(schema.lists).where(eq(schema.lists.id, listId));
  });
}

const DEFAULT_LIST_NAME = "My renovation";

async function findDefaultListId(db: DbOrTx, userId: string): Promise<string | undefined> {
  const [list] = await db
    .select({ id: schema.lists.id })
    .from(schema.lists)
    .where(and(eq(schema.lists.defaultForUserId, userId), eq(schema.lists.kind, "project")));
  return list?.id;
}

/**
 * The user's default project list id, created with an owner membership on the first call.
 * The session user is the authorization. Concurrent first calls return the same list.
 */
export async function ensureDefaultList(db: Db, userId: string): Promise<string> {
  const existing = await findDefaultListId(db, userId);
  if (existing) return existing;
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(schema.lists)
      .values({ name: DEFAULT_LIST_NAME, kind: "project", defaultForUserId: userId })
      // Must match the partial unique index lists_default_for_user_kind_uq, predicate included.
      .onConflictDoNothing({
        target: [schema.lists.defaultForUserId, schema.lists.kind],
        where: isNotNull(schema.lists.defaultForUserId),
      })
      .returning({ id: schema.lists.id });
    if (created) {
      await tx.insert(schema.listMembers).values({ listId: created.id, userId, role: "owner" });
      return created.id;
    }
    // The conflicting row was committed by the other call, so this new statement sees it.
    return (await findDefaultListId(tx, userId))!;
  });
}

/** The user's global shopping list id; created on first use. */
export async function ensureShoppingList(_db: Db, _userId: string): Promise<string> {
  throw new NotImplementedError("ensureShoppingList");
}
