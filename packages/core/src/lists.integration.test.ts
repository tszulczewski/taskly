import { schema } from "@taskly/db";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { createList, deleteList, ensureDefaultList, listsForUser, renameList } from "./lists";

const url = process.env.DATABASE_URL;
const run = `lst${Date.now()}`;
const ids = { alice: `${run}-alice`, bob: `${run}-bob`, ed: `${run}-ed`, vi: `${run}-vi` };

describe.skipIf(!url)("lists service (real PostgreSQL)", () => {
  const pool = new Pool({ connectionString: url, max: 3 });
  const db = drizzle(pool, { schema });
  const created: string[] = [];
  const extraUsers: string[] = [];

  beforeAll(async () => {
    await db
      .insert(schema.user)
      .values(Object.values(ids).map((id) => ({ id, name: id, email: `${id}@example.test` })));
  });

  afterAll(async () => {
    if (created.length) await db.delete(schema.lists).where(inArray(schema.lists.id, created));
    await db
      .delete(schema.user)
      .where(inArray(schema.user.id, [...Object.values(ids), ...extraUsers]));
    await pool.end();
  });

  /** A fresh user with no lists, deleted (with its default lists) in afterAll. */
  async function newUser(tag: string) {
    const id = `${run}-${tag}`;
    await db.insert(schema.user).values({ id, name: id, email: `${id}@example.test` });
    extraUsers.push(id);
    return id;
  }

  /** The user's lists that are marked as a default, with every membership row of each. */
  async function defaultListsOf(userId: string) {
    const lists = await db
      .select()
      .from(schema.lists)
      .where(eq(schema.lists.defaultForUserId, userId));
    const members = lists.length
      ? await db
          .select({
            listId: schema.listMembers.listId,
            userId: schema.listMembers.userId,
            role: schema.listMembers.role,
          })
          .from(schema.listMembers)
          .where(
            inArray(
              schema.listMembers.listId,
              lists.map((l) => l.id),
            ),
          )
      : [];
    return { lists, members };
  }

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

  it("never renames or deletes the global shopping list", async () => {
    const [list] = await db
      .insert(schema.lists)
      .values({ name: "Shopping", kind: "shopping" })
      .returning({ id: schema.lists.id });
    created.push(list!.id);
    await db
      .insert(schema.listMembers)
      .values({ listId: list!.id, userId: ids.alice, role: "owner" });

    await expect(renameList(db, ids.alice, list!.id, { name: "x" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(deleteList(db, ids.alice, list!.id)).rejects.toBeInstanceOf(ConflictError);
    const [row] = await db.select().from(schema.lists).where(eq(schema.lists.id, list!.id));
    expect(row?.name).toBe("Shopping");
  });

  it("serializes two simultaneous deletes: one wins, the other is not found (no deadlock)", async () => {
    const listId = await newList(ids.alice, "Shed");

    const results = await Promise.allSettled([
      deleteList(db, ids.alice, listId),
      deleteList(db, ids.alice, listId),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(NotFoundError);
  });

  describe("ensureDefaultList", () => {
    it("creates one 'My renovation' project list owned by the user and returns it again", async () => {
      const user = await newUser("first");

      const id = await ensureDefaultList(db, user);
      const again = await ensureDefaultList(db, user);

      expect(again).toBe(id);
      const { lists, members } = await defaultListsOf(user);
      expect(lists).toEqual([
        expect.objectContaining({
          id,
          name: "My renovation",
          kind: "project",
          defaultForUserId: user,
        }),
      ]);
      expect(members).toEqual([{ listId: id, userId: user, role: "owner" }]);
      expect(await listsForUser(db, user)).toEqual([
        { id, name: "My renovation", kind: "project", role: "owner" },
      ]);
    });

    it("gives two concurrent first calls the same list with one owner row", async () => {
      const user = await newUser("race");

      const [a, b] = await Promise.all([ensureDefaultList(db, user), ensureDefaultList(db, user)]);

      expect(a).toBe(b);
      const { lists, members } = await defaultListsOf(user);
      expect(lists.map((l) => l.id)).toEqual([a]);
      expect(members).toEqual([{ listId: a, userId: user, role: "owner" }]);
    });

    it("returns the list another transaction committed while its insert waited (ON CONFLICT path)", async () => {
      const user = await newUser("conflict");
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      let markInserted!: (id: string) => void;
      const inserted = new Promise<string>((resolve) => (markInserted = resolve));
      // Inserts the default row without a member and holds the index entry until released.
      const blocker = db.transaction(async (tx) => {
        const [row] = await tx
          .insert(schema.lists)
          .values({ name: "Other tab", kind: "project", defaultForUserId: user })
          .returning({ id: schema.lists.id });
        markInserted(row!.id);
        await gate;
      });
      const blockerId = await inserted;

      // Settled at once, so an early failure cannot surface as an unhandled rejection.
      const ensuring = ensureDefaultList(db, user).then(
        (id) => ({ id }),
        (error: unknown) => ({ error }),
      );
      try {
        await waitForLockWait();
      } finally {
        // Always end the blocker, or its open transaction stalls the cleanup in afterAll.
        release();
        await blocker;
      }

      await expect(ensuring).resolves.toEqual({ id: blockerId });
      const { lists, members } = await defaultListsOf(user);
      expect(lists.map((l) => l.id)).toEqual([blockerId]);
      // The losing call adds no membership of its own.
      expect(members).toEqual([]);
    });

    it("keeps separate default lists per user", async () => {
      const [u1, u2] = [await newUser("sep1"), await newUser("sep2")];

      const [l1, l2] = await Promise.all([ensureDefaultList(db, u1), ensureDefaultList(db, u2)]);

      expect(l1).not.toBe(l2);
      expect((await defaultListsOf(u1)).members).toEqual([
        { listId: l1, userId: u1, role: "owner" },
      ]);
      expect((await defaultListsOf(u2)).members).toEqual([
        { listId: l2, userId: u2, role: "owner" },
      ]);
      expect((await listsForUser(db, u2)).map((l) => l.id)).toEqual([l2]);
    });

    it("ignores the user's other lists, including a default shopping list", async () => {
      const user = await newUser("others");
      const projectList = await newList(user, "Bathroom");
      const [shopping] = await db
        .insert(schema.lists)
        .values({ name: "Shopping", kind: "shopping", defaultForUserId: user })
        .returning({ id: schema.lists.id });

      const id = await ensureDefaultList(db, user);

      expect([projectList, shopping!.id]).not.toContain(id);
      const [row] = await db
        .select({ kind: schema.lists.kind })
        .from(schema.lists)
        .where(and(eq(schema.lists.id, id), eq(schema.lists.defaultForUserId, user)));
      expect(row).toEqual({ kind: "project" });
    });
  });

  /** Waits until some backend of this database is blocked on a lock (the ensuring insert). */
  async function waitForLockWait() {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const { rows } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity
         WHERE datname = current_database() AND wait_event_type = 'Lock'
           AND query ILIKE 'insert into "lists"%'`,
      );
      if (rows[0]!.n > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("ensureDefaultList never waited on the uncommitted default list");
  }
});
