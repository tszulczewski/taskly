import { schema } from "@taskly/db";
import { asc, eq } from "drizzle-orm";
import { requireRole } from "./access";
import { NotImplementedError } from "./errors";
import { createListInput, type Role } from "./schemas";
import type { Db } from "./types";

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

export async function renameList(
  db: Db,
  userId: string,
  listId: string,
  input: unknown,
): Promise<void> {
  const { name } = createListInput.parse(input);
  await db.transaction(async (tx) => {
    await requireRole(tx, userId, listId, "manage");
    await tx.update(schema.lists).set({ name }).where(eq(schema.lists.id, listId));
  });
}

/** Cascades to members, tasks, shopping items and invitations. */
export async function deleteList(db: Db, userId: string, listId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await requireRole(tx, userId, listId, "manage");
    await tx.delete(schema.lists).where(eq(schema.lists.id, listId));
  });
}

/** The user's global shopping list id; created on first use. */
export async function ensureShoppingList(_db: Db, _userId: string): Promise<string> {
  throw new NotImplementedError("ensureShoppingList");
}
