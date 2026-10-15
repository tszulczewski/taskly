import { schema } from "@taskly/db";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError } from "./errors";
import { createList, deleteList, listsForUser, renameList } from "./lists";

const url = process.env.DATABASE_URL;
const run = `lst${Date.now()}`;
const ids = { alice: `${run}-alice`, bob: `${run}-bob`, ed: `${run}-ed`, vi: `${run}-vi` };

describe.skipIf(!url)("lists service (real PostgreSQL)", () => {
  const pool = new Pool({ connectionString: url, max: 3 });
  const db = drizzle(pool, { schema });
  const created: string[] = [];

  beforeAll(async () => {
    await db
      .insert(schema.user)
      .values(Object.values(ids).map((id) => ({ id, name: id, email: `${id}@example.test` })));
  });

  afterAll(async () => {
    if (created.length) await db.delete(schema.lists).where(inArray(schema.lists.id, created));
    await db.delete(schema.user).where(inArray(schema.user.id, Object.values(ids)));
    await pool.end();
  });

  async function newList(owner: string, name: string) {
    const { id } = await createList(db, owner, { name });
    created.push(id);
    return id;
  }

  it("creates a list with the creator as owner and shows it only to its members", async () => {
    const aliceList = await newList(ids.alice, "Bathroom");
    const bobList = await newList(ids.bob, "Garage");

    expect(await listsForUser(db, ids.alice)).toEqual([
      { id: aliceList, name: "Bathroom", kind: "project", role: "owner" },
    ]);
    expect(await listsForUser(db, ids.bob)).toEqual([
      { id: bobList, name: "Garage", kind: "project", role: "owner" },
    ]);
  });

  it("denies a non-member reading, renaming and deleting someone else's list", async () => {
    const aliceList = await newList(ids.alice, "Kitchen");

    await expect(renameList(db, ids.bob, aliceList, { name: "Hacked" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(deleteList(db, ids.bob, aliceList)).rejects.toBeInstanceOf(NotFoundError);
    expect((await listsForUser(db, ids.bob)).map((l) => l.id)).not.toContain(aliceList);

    const [row] = await db.select().from(schema.lists).where(eq(schema.lists.id, aliceList));
    expect(row?.name).toBe("Kitchen");
  });

  it("lets only the owner rename or delete; editors and viewers are forbidden", async () => {
    const listId = await newList(ids.alice, "Hall");
    await db.insert(schema.listMembers).values([
      { listId, userId: ids.ed, role: "editor" },
      { listId, userId: ids.vi, role: "viewer" },
    ]);

    for (const who of [ids.ed, ids.vi]) {
      await expect(renameList(db, who, listId, { name: "x" })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      await expect(deleteList(db, who, listId)).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect((await listsForUser(db, ids.vi)).map((l) => l.role)).toEqual(["viewer"]);

    await renameList(db, ids.alice, listId, { name: "Hallway" });
    const [row] = await db.select().from(schema.lists).where(eq(schema.lists.id, listId));
    expect(row?.name).toBe("Hallway");
  });

  it("deletes a list together with its members and tasks", async () => {
    const listId = await newList(ids.alice, "Attic");
    await db.insert(schema.tasks).values({ listId, title: "Insulate", position: "a0" });

    await deleteList(db, ids.alice, listId);

    expect(await db.select().from(schema.lists).where(eq(schema.lists.id, listId))).toEqual([]);
    expect(await db.select().from(schema.tasks).where(eq(schema.tasks.listId, listId))).toEqual([]);
    expect(
      await db.select().from(schema.listMembers).where(eq(schema.listMembers.listId, listId)),
    ).toEqual([]);
  });
});
