import { schema } from "@taskly/db";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { createList } from "./lists";
import { placeMessages, PREDEFINED_PLACES } from "./place-rules";
import { createPlace, deletePlace, ensurePlaces, listPlaces, updatePlace } from "./places";
import { createTask, deleteTask, listTasks, setTaskPlace } from "./tasks";
import type { Tx } from "./types";

const url = process.env.DATABASE_URL;
const run = `plc${Date.now()}`;
const unknownId = "00000000-0000-4000-8000-000000000000";
const duplicate = new ConflictError(placeMessages.duplicateName);
const limit = new ConflictError(placeMessages.limit);
const placeNotFound = new NotFoundError("Place");

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

describe.skipIf(!url)("places service (real PostgreSQL)", () => {
  const pool = new Pool({ connectionString: url, max: 10 });
  const db = drizzle(pool, { schema });
  const users: string[] = [];
  let userCount = 0;

  /** A new user with no places and no `place_owners` row. */
  async function newUser() {
    userCount += 1;
    const id = `${run}-${userCount}`;
    await db.insert(schema.user).values({ id, name: id, email: `${id}@example.test` });
    users.push(id);
    return id;
  }

  const owners = (userId: string) =>
    db.select().from(schema.placeOwners).where(eq(schema.placeOwners.userId, userId));
  const stored = (userId: string) =>
    db
      .select({ name: schema.places.name, color: schema.places.color })
      .from(schema.places)
      .where(eq(schema.places.userId, userId))
      .orderBy(sql`${schema.places.position} COLLATE "C"`);

  /** Creates places named `Extra 1`, `Extra 2`, … until the user has `count` (eight seeded first). */
  async function fillTo(userId: string, count: number) {
    await listPlaces(db, userId);
    for (let n = 9; n <= count; n += 1) await createPlace(db, userId, { name: `Extra ${n}` });
  }

  afterAll(async () => {
    // Cascades to their places, assignments and place_owners rows.
    if (users.length) await db.delete(schema.user).where(inArray(schema.user.id, users));
    await pool.end();
  });

  it("gives a user the eight predefined places on first use, coloured 1–8 in order (AC1)", async () => {
    const alice = await newUser();
    const bob = await newUser();

    const places = await listPlaces(db, alice);

    expect(places.map(({ name, color }) => ({ name, color }))).toEqual(
      PREDEFINED_PLACES.map((name, i) => ({ name, color: i + 1 })),
    );
    expect(await listPlaces(db, alice)).toEqual(places);
    expect(await owners(alice)).toHaveLength(1);
    // Each owner has their own copy.
    const bobs = await listPlaces(db, bob);
    expect(bobs.map((place) => place.name)).toEqual(PREDEFINED_PLACES);
    expect(bobs.some((place) => places.some(({ id }) => id === place.id))).toBe(false);
  });

  it("refuses an empty name (AC4)", async () => {
    const alice = await newUser();
    await expect(createPlace(db, alice, { name: "  " })).rejects.toBeInstanceOf(ZodError);
    expect(await owners(alice)).toEqual([]);
  });

  it("refuses a name that differs only in case, on create and rename (AC5)", async () => {
    const alice = await newUser();
    const places = await listPlaces(db, alice);
    const kuchnia = places.find((place) => place.name === "Kuchnia")!;

    await expect(createPlace(db, alice, { name: "łazienka" })).rejects.toEqual(duplicate);
    await expect(createPlace(db, alice, { name: " ŁAZIENKA " })).rejects.toEqual(duplicate);
    await expect(updatePlace(db, alice, kuchnia.id, { name: "łazienka" })).rejects.toEqual(
      duplicate,
    );
    // The same place may change only its case.
    expect(await updatePlace(db, alice, kuchnia.id, { name: "kuchnia" })).toEqual({
      ...kuchnia,
      name: "kuchnia",
    });
    // Another user's names do not count.
    await createPlace(db, alice, { name: "Jadalnia" });
    await createPlace(db, await newUser(), { name: "jadalnia" });
    expect((await stored(alice)).length).toBe(9);
  });

  it("renames and recolours a predefined place (AC6, AC8)", async () => {
    const alice = await newUser();
    const [salon] = await listPlaces(db, alice);

    expect(await updatePlace(db, alice, salon!.id, { name: "Pokój dzienny" })).toEqual({
      id: salon!.id,
      name: "Pokój dzienny",
      color: 1,
    });
    expect(await updatePlace(db, alice, salon!.id, { color: 10 })).toEqual({
      id: salon!.id,
      name: "Pokój dzienny",
      color: 10,
    });
    expect((await listPlaces(db, alice))[0]).toEqual({
      id: salon!.id,
      name: "Pokój dzienny",
      color: 10,
    });
  });

  it("hands out the colours in turn and repeats them from the eleventh place (AC8)", async () => {
    const alice = await newUser();
    await fillTo(alice, 11);
    expect((await stored(alice)).slice(7)).toEqual([
      { name: "Biuro", color: 8 },
      { name: "Extra 9", color: 9 },
      { name: "Extra 10", color: 10 },
      { name: "Extra 11", color: 1 },
    ]);
  });

  it("refuses the 21st place with the limit message (AC10)", async () => {
    const alice = await newUser();
    await fillTo(alice, 20);
    await expect(createPlace(db, alice, { name: "Hall" })).rejects.toEqual(limit);
    expect(await stored(alice)).toHaveLength(20);
    // A deletion makes room again.
    const [first] = await listPlaces(db, alice);
    await deletePlace(db, alice, first!.id);
    expect(await createPlace(db, alice, { name: "Hall" })).toEqual(
      expect.objectContaining({ name: "Hall" }),
    );
  });

  it("never brings the eight back after the owner deleted them all (S-1)", async () => {
    const alice = await newUser();
    for (const place of await listPlaces(db, alice)) await deletePlace(db, alice, place.id);

    expect(await listPlaces(db, alice)).toEqual([]);
    expect(await listPlaces(db, alice)).toEqual([]);
    expect(await owners(alice)).toHaveLength(1);
  });

  it("seeds the eight before a create of a user who never loaded places, which comes ninth with colour 9 (S-2)", async () => {
    const alice = await newUser();

    expect(await createPlace(db, alice, { name: "Jadalnia" })).toEqual(
      expect.objectContaining({ name: "Jadalnia", color: 9 }),
    );
    expect((await listPlaces(db, alice)).map((place) => place.name)).toEqual([
      ...PREDEFINED_PLACES,
      "Jadalnia",
    ]);
  });

  it("answers 404 for another user's place, an unknown or malformed id, and writes nothing", async () => {
    const alice = await newUser();
    const mallory = await newUser();
    const [salon] = await listPlaces(db, alice);
    await listPlaces(db, mallory);

    await expect(updatePlace(db, mallory, salon!.id, { name: "Mine" })).rejects.toEqual(
      placeNotFound,
    );
    await expect(deletePlace(db, mallory, salon!.id)).rejects.toEqual(placeNotFound);
    await expect(updatePlace(db, alice, unknownId, { color: 2 })).rejects.toEqual(placeNotFound);
    await expect(deletePlace(db, alice, unknownId)).rejects.toEqual(placeNotFound);
    await expect(updatePlace(db, alice, "not-a-uuid", { color: 2 })).rejects.toEqual(placeNotFound);
    await expect(deletePlace(db, alice, "not-a-uuid")).rejects.toEqual(placeNotFound);
    expect((await listPlaces(db, alice))[0]).toEqual(salon);
  });

  it("answers 404 on update and delete for a user who never loaded places, with no place_owners row", async () => {
    const alice = await newUser();
    const [salon] = await listPlaces(db, await newUser());

    await expect(updatePlace(db, alice, salon!.id, { color: 2 })).rejects.toEqual(placeNotFound);
    await expect(deletePlace(db, alice, salon!.id)).rejects.toEqual(placeNotFound);
    expect(await owners(alice)).toEqual([]);
  });

  describe("under concurrency (C-1)", () => {
    // One connection per actor, so a backend pid names that actor's transaction.
    const firstPool = new Pool({ connectionString: url, max: 1, idleTimeoutMillis: 0 });
    const secondPool = new Pool({ connectionString: url, max: 1, idleTimeoutMillis: 0 });
    const firstDb = drizzle(firstPool, { schema });
    const secondDb = drizzle(secondPool, { schema });
    let firstPid: number;
    let secondPid: number;

    async function backendPid(p: Pool) {
      const { rows } = await p.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      return rows[0]!.pid;
    }

    beforeAll(async () => {
      firstPid = await backendPid(firstPool);
      secondPid = await backendPid(secondPool);
    });

    afterAll(async () => {
      await firstPool.end();
      await secondPool.end();
    });

    /** Waits until `waiterPid` is blocked by one of `blockerPids`. */
    async function waitUntilBlockedBy(waiterPid: number, ...blockerPids: number[]) {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        const { rows } = await pool.query<{ blocked: boolean }>(
          "SELECT pg_blocking_pids($1::int) && $2::int[] AS blocked",
          [waiterPid, blockerPids],
        );
        if (rows[0]!.blocked) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`backend ${waiterPid} never waited on ${blockerPids.join(", ")}`);
    }

    /** Runs `work` in a transaction that holds its locks until released, then commits. */
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

    it("serializes two creates racing at 19: 20 places and one limit refusal", async () => {
      const alice = await newUser();
      await fillTo(alice, 19);
      // Holds the owner row, so both creates stop at the same lock and then run one at a time.
      const holder = holdInTransaction((tx) =>
        tx
          .select()
          .from(schema.placeOwners)
          .where(eq(schema.placeOwners.userId, alice))
          .for("no key update"),
      );
      let results: Settled<unknown>[] = [];
      try {
        const holderPid = await holder.pid;
        const first = settle(createPlace(firstDb, alice, { name: "Hall" }));
        const second = settle(createPlace(secondDb, alice, { name: "Pantry" }));
        // The one that came second queues behind the other, which pg_blocking_pids may report
        // instead of the holder (lesson 2026-10-30).
        await waitUntilBlockedBy(firstPid, holderPid, secondPid);
        await waitUntilBlockedBy(secondPid, holderPid, firstPid);
        holder.release();
        results = await Promise.all([first, second]);
      } finally {
        holder.release();
        await holder.done;
      }

      expect(results.filter((result) => "value" in result)).toHaveLength(1);
      expect(results.filter((result) => "error" in result)).toEqual([{ error: limit }]);
      const places = await stored(alice);
      expect(places).toHaveLength(20);
      expect(places.at(-1)).toEqual(
        expect.objectContaining({ name: expect.stringMatching(/^(Hall|Pantry)$/) }),
      );
    });

    it("seeds once when a create waits for a first load still seeding", async () => {
      const alice = await newUser();
      // The first load's transaction: owner row and the eight inserted, not committed yet.
      const holder = holdInTransaction((tx) => ensurePlaces(tx, alice));
      let created: Settled<unknown> | undefined;
      try {
        const holderPid = await holder.pid;
        const creating = settle(createPlace(firstDb, alice, { name: "Jadalnia" }));
        await waitUntilBlockedBy(firstPid, holderPid);
        holder.release();
        created = await creating;
      } finally {
        holder.release();
        await holder.done;
      }

      expect(created).toEqual({ value: expect.objectContaining({ name: "Jadalnia", color: 9 }) });
      expect((await stored(alice)).map((place) => place.name)).toEqual([
        ...PREDEFINED_PLACES,
        "Jadalnia",
      ]);
    });

    it("seeds once when a first load waits for a create still seeding", async () => {
      const alice = await newUser();
      // A create's transaction: seeded, locked and appended, not committed yet.
      const holder = holdInTransaction(async (tx) => {
        await ensurePlaces(tx, alice, { lock: true });
        await tx.insert(schema.places).values({
          userId: alice,
          name: "Jadalnia",
          nameKey: "jadalnia",
          color: 9,
          position: "a8",
        });
      });
      let listed: Settled<{ name: string }[]> | undefined;
      try {
        const holderPid = await holder.pid;
        const listing = settle(listPlaces(firstDb, alice));
        await waitUntilBlockedBy(firstPid, holderPid);
        holder.release();
        listed = await listing;
      } finally {
        holder.release();
        await holder.done;
      }

      const names = [...PREDEFINED_PLACES, "Jadalnia"];
      expect(listed).toEqual({ value: names.map((name) => expect.objectContaining({ name })) });
      expect(await stored(alice)).toHaveLength(9);
      expect(await owners(alice)).toHaveLength(1);
    });
    /** A project list of `owner`, with an editor and a viewer, and a task with one subtask. */
    async function listOf(owner: string) {
      const editor = await newUser();
      const viewer = await newUser();
      const { id: listId } = await createList(db, owner, { name: "Flat" });
      await db.insert(schema.listMembers).values([
        { listId, userId: editor, role: "editor" },
        { listId, userId: viewer, role: "viewer" },
      ]);
      const task = await createTask(db, owner, listId, { title: "Curtain rod" });
      const parent = await createTask(db, owner, listId, { title: "Shelf", parentId: task.id });
      const subtaskId = parent.subtasks[0]!.id;
      const places = await listPlaces(db, owner);
      const byName = (name: string) => places.find((place) => place.name === name)!;
      return { listId, editor, viewer, taskId: task.id, subtaskId, byName };
    }
    const assign = (userId: string, taskId: string, placeId: string) =>
      setTaskPlace(db, userId, taskId, placeId, { assigned: true });
    const unassign = (userId: string, taskId: string, placeId: string) =>
      setTaskPlace(db, userId, taskId, placeId, { assigned: false });
    const namesOn = async (userId: string, listId: string, id: string) => {
      const views = await listTasks(db, userId, listId);
      const rows = views.flatMap((view) => [view, ...view.subtasks]);
      return rows.find((row) => row.id === id)!.places.map((place) => place.name);
    };

    it("assigns several places, a new one included, and shows them in the places' order (AC2)", async () => {
      const owner = await newUser();
      const { listId, taskId, byName } = await listOf(owner);
      const jadalnia = await createPlace(db, owner, { name: "Jadalnia" });

      await assign(owner, taskId, jadalnia.id);
      await assign(owner, taskId, byName("Łazienka").id);
      const view = await assign(owner, taskId, byName("Salon").id);

      expect(view.places.map((place) => place.name)).toEqual(["Salon", "Łazienka", "Jadalnia"]);
      expect(await namesOn(owner, listId, taskId)).toEqual(["Salon", "Łazienka", "Jadalnia"]);
    });

    it("is idempotent and removing one keeps the other two (AC3)", async () => {
      const owner = await newUser();
      const { listId, editor, taskId, byName } = await listOf(owner);
      for (const name of ["Salon", "Kuchnia", "Biuro"])
        await assign(editor, taskId, byName(name).id);
      await assign(editor, taskId, byName("Salon").id);

      await unassign(editor, taskId, byName("Kuchnia").id);
      await unassign(editor, taskId, byName("Kuchnia").id);

      expect(await namesOn(owner, listId, taskId)).toEqual(["Salon", "Biuro"]);
    });

    it("shows a rename on the tasks and a delete keeps their other places (AC6, AC7)", async () => {
      const owner = await newUser();
      const { listId, taskId, subtaskId, byName } = await listOf(owner);
      await assign(owner, taskId, byName("Garaż").id);
      await assign(owner, taskId, byName("Strych").id);
      await assign(owner, subtaskId, byName("Garaż").id);

      await updatePlace(db, owner, byName("Strych").id, { name: "Poddasze" });
      expect(await namesOn(owner, listId, taskId)).toEqual(["Garaż", "Poddasze"]);

      await deletePlace(db, owner, byName("Garaż").id);
      expect(await namesOn(owner, listId, taskId)).toEqual(["Poddasze"]);
      expect(await namesOn(owner, listId, subtaskId)).toEqual([]);
    });

    it("never copies places between a task and its subtasks (AC9)", async () => {
      const owner = await newUser();
      const { listId, taskId, subtaskId, byName } = await listOf(owner);

      const parent = await assign(owner, subtaskId, byName("Kuchnia").id);
      expect(parent.places).toEqual([]);
      expect(parent.subtasks[0]!.places.map((place) => place.name)).toEqual(["Kuchnia"]);
      await assign(owner, taskId, byName("Salon").id);
      expect(await namesOn(owner, listId, subtaskId)).toEqual(["Kuchnia"]);
      expect(await namesOn(owner, listId, taskId)).toEqual(["Salon"]);
    });

    it("refuses a place that is not the list owner's with 404 and writes nothing (Q3-1)", async () => {
      const owner = await newUser();
      const { listId, editor, taskId } = await listOf(owner);
      const [editorsOwn] = await listPlaces(db, editor);

      await expect(assign(editor, taskId, editorsOwn!.id)).rejects.toEqual(placeNotFound);
      await expect(assign(owner, taskId, editorsOwn!.id)).rejects.toEqual(placeNotFound);
      await expect(assign(owner, taskId, unknownId)).rejects.toEqual(placeNotFound);
      await expect(assign(owner, taskId, "nope")).rejects.toEqual(placeNotFound);
      expect(await namesOn(owner, listId, taskId)).toEqual([]);
    });

    it("accepts a place of either owner of a list with two owner rows (P4)", async () => {
      const owner = await newUser();
      const second = await newUser();
      const { listId, taskId, byName } = await listOf(owner);
      await db.insert(schema.listMembers).values({ listId, userId: second, role: "owner" });
      const [secondsSalon] = await listPlaces(db, second);

      await assign(owner, taskId, byName("Biuro").id);
      const view = await assign(second, taskId, secondsSalon!.id);

      expect(view.places.map((place) => place.name).sort()).toEqual(["Biuro", "Salon"]);
    });

    it("refuses a viewer with 403 and a non-member with 404", async () => {
      const owner = await newUser();
      const { viewer, taskId, byName } = await listOf(owner);
      await expect(assign(viewer, taskId, byName("Salon").id)).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      await expect(assign(await newUser(), taskId, byName("Salon").id)).rejects.toEqual(
        new NotFoundError("Task"),
      );
      await expect(assign(owner, unknownId, byName("Salon").id)).rejects.toEqual(
        new NotFoundError("Task"),
      );
    });

    it("drops a task's assignments with the task and keeps the places", async () => {
      const owner = await newUser();
      const { taskId, byName } = await listOf(owner);
      await assign(owner, taskId, byName("Salon").id);
      await deleteTask(db, owner, taskId);
      expect(
        await db.select().from(schema.taskPlaces).where(eq(schema.taskPlaces.taskId, taskId)),
      ).toEqual([]);
      expect((await listPlaces(db, owner)).map((place) => place.name)).toEqual(PREDEFINED_PLACES);
    });

    it("answers 404 to a tick that waited for a delete of its place, and writes nothing", async () => {
      const owner = await newUser();
      const { listId, taskId, byName } = await listOf(owner);
      const garage = byName("Garaż");
      const holder = holdInTransaction((tx) =>
        tx.delete(schema.places).where(eq(schema.places.id, garage.id)),
      );
      let ticked: Settled<unknown> | undefined;
      try {
        const holderPid = await holder.pid;
        const ticking = settle(setTaskPlace(firstDb, owner, taskId, garage.id, { assigned: true }));
        await waitUntilBlockedBy(firstPid, holderPid);
        holder.release();
        ticked = await ticking;
      } finally {
        holder.release();
        await holder.done;
      }
      expect(ticked).toEqual({ error: placeNotFound });
      expect(await namesOn(owner, listId, taskId)).toEqual([]);
    });

    it("makes a delete wait for a tick holding its place, then removes the new assignment too", async () => {
      const owner = await newUser();
      const { listId, taskId, byName } = await listOf(owner);
      const garage = byName("Garaż");
      const holder = holdInTransaction(async (tx) => {
        await tx
          .select({ id: schema.places.id })
          .from(schema.places)
          .where(eq(schema.places.id, garage.id))
          .for("key share");
        await tx.insert(schema.taskPlaces).values({ taskId, placeId: garage.id });
      });
      let deleted: Settled<unknown> | undefined;
      try {
        const holderPid = await holder.pid;
        const deleting = settle(deletePlace(firstDb, owner, garage.id));
        await waitUntilBlockedBy(firstPid, holderPid);
        holder.release();
        deleted = await deleting;
      } finally {
        holder.release();
        await holder.done;
      }
      expect(deleted).toEqual({ value: null });
      expect(await namesOn(owner, listId, taskId)).toEqual([]);
    });
  });
});
