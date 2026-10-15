import { schema } from "@taskly/db";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getRole, requireRole } from "./access";
import type { Action } from "./authorization";
import { ForbiddenError, NotFoundError } from "./errors";

const url = process.env.DATABASE_URL;
const run = `acc${Date.now()}`;
const ids = {
  owner: `${run}-owner`,
  editor: `${run}-editor`,
  viewer: `${run}-viewer`,
  stranger: `${run}-stranger`,
};
const unknownList = "00000000-0000-4000-8000-000000000000";

describe.skipIf(!url)("access control (real PostgreSQL)", () => {
  const pool = new Pool({ connectionString: url, max: 5 });
  const db = drizzle(pool, { schema });
  let listId: string;
  let otherListId: string;

  beforeAll(async () => {
    await db
      .insert(schema.user)
      .values(Object.values(ids).map((id) => ({ id, name: id, email: `${id}@example.test` })));
    const created = await db
      .insert(schema.lists)
      .values([{ name: "Bathroom" }, { name: "Kitchen" }])
      .returning();
    listId = created[0]!.id;
    otherListId = created[1]!.id;
    await db.insert(schema.listMembers).values([
      { listId, userId: ids.owner, role: "owner" },
      { listId, userId: ids.editor, role: "editor" },
      { listId, userId: ids.viewer, role: "viewer" },
      { listId: otherListId, userId: ids.stranger, role: "owner" },
    ]);
  });

  afterAll(async () => {
    await db.delete(schema.lists).where(inArray(schema.lists.id, [listId, otherListId]));
    await db.delete(schema.user).where(inArray(schema.user.id, Object.values(ids)));
    await pool.end();
  });

  const matrix: Array<[keyof typeof ids, Action, boolean]> = [
    ["owner", "read", true],
    ["owner", "write", true],
    ["owner", "manage", true],
    ["editor", "read", true],
    ["editor", "write", true],
    ["editor", "manage", false],
    ["viewer", "read", true],
    ["viewer", "write", false],
    ["viewer", "manage", false],
  ];

  it.each(matrix)("%s %s -> allowed=%s", async (who, action, allowed) => {
    const result = requireRole(db, ids[who], listId, action);
    if (allowed) await expect(result).resolves.toBe(who);
    else await expect(result).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies a member of another list every action as not found (wrong scope)", async () => {
    for (const action of ["read", "write", "manage"] as const) {
      await expect(requireRole(db, ids.stranger, listId, action)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    }
    await expect(getRole(db, ids.stranger, listId)).resolves.toBeNull();
  });

  it("treats an unknown list and a malformed id like a non-member", async () => {
    await expect(requireRole(db, ids.owner, unknownList, "read")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(requireRole(db, ids.owner, "not-a-uuid", "read")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("makes a concurrent membership removal wait for the checking transaction", async () => {
    const extra = `${run}-temp`;
    await db.insert(schema.user).values({ id: extra, name: "t", email: `${extra}@example.test` });
    await db.insert(schema.listMembers).values({ listId, userId: extra, role: "editor" });

    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    let checked!: () => void;
    const checkedRole = new Promise<void>((resolve) => (checked = resolve));

    const writer = db.transaction(async (tx) => {
      await requireRole(tx, extra, listId, "write");
      checked();
      await hold;
    });
    await checkedRole;

    let removed = false;
    const remover = db
      .delete(schema.listMembers)
      .where(and(eq(schema.listMembers.listId, listId), eq(schema.listMembers.userId, extra)))
      .then(() => (removed = true));

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(removed).toBe(false);

    release();
    await writer;
    await remover;
    expect(removed).toBe(true);
    await expect(getRole(db, extra, listId)).resolves.toBeNull();
    await db.delete(schema.user).where(eq(schema.user.id, extra));
  });

  it("lets only one manage check hold the membership row at a time", async () => {
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    let checked!: () => void;
    const firstChecked = new Promise<void>((resolve) => (checked = resolve));

    const first = db.transaction(async (tx) => {
      await requireRole(tx, ids.owner, listId, "manage");
      checked();
      await hold;
    });
    await firstChecked;

    let secondDone = false;
    const second = db
      .transaction((tx) => requireRole(tx, ids.owner, listId, "manage"))
      .then(() => (secondDone = true));

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(secondDone).toBe(false);

    release();
    await first;
    await second;
    expect(secondDone).toBe(true);
  });
});
