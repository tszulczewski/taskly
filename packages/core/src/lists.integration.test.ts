import { schema } from "@taskly/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireRole } from "./access";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { createList, deleteList, ensureDefaultList, listsForUser, renameList } from "./lists";
import { createTask, deleteTask } from "./tasks";
import type { Tx } from "./types";

const url = process.env.DATABASE_URL;
const run = `lst${Date.now()}`;
const ids = { alice: `${run}-alice`, bob: `${run}-bob`, ed: `${run}-ed`, vi: `${run}-vi` };

type Settled<T> = { value: T } | { error: unknown };
/** Never rejects, so a failure cannot surface as an unhandled rejection before it is awaited. */
const settle = <T>(promise: Promise<T>): Promise<Settled<T>> =>
  promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

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

  describe("deleteList: the default list and concurrent writers", () => {
    // One connection per actor, so a backend pid names that actor's transaction.
    const ownerPool = new Pool({ connectionString: url, max: 1, idleTimeoutMillis: 0 });
    const editorPool = new Pool({ connectionString: url, max: 1, idleTimeoutMillis: 0 });
    const ownerDb = drizzle(ownerPool, { schema });
    const editorDb = drizzle(editorPool, { schema });
    let ownerPid: number;
    let editorPid: number;

    beforeAll(async () => {
      ownerPid = await backendPid(ownerPool);
      editorPid = await backendPid(editorPool);
    });

    afterAll(async () => {
      await ownerPool.end();
      await editorPool.end();
    });

    async function backendPid(p: Pool) {
      const { rows } = await p.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      return rows[0]!.pid;
    }

    async function isBlockedBy(waiterPid: number, blockerPid: number) {
      const { rows } = await pool.query<{ blocked: boolean }>(
        "SELECT $2::int = ANY(pg_blocking_pids($1::int)) AS blocked",
        [waiterPid, blockerPid],
      );
      return rows[0]!.blocked;
    }

    async function waitUntilBlockedBy(waiterPid: number, blockerPid: number) {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        if (await isBlockedBy(waiterPid, blockerPid)) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`backend ${waiterPid} never waited on backend ${blockerPid}`);
    }

    async function leftovers(listId: string) {
      return {
        lists: await db.$count(schema.lists, eq(schema.lists.id, listId)),
        members: await db.$count(schema.listMembers, eq(schema.listMembers.listId, listId)),
        tasks: await db.$count(schema.tasks, eq(schema.tasks.listId, listId)),
      };
    }

    /** A non-default project list owned by alice with ed as an editor. */
    async function sharedList(name: string) {
      const listId = await newList(ids.alice, name);
      await db.insert(schema.listMembers).values({ listId, userId: ids.ed, role: "editor" });
      return listId;
    }

    it("refuses to delete the default list and keeps its tasks; renaming it still works", async () => {
      const user = await newUser("keep");
      const listId = await ensureDefaultList(db, user);
      await db.insert(schema.tasks).values({ listId, title: "Tiles", position: "a0" });

      const deleting = deleteList(db, user, listId);
      await expect(deleting).rejects.toBeInstanceOf(ConflictError);
      await expect(deleting).rejects.toThrow("The default list cannot be deleted");
      expect(await leftovers(listId)).toEqual({ lists: 1, members: 1, tasks: 1 });

      await renameList(db, user, listId, { name: "Flat" });
      const [row] = await db.select().from(schema.lists).where(eq(schema.lists.id, listId));
      expect(row).toEqual(expect.objectContaining({ name: "Flat", defaultForUserId: user }));
      await expect(ensureDefaultList(db, user)).resolves.toBe(listId);
    });

    it("waits for an editor's open write, then deletes everything (editor first, no 40P01)", async () => {
      const listId = await sharedList("Loft");
      const authorized = deferred();
      const proceed = deferred();
      const inserted = deferred();
      const commit = deferred();
      // The editor's task append as the lock protocol orders it: own membership FOR SHARE
      // (requireRole), the list row FOR NO KEY UPDATE, then the insert.
      const editor = settle(
        editorDb.transaction(async (tx) => {
          await requireRole(tx, ids.ed, listId, "write");
          authorized.resolve();
          await proceed.promise;
          await tx
            .select({ id: schema.lists.id })
            .from(schema.lists)
            .where(eq(schema.lists.id, listId))
            .for("no key update");
          await tx.insert(schema.tasks).values({ listId, title: "Skylight", position: "a0" });
          inserted.resolve();
          await commit.promise;
        }),
      );
      let deleting: Promise<Settled<void>> | undefined;
      let blockedUntilCommit = false;
      let editorResult: Settled<void>;
      let deleteResult: Settled<void> | undefined;
      try {
        await Promise.race([authorized.promise, editor]);
        deleting = settle(deleteList(ownerDb, ids.alice, listId));
        // The delete must wait while the editor holds only its membership row.
        await waitUntilBlockedBy(ownerPid, editorPid);
        proceed.resolve();
        await Promise.race([inserted.promise, editor]);
        blockedUntilCommit = await isBlockedBy(ownerPid, editorPid);
      } finally {
        // Always end the editor's transaction, or afterAll's cleanup waits on its locks.
        proceed.resolve();
        commit.resolve();
        editorResult = await editor;
        deleteResult = await deleting;
      }

      expect(editorResult).toEqual({ value: undefined });
      expect(deleteResult).toEqual({ value: undefined });
      expect(blockedUntilCommit).toBe(true);
      expect(await leftovers(listId)).toEqual({ lists: 0, members: 0, tasks: 0 });
    });

    it("makes an editor's write wait for a delete that locked the members first, then finds no list", async () => {
      const listId = await sharedList("Porch");
      const [task] = await db
        .insert(schema.tasks)
        .values({ listId, title: "Paint", position: "a0" })
        .returning({ id: schema.tasks.id });
      const locked = deferred<number>();
      const release = deferred();
      // Holds the list's task, so the delete stops in its cascade, after locking every membership.
      const holder = settle(
        db.transaction(async (tx) => {
          await tx
            .select({ id: schema.tasks.id })
            .from(schema.tasks)
            .where(eq(schema.tasks.id, task!.id))
            .for("update");
          const { rows } = await tx.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`);
          locked.resolve(rows[0]!.pid);
          await release.promise;
        }),
      );
      let deleting: Promise<Settled<void>> | undefined;
      let editor: Promise<Settled<void>> | undefined;
      let deleteResult: Settled<void> | undefined;
      let editorResult: Settled<void> | undefined;
      try {
        const holderPid = await Promise.race([
          locked.promise,
          holder.then((r) => Promise.reject(new Error(`holder ended early: ${String(r)}`))),
        ]);
        deleting = settle(deleteList(ownerDb, ids.alice, listId));
        await waitUntilBlockedBy(ownerPid, holderPid);
        editor = settle(
          editorDb.transaction(async (tx) => {
            await requireRole(tx, ids.ed, listId, "write");
            await tx
              .select({ id: schema.lists.id })
              .from(schema.lists)
              .where(eq(schema.lists.id, listId))
              .for("no key update");
            await tx.insert(schema.tasks).values({ listId, title: "Too late", position: "a1" });
          }),
        );
        await waitUntilBlockedBy(editorPid, ownerPid);
      } finally {
        release.resolve();
        await holder;
        deleteResult = await deleting;
        editorResult = await editor;
      }

      expect(deleteResult).toEqual({ value: undefined });
      expect(editorResult).toEqual({ error: expect.any(NotFoundError) });
      expect(await leftovers(listId)).toEqual({ lists: 0, members: 0, tasks: 0 });
    });

    /** Runs `work` in a transaction on the shared pool that holds its locks until released. */
    function holdInTransaction(work: (tx: Tx) => Promise<unknown>) {
      const locked = deferred<number>();
      const release = deferred();
      const done = settle(
        db.transaction(async (tx) => {
          await work(tx);
          const { rows } = await tx.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`);
          locked.resolve(rows[0]!.pid);
          await release.promise;
        }),
      );
      const pid = Promise.race([
        locked.promise,
        done.then((r) => Promise.reject(new Error(`holder ended early: ${String(r)}`))),
      ]);
      return { pid, release: release.resolve, done };
    }

    it("lets createTask finish before a delete that started while it held only its membership", async () => {
      const listId = await sharedList("Veranda");
      // Holds the list row, so createTask stops after requireRole, before its append lock.
      const holder = holdInTransaction((tx) =>
        tx
          .select({ id: schema.lists.id })
          .from(schema.lists)
          .where(eq(schema.lists.id, listId))
          .for("share"),
      );
      let creating: Promise<Settled<unknown>> | undefined;
      let deleting: Promise<Settled<void>> | undefined;
      let createResult: Settled<unknown> | undefined;
      let deleteResult: Settled<void> | undefined;
      try {
        const holderPid = await holder.pid;
        creating = settle(createTask(editorDb, ids.ed, listId, { title: "Skylight" }));
        await waitUntilBlockedBy(editorPid, holderPid);
        deleting = settle(deleteList(ownerDb, ids.alice, listId));
        // The delete waits for the editor's membership, not the other way round.
        await waitUntilBlockedBy(ownerPid, editorPid);
      } finally {
        holder.release();
        await holder.done;
        createResult = await creating;
        deleteResult = await deleting;
      }

      expect(createResult).toEqual({ value: expect.objectContaining({ title: "Skylight" }) });
      expect(deleteResult).toEqual({ value: undefined });
      expect(await leftovers(listId)).toEqual({ lists: 0, members: 0, tasks: 0 });
    });

    it("makes createTask wait for a delete that locked the members first, then report the list as not found", async () => {
      const listId = await sharedList("Terrace");
      const [task] = await db
        .insert(schema.tasks)
        .values({ listId, title: "Paint", position: "a0" })
        .returning({ id: schema.tasks.id });
      // Holds the list's task, so the delete stops in its cascade, after locking every membership.
      const holder = holdInTransaction((tx) =>
        tx
          .select({ id: schema.tasks.id })
          .from(schema.tasks)
          .where(eq(schema.tasks.id, task!.id))
          .for("update"),
      );
      let deleting: Promise<Settled<void>> | undefined;
      let creating: Promise<Settled<unknown>> | undefined;
      let deleteResult: Settled<void> | undefined;
      let createResult: Settled<unknown> | undefined;
      try {
        const holderPid = await holder.pid;
        deleting = settle(deleteList(ownerDb, ids.alice, listId));
        await waitUntilBlockedBy(ownerPid, holderPid);
        creating = settle(createTask(editorDb, ids.ed, listId, { title: "Too late" }));
        await waitUntilBlockedBy(editorPid, ownerPid);
      } finally {
        holder.release();
        await holder.done;
        deleteResult = await deleting;
        createResult = await creating;
      }

      expect(deleteResult).toEqual({ value: undefined });
      expect(createResult).toEqual({ error: expect.any(NotFoundError) });
      expect(await leftovers(listId)).toEqual({ lists: 0, members: 0, tasks: 0 });
    });

    /** A top-level task in `listId`; returns its id. */
    async function topLevelTask(listId: string) {
      const [task] = await db
        .insert(schema.tasks)
        .values({ listId, title: "Porch", position: "a0" })
        .returning({ id: schema.tasks.id });
      return task!.id;
    }

    it("lets a subtask add finish before a delete that started while it held only its membership", async () => {
      const listId = await sharedList("Carport");
      const parentId = await topLevelTask(listId);
      // Holds the list row, so createTask stops after requireRole, before its append lock.
      const holder = holdInTransaction((tx) =>
        tx
          .select({ id: schema.lists.id })
          .from(schema.lists)
          .where(eq(schema.lists.id, listId))
          .for("share"),
      );
      let creating: Promise<Settled<unknown>> | undefined;
      let deleting: Promise<Settled<void>> | undefined;
      let createResult: Settled<unknown> | undefined;
      let deleteResult: Settled<void> | undefined;
      try {
        const holderPid = await holder.pid;
        creating = settle(createTask(editorDb, ids.ed, listId, { title: "Steps", parentId }));
        await waitUntilBlockedBy(editorPid, holderPid);
        deleting = settle(deleteList(ownerDb, ids.alice, listId));
        // The delete waits for the editor's membership, not the other way round.
        await waitUntilBlockedBy(ownerPid, editorPid);
      } finally {
        holder.release();
        await holder.done;
        createResult = await creating;
        deleteResult = await deleting;
      }

      expect(createResult).toEqual({
        value: expect.objectContaining({
          id: parentId,
          subtasks: [expect.objectContaining({ title: "Steps" })],
        }),
      });
      expect(deleteResult).toEqual({ value: undefined });
      expect(await leftovers(listId)).toEqual({ lists: 0, members: 0, tasks: 0 });
    });

    it("makes a subtask add wait for a delete that locked the members first, then report the list as not found", async () => {
      const listId = await sharedList("Shed roof");
      const parentId = await topLevelTask(listId);
      // Holds the parent, so the delete stops in its cascade, after locking every membership.
      const holder = holdInTransaction((tx) =>
        tx
          .select({ id: schema.tasks.id })
          .from(schema.tasks)
          .where(eq(schema.tasks.id, parentId))
          .for("update"),
      );
      let deleting: Promise<Settled<void>> | undefined;
      let creating: Promise<Settled<unknown>> | undefined;
      let deleteResult: Settled<void> | undefined;
      let createResult: Settled<unknown> | undefined;
      try {
        const holderPid = await holder.pid;
        deleting = settle(deleteList(ownerDb, ids.alice, listId));
        await waitUntilBlockedBy(ownerPid, holderPid);
        creating = settle(createTask(editorDb, ids.ed, listId, { title: "Too late", parentId }));
        await waitUntilBlockedBy(editorPid, ownerPid);
      } finally {
        holder.release();
        await holder.done;
        deleteResult = await deleting;
        createResult = await creating;
      }

      expect(deleteResult).toEqual({ value: undefined });
      expect(createResult).toEqual({ error: new NotFoundError("List") });
      expect(await leftovers(listId)).toEqual({ lists: 0, members: 0, tasks: 0 });
    });

    /** A task with one subtask in `listId`; returns the task's id. */
    async function taskWithSubtask(listId: string) {
      const [task] = await db
        .insert(schema.tasks)
        .values({ listId, title: "Roof", position: "a0" })
        .returning({ id: schema.tasks.id });
      await db
        .insert(schema.tasks)
        .values({ listId, parentId: task!.id, title: "Gutter", position: "a0" });
      return task!.id;
    }

    it("lets deleteTask finish before a delete that started while it held only its membership", async () => {
      const listId = await sharedList("Gazebo");
      const taskId = await taskWithSubtask(listId);
      // Holds the task FOR KEY SHARE, so deleteTask stops after requireRole, at its task lock.
      const holder = holdInTransaction((tx) =>
        tx
          .select({ id: schema.tasks.id })
          .from(schema.tasks)
          .where(eq(schema.tasks.id, taskId))
          .for("key share"),
      );
      let deletingTask: Promise<Settled<unknown>> | undefined;
      let deleting: Promise<Settled<void>> | undefined;
      let taskResult: Settled<unknown> | undefined;
      let deleteResult: Settled<void> | undefined;
      try {
        const holderPid = await holder.pid;
        deletingTask = settle(deleteTask(editorDb, ids.ed, taskId));
        await waitUntilBlockedBy(editorPid, holderPid);
        deleting = settle(deleteList(ownerDb, ids.alice, listId));
        // The delete waits for the editor's membership, not the other way round.
        await waitUntilBlockedBy(ownerPid, editorPid);
      } finally {
        holder.release();
        await holder.done;
        taskResult = await deletingTask;
        deleteResult = await deleting;
      }

      expect(taskResult).toEqual({ value: null });
      expect(deleteResult).toEqual({ value: undefined });
      expect(await leftovers(listId)).toEqual({ lists: 0, members: 0, tasks: 0 });
    });

    it("makes deleteTask wait for a delete that locked the members first, then report the task as not found", async () => {
      const listId = await sharedList("Pergola");
      const taskId = await taskWithSubtask(listId);
      // Holds the task, so the delete stops in its cascade, after locking every membership.
      const holder = holdInTransaction((tx) =>
        tx
          .select({ id: schema.tasks.id })
          .from(schema.tasks)
          .where(eq(schema.tasks.id, taskId))
          .for("update"),
      );
      let deleting: Promise<Settled<void>> | undefined;
      let deletingTask: Promise<Settled<unknown>> | undefined;
      let deleteResult: Settled<void> | undefined;
      let taskResult: Settled<unknown> | undefined;
      try {
        const holderPid = await holder.pid;
        deleting = settle(deleteList(ownerDb, ids.alice, listId));
        await waitUntilBlockedBy(ownerPid, holderPid);
        deletingTask = settle(deleteTask(editorDb, ids.ed, taskId));
        await waitUntilBlockedBy(editorPid, ownerPid);
      } finally {
        holder.release();
        await holder.done;
        deleteResult = await deleting;
        taskResult = await deletingTask;
      }

      expect(deleteResult).toEqual({ value: undefined });
      expect(taskResult).toEqual({ error: new NotFoundError("Task") });
      expect(await leftovers(listId)).toEqual({ lists: 0, members: 0, tasks: 0 });
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
