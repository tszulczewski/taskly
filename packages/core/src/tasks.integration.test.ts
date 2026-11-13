import { schema } from "@taskly/db";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { createList, ensureDefaultList } from "./lists";
import { MAX_ESTIMATE_GROSZE } from "./money";
import { positionBetween } from "./position";
import { taskListResponseSchema, type TaskView, taskViewSchema } from "./schemas";
import {
  createTask,
  deleteTask,
  listTasks,
  moveTask,
  requireTaskRole,
  setTaskCompleted,
  updateTask,
} from "./tasks";
import type { Tx } from "./types";

const url = process.env.DATABASE_URL;
const run = `tsk${Date.now()}`;
const ids = { alice: `${run}-alice`, bob: `${run}-bob`, ed: `${run}-ed`, vi: `${run}-vi` };
const unknownId = "00000000-0000-4000-8000-000000000000";
const parentWithSubtasks = new ConflictError("A task with subtasks takes its estimate from them");
const parentCompleted = new ConflictError("Task is completed");

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

/** An estimate in grosze, as the services take and return it. */
const est = (minGrosze: number, maxGrosze = minGrosze) => ({ minGrosze, maxGrosze });

describe.skipIf(!url)("tasks service (real PostgreSQL)", () => {
  // Ten connections, so ten concurrent creates really run at the same time.
  const pool = new Pool({ connectionString: url, max: 10 });
  const db = drizzle(pool, { schema });
  const created: string[] = [];

  beforeAll(async () => {
    await db
      .insert(schema.user)
      .values(Object.values(ids).map((id) => ({ id, name: id, email: `${id}@example.test` })));
  });

  afterAll(async () => {
    if (created.length) await db.delete(schema.lists).where(inArray(schema.lists.id, created));
    // Also removes the users' default lists (FK cascade), with their tasks.
    await db.delete(schema.user).where(inArray(schema.user.id, Object.values(ids)));
    await pool.end();
  });

  /** A project list owned by alice, with ed as editor and vi as viewer. */
  async function sharedList(name: string) {
    const { id } = await createList(db, ids.alice, { name });
    created.push(id);
    await db.insert(schema.listMembers).values([
      { listId: id, userId: ids.ed, role: "editor" },
      { listId: id, userId: ids.vi, role: "viewer" },
    ]);
    return id;
  }

  async function rowsOf(listId: string) {
    return db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.listId, listId))
      .orderBy(sql`${schema.tasks.position} COLLATE "C"`);
  }

  it("creates a top-level task with every field stored and returns its view", async () => {
    const listId = await sharedList("Bathroom");

    const view = await createTask(db, ids.alice, listId, {
      title: " Tiles ",
      description: " Grey, 60×60 ",
      estimate: { minGrosze: 150000, maxGrosze: 200000 },
    });

    expect(taskViewSchema.parse(view)).toEqual(view);
    expect(view).toEqual({
      id: expect.any(String),
      title: "Tiles",
      description: "Grey, 60×60",
      estimate: { minGrosze: 150000, maxGrosze: 200000 },
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: expect.any(String),
      unestimatedSubtasks: 0,
      subtasks: [],
    });
    expect(await rowsOf(listId)).toEqual([
      expect.objectContaining({
        id: view.id,
        listId,
        parentId: null,
        title: "Tiles",
        description: "Grey, 60×60",
        status: "todo",
        position: "a0",
        estimateMinGrosze: 150000,
        estimateMaxGrosze: 200000,
        costGrosze: null,
      }),
    ]);
  });

  it("stores a missing description and estimate as null", async () => {
    const listId = await sharedList("Hall");

    const view = await createTask(db, ids.ed, listId, { title: "Paint" });

    expect(view).toEqual(expect.objectContaining({ description: null, estimate: null }));
    expect(await rowsOf(listId)).toEqual([
      expect.objectContaining({
        description: null,
        estimateMinGrosze: null,
        estimateMaxGrosze: null,
      }),
    ]);
  });

  it("stores an exact price as min = max", async () => {
    const listId = await sharedList("Pantry");

    const view = await createTask(db, ids.alice, listId, {
      title: "Curtain rod",
      estimate: { minGrosze: 5000, maxGrosze: 5000 },
    });

    expect(view.estimate).toEqual({ minGrosze: 5000, maxGrosze: 5000 });
    const [row] = await rowsOf(listId);
    expect(row).toEqual(
      expect.objectContaining({ estimateMinGrosze: 5000, estimateMaxGrosze: 5000 }),
    );
  });

  it("appends each new task at the end, and listTasks returns them in that order", async () => {
    const listId = await sharedList("Kitchen");
    const titles = ["One", "Two", "Three", "Four"];
    const views = [];
    for (const title of titles) views.push(await createTask(db, ids.ed, listId, { title }));

    const listed = await listTasks(db, ids.vi, listId);

    expect(taskListResponseSchema.parse(listed)).toEqual(listed);
    expect(listed).toEqual(views);
    expect(listed.map((t) => t.title)).toEqual(titles);
  });

  it("lets a viewer list but not add tasks", async () => {
    const listId = await sharedList("Loft");
    await createTask(db, ids.alice, listId, { title: "Insulate" });

    await expect(createTask(db, ids.vi, listId, { title: "Nope" })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect((await listTasks(db, ids.vi, listId)).map((t) => t.title)).toEqual(["Insulate"]);
    expect(await rowsOf(listId)).toHaveLength(1);
  });

  it("hides a list from a non-member, and from a malformed or unknown list id", async () => {
    const listId = await sharedList("Garage");
    await createTask(db, ids.alice, listId, { title: "Shelves" });

    for (const target of [listId, unknownId, "not-a-uuid"]) {
      await expect(listTasks(db, ids.bob, target)).rejects.toBeInstanceOf(NotFoundError);
      await expect(createTask(db, ids.bob, target, { title: "Hacked" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    }
    expect((await rowsOf(listId)).map((r) => r.title)).toEqual(["Shelves"]);
  });

  it("keeps two users' default lists and tasks apart", async () => {
    const aliceList = await ensureDefaultList(db, ids.alice);
    const bobList = await ensureDefaultList(db, ids.bob);
    expect(bobList).not.toBe(aliceList);
    await createTask(db, ids.alice, aliceList, { title: "Alice's task" });
    await createTask(db, ids.bob, bobList, { title: "Bob's task" });

    expect((await listTasks(db, ids.alice, aliceList)).map((t) => t.title)).toEqual([
      "Alice's task",
    ]);
    expect((await listTasks(db, ids.bob, bobList)).map((t) => t.title)).toEqual(["Bob's task"]);
    await expect(listTasks(db, ids.bob, aliceList)).rejects.toBeInstanceOf(NotFoundError);
    await expect(createTask(db, ids.bob, aliceList, { title: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    const [aliceTask] = await rowsOf(aliceList);
    await expect(updateTask(db, ids.bob, aliceTask!.id, { title: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(deleteTask(db, ids.bob, aliceTask!.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await rowsOf(aliceList)).toEqual([aliceTask]);
  });

  it("gives ten concurrent creates ten distinct positions, listed in position order", async () => {
    const listId = await sharedList("Race");
    const titles = Array.from({ length: 10 }, (_, i) => `Task ${i}`);

    const views = await Promise.all(
      titles.map((title, i) => createTask(db, i % 2 ? ids.ed : ids.alice, listId, { title })),
    );

    const rows = await rowsOf(listId);
    const positions = rows.map((r) => r.position);
    expect(new Set(positions).size).toBe(10);
    // Each append went after the previous one: the keys are the first ten in sequence.
    const sequence: string[] = [];
    for (let i = 0; i < 10; i += 1) sequence.push(positionBetween(sequence.at(-1) ?? null, null));
    expect(positions).toEqual(sequence);
    const listed = await listTasks(db, ids.vi, listId);
    expect(listed.map((t) => t.id)).toEqual(rows.map((r) => r.id));
    expect(new Set(listed.map((t) => t.id))).toEqual(new Set(views.map((v) => v.id)));
  });

  /** A shared list with one task: "Tiles", "Grey", 1 000–1 500 zł. */
  async function listWithTask(name: string) {
    const listId = await sharedList(name);
    const view = await createTask(db, ids.alice, listId, {
      title: "Tiles",
      description: "Grey",
      estimate: { minGrosze: 100000, maxGrosze: 150000 },
    });
    const [row] = await rowsOf(listId);
    return { listId, taskId: view.id, row: row! };
  }

  /** Inserts a subtask directly, bypassing createTask. */
  async function addSubtask(
    listId: string,
    parentId: string,
    position: string,
    estimate: [number, number] | null,
  ) {
    const [row] = await db
      .insert(schema.tasks)
      .values({
        listId,
        parentId,
        title: `Sub ${position}`,
        position,
        estimateMinGrosze: estimate?.[0] ?? null,
        estimateMaxGrosze: estimate?.[1] ?? null,
      })
      .returning({ id: schema.tasks.id });
    return row!.id;
  }

  /** Who asks for which task id; each case must end in NotFoundError("Task"). */
  const notFoundTargets: [string, (taskId: string) => Promise<[string, string]>][] = [
    ["a non-member", async (taskId) => [ids.bob, taskId]],
    ["an unknown id", async () => [ids.alice, unknownId]],
    ["a malformed id", async () => [ids.alice, "not-a-uuid"]],
    [
      "another user's task",
      async () => {
        const bobList = await ensureDefaultList(db, ids.bob);
        const { id } = await createTask(db, ids.bob, bobList, { title: "Bob's" });
        return [ids.alice, id];
      },
    ],
  ];

  describe("updateTask", () => {
    it("updates every field for an editor and returns the task's view", async () => {
      const { listId, taskId, row } = await listWithTask("Bath");

      const view = await updateTask(db, ids.ed, taskId, {
        title: " Wall tiles ",
        description: " White ",
        estimate: { minGrosze: 200000, maxGrosze: 250000 },
      });

      expect(taskViewSchema.parse(view)).toEqual(view);
      expect(view).toEqual({
        id: taskId,
        title: "Wall tiles",
        description: "White",
        estimate: { minGrosze: 200000, maxGrosze: 250000 },
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: expect.any(String),
        unestimatedSubtasks: 0,
        subtasks: [],
      });
      expect(await rowsOf(listId)).toEqual([
        {
          ...row,
          title: "Wall tiles",
          description: "White",
          estimateMinGrosze: 200000,
          estimateMaxGrosze: 250000,
        },
      ]);
      expect(await listTasks(db, ids.vi, listId)).toEqual([view]);
    });

    it("keeps the description and estimate on a title-only update (the .partial() regression)", async () => {
      const { listId, taskId, row } = await listWithTask("Hallway");

      const view = await updateTask(db, ids.alice, taskId, { title: "Floor tiles" });

      expect(view).toEqual(
        expect.objectContaining({
          title: "Floor tiles",
          description: "Grey",
          estimate: { minGrosze: 100000, maxGrosze: 150000 },
        }),
      );
      expect(await rowsOf(listId)).toEqual([{ ...row, title: "Floor tiles" }]);
    });

    it("updates only the description, or only the estimate", async () => {
      const { listId, taskId, row } = await listWithTask("Toilet");

      await updateTask(db, ids.ed, taskId, { description: "Matt" });
      expect(await rowsOf(listId)).toEqual([{ ...row, description: "Matt" }]);

      const view = await updateTask(db, ids.ed, taskId, {
        estimate: { minGrosze: 5000, maxGrosze: 5000 },
      });
      expect(view.estimate).toEqual({ minGrosze: 5000, maxGrosze: 5000 });
      expect(await rowsOf(listId)).toEqual([
        { ...row, description: "Matt", estimateMinGrosze: 5000, estimateMaxGrosze: 5000 },
      ]);
    });

    it('clears the estimate with null and the description with ""', async () => {
      const { listId, taskId, row } = await listWithTask("Laundry");

      const view = await updateTask(db, ids.alice, taskId, { estimate: null, description: "" });

      expect(view).toEqual(expect.objectContaining({ description: null, estimate: null }));
      expect(await rowsOf(listId)).toEqual([
        { ...row, description: null, estimateMinGrosze: null, estimateMaxGrosze: null },
      ]);
    });

    it("returns the rolled-up view of a task that has subtasks", async () => {
      const { listId, taskId } = await listWithTask("Bedroom");
      const plaster = await addSubtask(listId, taskId, "a0", [30000, 40000]);
      const paint = await addSubtask(listId, taskId, "a1", null);

      const view = await updateTask(db, ids.ed, taskId, { title: "Bedroom walls" });

      expect(taskViewSchema.parse(view)).toEqual(view);
      expect(view).toEqual({
        id: taskId,
        title: "Bedroom walls",
        description: "Grey",
        estimate: { minGrosze: 30000, maxGrosze: 40000 },
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: expect.any(String),
        unestimatedSubtasks: 1,
        subtasks: [
          {
            id: plaster,
            title: "Sub a0",
            description: null,
            estimate: { minGrosze: 30000, maxGrosze: 40000 },
            completed: false,
            important: false,
            urgent: false,
            places: [],
            position: expect.any(String),
          },
          {
            id: paint,
            title: "Sub a1",
            description: null,
            estimate: null,
            completed: false,
            important: false,
            urgent: false,
            places: [],
            position: expect.any(String),
          },
        ],
      });
      expect(await listTasks(db, ids.alice, listId)).toEqual([view]);
    });

    it.each([
      ["no field", {}],
      ["a blank title", { title: " " }],
      ["min above max", { estimate: { minGrosze: 2, maxGrosze: 1 } }],
    ])("rejects %s with a ZodError before touching the task", async (_name, input) => {
      const { listId, taskId, row } = await listWithTask("Closet");

      await expect(updateTask(db, ids.alice, taskId, input)).rejects.toBeInstanceOf(ZodError);
      // Parsed before authorization: even an unknown id gets the input error.
      await expect(updateTask(db, ids.bob, unknownId, input)).rejects.toBeInstanceOf(ZodError);
      expect(await rowsOf(listId)).toEqual([row]);
    });

    it("forbids a viewer and changes nothing", async () => {
      const { listId, taskId, row } = await listWithTask("Attic");
      await expect(updateTask(db, ids.vi, taskId, { title: "x" })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(await rowsOf(listId)).toEqual([row]);
    });

    it.each(notFoundTargets)("reports %s as a missing task", async (_name, target) => {
      const { listId, taskId, row } = await listWithTask("Shed");
      const [userId, id] = await target(taskId);

      const error: unknown = await updateTask(db, userId, id, { title: "Hacked" }).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).resource).toBe("Task");
      expect(await rowsOf(listId)).toEqual([row]);
    });
  });

  describe("markers (#18)", () => {
    const markersOf = async (listId: string) =>
      Object.fromEntries(
        (await rowsOf(listId)).map((row) => [row.title, [row.important, row.urgent]]),
      );

    it("starts a new task unmarked, also when the add sends markers", async () => {
      const listId = await sharedList("Markers new");
      const view = await createTask(db, ids.alice, listId, {
        title: "Tiles",
        important: true,
        urgent: true,
        places: [],
      });
      expect(view).toEqual(expect.objectContaining({ important: false, urgent: false }));
      expect(await markersOf(listId)).toEqual({ Tiles: [false, false] });
    });

    it("sets only important: the task is important and not urgent (AC1)", async () => {
      const { listId, taskId } = await listWithTask("Markers AC1");

      const view = await updateTask(db, ids.ed, taskId, { important: true });

      expect(taskViewSchema.parse(view)).toEqual(view);
      expect(view).toEqual(expect.objectContaining({ important: true, urgent: false }));
      expect(await markersOf(listId)).toEqual({ Tiles: [true, false] });
      expect(await listTasks(db, ids.vi, listId)).toEqual([view]);
    });

    it("sets both markers one after the other: both show (AC2)", async () => {
      const { listId, taskId } = await listWithTask("Markers AC2");

      await updateTask(db, ids.alice, taskId, { important: true });
      const view = await updateTask(db, ids.alice, taskId, { urgent: true });

      expect(view).toEqual(expect.objectContaining({ important: true, urgent: true }));
      expect(await markersOf(listId)).toEqual({ Tiles: [true, true] });
    });

    it("clears urgent on an important and urgent task: important stays set (AC3)", async () => {
      const { listId, taskId, row } = await listWithTask("Markers AC3");
      await updateTask(db, ids.alice, taskId, { important: true, urgent: true });

      const view = await updateTask(db, ids.alice, taskId, { urgent: false });

      expect(view).toEqual(expect.objectContaining({ important: true, urgent: false }));
      const [after] = await rowsOf(listId);
      // Only the marker changed: title, description, estimate and position are as stored.
      expect(after).toEqual({ ...row, important: true, urgent: false });
    });

    it("marks a subtask without changing its task, and a task without marking its subtasks (AC4)", async () => {
      const { listId, taskId } = await listWithTask("Markers AC4");
      const sub = { id: await addSubtask(listId, taskId, "a0", null) };
      const other = { id: await addSubtask(listId, taskId, "a1", null) };

      const parent = await updateTask(db, ids.alice, sub.id, { important: true });

      expect(parent).toEqual(
        expect.objectContaining({
          id: taskId,
          important: false,
          urgent: false,
          places: [],
          subtasks: [
            expect.objectContaining({ id: sub.id, important: true, urgent: false }),
            expect.objectContaining({ id: other.id, important: false, urgent: false }),
          ],
        }),
      );

      const marked = await updateTask(db, ids.alice, taskId, { urgent: true });

      expect(marked).toEqual(
        expect.objectContaining({
          important: false,
          urgent: true,
          places: [],
          subtasks: [
            expect.objectContaining({ id: sub.id, important: true, urgent: false }),
            expect.objectContaining({ id: other.id, important: false, urgent: false }),
          ],
        }),
      );
      expect(await markersOf(listId)).toEqual({
        Tiles: [false, true],
        "Sub a0": [true, false],
        "Sub a1": [false, false],
      });
    });

    it("marks a completed task and keeps it completed", async () => {
      const { listId, taskId } = await listWithTask("Markers done");
      await setTaskCompleted(db, ids.alice, taskId, { completed: true });

      const view = await updateTask(db, ids.alice, taskId, { important: true });

      expect(view).toEqual(expect.objectContaining({ completed: true, important: true }));
      expect((await rowsOf(listId)).map((row) => row.status)).toEqual(["done"]);
    });

    it("marks a task with subtasks without the estimate rule refusing it", async () => {
      const { listId, taskId } = await listWithTask("Markers summed");
      await addSubtask(listId, taskId, "a0", [30000, 40000]);

      const view = await updateTask(db, ids.alice, taskId, { urgent: true });

      expect(view).toEqual(
        expect.objectContaining({ urgent: true, estimate: { minGrosze: 30000, maxGrosze: 40000 } }),
      );
    });

    it("forbids a viewer and changes nothing", async () => {
      const { listId, taskId, row } = await listWithTask("Markers viewer");

      await expect(updateTask(db, ids.vi, taskId, { important: true })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
      expect(await rowsOf(listId)).toEqual([row]);
    });

    it.each(notFoundTargets)(
      "reports %s as a missing task and marks nothing",
      async (_name, target) => {
        const { listId, taskId, row } = await listWithTask("Markers hidden");
        const [userId, id] = await target(taskId);

        const error: unknown = await updateTask(db, userId, id, { urgent: true }).catch(
          (e: unknown) => e,
        );

        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).resource).toBe("Task");
        expect(await rowsOf(listId)).toEqual([row]);
      },
    );

    it("keeps both markers when two single-marker PATCHes of the same task run concurrently", async () => {
      const { listId, taskId } = await listWithTask("Markers race");

      await Promise.all([
        updateTask(db, ids.alice, taskId, { important: true }),
        updateTask(db, ids.ed, taskId, { urgent: true }),
      ]);

      expect(await markersOf(listId)).toEqual({ Tiles: [true, true] });
    });
  });

  describe("deleteTask", () => {
    it("deletes a top-level task with its subtasks, returns null and keeps the other tasks", async () => {
      const { listId, taskId } = await listWithTask("Kitchenette");
      await addSubtask(listId, taskId, "a0", [30000, 40000]);
      await addSubtask(listId, taskId, "a1", null);
      const other = await createTask(db, ids.alice, listId, { title: "Sink" });

      await expect(deleteTask(db, ids.ed, taskId)).resolves.toBeNull();

      expect((await rowsOf(listId)).map((r) => r.id)).toEqual([other.id]);
      expect(await listTasks(db, ids.alice, listId)).toEqual([other]);
    });

    it("reports an already deleted task as missing", async () => {
      const { taskId } = await listWithTask("Balcony");
      await deleteTask(db, ids.alice, taskId);
      await expect(deleteTask(db, ids.alice, taskId)).rejects.toEqual(new NotFoundError("Task"));
    });

    it("forbids a viewer and keeps the task", async () => {
      const { listId, taskId, row } = await listWithTask("Basement");
      await expect(deleteTask(db, ids.vi, taskId)).rejects.toBeInstanceOf(ForbiddenError);
      expect(await rowsOf(listId)).toEqual([row]);
    });

    it.each(notFoundTargets)("reports %s as a missing task", async (_name, target) => {
      const { listId, taskId, row } = await listWithTask("Driveway");
      const [userId, id] = await target(taskId);

      const error: unknown = await deleteTask(db, userId, id).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).resource).toBe("Task");
      expect(await rowsOf(listId)).toEqual([row]);
    });
  });

  describe("setTaskCompleted", () => {
    const complete = (taskId: string, userId: string = ids.alice) =>
      setTaskCompleted(db, userId, taskId, { completed: true });
    const reopen = (taskId: string, userId: string = ids.alice) =>
      setTaskCompleted(db, userId, taskId, { completed: false });
    const titles = (views: readonly { title: string }[]) => views.map((view) => view.title);
    const stored = async (listId: string) =>
      new Map((await rowsOf(listId)).map((row) => [row.title, row]));

    /** Tasks A, B, C in this order; A has subtasks s1, s2, s3 with estimates. */
    async function planned(name: string) {
      const listId = await sharedList(name);
      const a = await createTask(db, ids.alice, listId, { title: "A" });
      for (const [title, amount] of [
        ["s1", 10000],
        ["s2", 20000],
        ["s3", 30000],
      ] as const) {
        await createTask(db, ids.alice, listId, { title, estimate: est(amount), parentId: a.id });
      }
      const b = await createTask(db, ids.alice, listId, { title: "B" });
      const c = await createTask(db, ids.alice, listId, { title: "C" });
      const view = (await listTasks(db, ids.alice, listId))[0]!;
      const [s1, s2, s3] = view.subtasks.map((subtask) => subtask.id) as [string, string, string];
      return { listId, a: a.id, b: b.id, c: c.id, s1, s2, s3 };
    }

    it("completes a task with its subtasks, keeps every position and lists it last (#20 AC1, AC9, AC13)", async () => {
      const { listId, a } = await planned("Completion AC1");
      const before = await stored(listId);

      const view = await complete(a, ids.ed);

      expect(taskViewSchema.parse(view)).toEqual(view);
      expect(view.completed).toBe(true);
      expect(view.subtasks.map((subtask) => subtask.completed)).toEqual([true, true, true]);
      const after = await stored(listId);
      for (const [title, row] of before) expect(after.get(title)!.position).toBe(row.position);
      expect(titles(await listTasks(db, ids.vi, listId))).toEqual(["B", "C", "A"]);
    });

    it("completes a subtask alone: the task stays open, the subtask goes last, the figure stays (#20 AC2, AC6, AC10, R14)", async () => {
      const { listId, a, s1 } = await planned("Completion AC2");

      const view = await complete(s1);

      expect(view).toEqual(
        expect.objectContaining({ id: a, completed: false, estimate: est(60000) }),
      );
      expect(titles(view.subtasks)).toEqual(["s2", "s3", "s1"]);
      expect(view.subtasks.map((subtask) => subtask.completed)).toEqual([false, false, true]);
      expect(await listTasks(db, ids.alice, listId)).toEqual(expect.arrayContaining([view]));
    });

    it("does not complete a task whose subtasks are all completed (#20 AC3, AC6)", async () => {
      const { a, s1, s2, s3 } = await planned("Completion AC3");
      await complete(s1);
      await complete(s2);

      const view = await complete(s3);

      expect(view).toEqual(
        expect.objectContaining({ id: a, completed: false, estimate: est(60000) }),
      );
      expect(view.subtasks.every((subtask) => subtask.completed)).toBe(true);
    });

    it("reopens a task first in the list, writing only its row; its subtasks stay completed (#20 AC4, AC7, AC11)", async () => {
      const { listId, a, b } = await planned("Completion AC4");
      await complete(b);
      await complete(a);
      expect(titles(await listTasks(db, ids.alice, listId))).toEqual(["C", "A", "B"]);
      const before = await stored(listId);

      const view = await reopen(a);

      expect(view).toEqual(
        expect.objectContaining({ completed: false, estimate: est(60000), unestimatedSubtasks: 0 }),
      );
      expect(view.subtasks.map((subtask) => subtask.completed)).toEqual([true, true, true]);
      expect(titles(await listTasks(db, ids.alice, listId))).toEqual(["A", "C", "B"]);
      const after = await stored(listId);
      for (const [title, row] of before) {
        if (title === "A") continue;
        expect(after.get(title)).toEqual(row);
      }
      // Before its first sibling in stored order, completed ones included.
      expect(after.get("A")!.position).toBe(positionBetween(null, before.get("B")!.position));
    });

    it("reopens a subtask first among its task's subtasks (#20 AC5, AC12)", async () => {
      const { s3 } = await planned("Completion AC5");
      await complete(s3);

      const view = await reopen(s3);

      expect(titles(view.subtasks)).toEqual(["s3", "s1", "s2"]);
      expect(view.subtasks.every((subtask) => !subtask.completed)).toBe(true);
    });

    it("reopens one subtask of a completed task and leaves the task completed (Q2-1)", async () => {
      const { a, s2 } = await planned("Completion Q2");
      await complete(a);

      const view = await reopen(s2);

      expect(view).toEqual(
        expect.objectContaining({ id: a, completed: true, estimate: est(60000) }),
      );
      expect(titles(view.subtasks)).toEqual(["s2", "s1", "s3"]);
      expect(view.subtasks.map((subtask) => subtask.completed)).toEqual([false, true, true]);
    });

    it("keeps the key of a task with no sibling when it is reopened", async () => {
      const listId = await sharedList("Completion alone");
      const task = await createTask(db, ids.alice, listId, { title: "Only" });
      await complete(task.id);

      expect(await reopen(task.id)).toEqual(task);
    });

    it("writes nothing for a request in the state the row already has", async () => {
      const { listId, a, b } = await planned("Completion same state");
      await complete(b);
      const before = await rowsOf(listId);

      expect((await reopen(a)).completed).toBe(false);
      expect((await complete(b)).completed).toBe(true);
      expect(await rowsOf(listId)).toEqual(before);
    });

    it("forbids a viewer and hides the task from a non-member and for an unknown id", async () => {
      const { listId, a } = await planned("Completion access");
      const before = await rowsOf(listId);

      await expect(complete(a, ids.vi)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(complete(a, ids.bob)).rejects.toEqual(new NotFoundError("Task"));
      await expect(complete(unknownId)).rejects.toEqual(new NotFoundError("Task"));
      await expect(complete("not-a-uuid")).rejects.toEqual(new NotFoundError("Task"));
      expect(await rowsOf(listId)).toEqual(before);
    });

    it("gives two concurrent reopens distinct keys before their first sibling", async () => {
      const listId = await sharedList("Completion two reopens");
      const created = [];
      for (const title of ["A", "B", "C"]) {
        created.push(await createTask(db, ids.alice, listId, { title }));
      }
      const [a, b, c] = created as [TaskView, TaskView, TaskView];
      await complete(b.id);
      await complete(c.id);

      await Promise.all([reopen(b.id, ids.alice), reopen(c.id, ids.ed)]);

      const rows = await rowsOf(listId);
      expect(new Set(rows.map((row) => row.position)).size).toBe(3);
      expect(rows.map((row) => row.title).slice(2)).toEqual(["A"]);
      expect(rows.every((row) => row.status === "todo")).toBe(true);
      expect(rows[0]!.position < a.position && rows[1]!.position < a.position).toBe(true);
    });

    it("refuses a subtask under a completed task and writes no row (Q3-1)", async () => {
      const { listId, a } = await planned("Completion Q3");
      await complete(a);
      const before = await rowsOf(listId);

      await expect(createTask(db, ids.ed, listId, { title: "Late", parentId: a })).rejects.toEqual(
        parentCompleted,
      );
      expect(await rowsOf(listId)).toEqual(before);
    });
  });

  describe("requireTaskRole", () => {
    const check = (userId: string, taskId: string, action: "read" | "write" | "manage") =>
      db.transaction((tx) => requireTaskRole(tx, userId, taskId, action));

    it("returns the task row to a member with the right role", async () => {
      const listId = await sharedList("Porch");
      const { id } = await createTask(db, ids.alice, listId, { title: "Paint" });

      await expect(check(ids.ed, id, "write")).resolves.toEqual(
        expect.objectContaining({ id, listId, title: "Paint", parentId: null }),
      );
      await expect(check(ids.vi, id, "read")).resolves.toEqual(expect.objectContaining({ id }));
    });

    it("forbids a viewer from writing", async () => {
      const listId = await sharedList("Cellar");
      const { id } = await createTask(db, ids.alice, listId, { title: "Dry" });
      await expect(check(ids.vi, id, "write")).rejects.toBeInstanceOf(ForbiddenError);
    });

    it.each([
      ["an unknown id", () => Promise.resolve(unknownId)],
      ["a malformed id", () => Promise.resolve("not-a-uuid")],
      [
        "another user's task",
        async () => {
          const listId = await sharedList("Study");
          return (await createTask(db, ids.alice, listId, { title: "Desk" })).id;
        },
      ],
    ])("reports %s as a missing task", async (_name, taskIdFor) => {
      const taskId = await taskIdFor();
      const error: unknown = await check(ids.bob, taskId, "read").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).resource).toBe("Task");
    });
  });
  describe("subtasks", () => {
    /** A shared list with "Bathroom", typed at 1 000–2 000 zł. */
    async function parentTask(name: string) {
      const listId = await sharedList(name);
      const parent = await createTask(db, ids.alice, listId, {
        title: "Bathroom",
        estimate: est(100000, 200000),
      });
      return { listId, parentId: parent.id };
    }

    const parentRow = async (parentId: string) =>
      (await db.select().from(schema.tasks).where(eq(schema.tasks.id, parentId)))[0]!;

    it("adds a subtask with a description and an estimate under its task and returns the task (#16 AC1)", async () => {
      const { listId, parentId } = await parentTask("Bath AC1");
      const before = await parentRow(parentId);

      const view = await createTask(db, ids.ed, listId, {
        title: " Plaster ",
        description: " Two layers ",
        estimate: est(30000, 40000),
        parentId,
      });

      expect(taskViewSchema.parse(view)).toEqual(view);
      expect(view).toEqual({
        id: parentId,
        title: "Bathroom",
        description: null,
        estimate: est(30000, 40000),
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: expect.any(String),
        unestimatedSubtasks: 0,
        subtasks: [
          {
            id: expect.any(String),
            title: "Plaster",
            description: "Two layers",
            estimate: est(30000, 40000),
            completed: false,
            important: false,
            urgent: false,
            places: [],
            position: expect.any(String),
          },
        ],
      });
      // The parent's typed figure is kept, only hidden (R15).
      expect(await parentRow(parentId)).toEqual(before);
      expect(await listTasks(db, ids.vi, listId)).toEqual([view]);

      // Subtasks append among their siblings; top-level tasks keep their own sequence.
      const second = await createTask(db, ids.alice, listId, { title: "Paint", parentId });
      const next = await createTask(db, ids.alice, listId, { title: "Kitchen" });
      const rows = await rowsOf(listId);
      const positionOf = (id: string) => rows.find((r) => r.id === id)?.position;
      expect(second.subtasks.map((t) => t.title)).toEqual(["Plaster", "Paint"]);
      expect(second.subtasks.map((t) => positionOf(t.id))).toEqual(["a0", "a1"]);
      expect(rows.find((r) => r.title === "Plaster")).toEqual(
        expect.objectContaining({ listId, parentId, status: "todo", costGrosze: null }),
      );
      expect([positionOf(parentId), positionOf(next.id)]).toEqual(["a0", "a1"]);
      expect((await listTasks(db, ids.vi, listId)).map((t) => t.id)).toEqual([parentId, next.id]);
    });

    it("sums the subtasks into the task, and deleting them brings its own figure back (#16 AC2, R12, R15)", async () => {
      const { listId, parentId } = await parentTask("Bath AC2");
      const before = await parentRow(parentId);

      const one = await createTask(db, ids.ed, listId, {
        title: "Plaster",
        estimate: est(30000, 40000),
        parentId,
      });
      expect(one.estimate).toEqual(est(30000, 40000));
      const both = await createTask(db, ids.ed, listId, {
        title: "Paint",
        estimate: est(50000),
        parentId,
      });
      expect(both.estimate).toEqual(est(80000, 90000));
      expect(await listTasks(db, ids.vi, listId)).toEqual([both]);

      const [plaster, paint] = both.subtasks;
      const afterFirst = await deleteTask(db, ids.ed, plaster!.id);
      expect(afterFirst).toEqual({ ...both, estimate: est(50000), subtasks: [paint] });
      const afterLast = await deleteTask(db, ids.ed, paint!.id);
      expect(afterLast).toEqual({
        id: parentId,
        title: "Bathroom",
        description: null,
        estimate: est(100000, 200000),
        completed: false,
        important: false,
        urgent: false,
        places: [],
        position: expect.any(String),
        unestimatedSubtasks: 0,
        subtasks: [],
      });
      expect(await listTasks(db, ids.vi, listId)).toEqual([afterLast]);
      expect(await parentRow(parentId)).toEqual(before);

      // A task that never had its own figure goes back to none.
      const hall = await createTask(db, ids.alice, listId, { title: "Hall" });
      const withSub = await createTask(db, ids.alice, listId, {
        title: "Skirting",
        estimate: est(50000),
        parentId: hall.id,
      });
      expect(withSub.estimate).toEqual(est(50000));
      await expect(deleteTask(db, ids.alice, withSub.subtasks[0]!.id)).resolves.toEqual(hall);
    });

    it("leaves subtasks without an estimate out of the sum and counts them (#16 AC3, R13)", async () => {
      const { listId, parentId } = await parentTask("Bath AC3");
      await createTask(db, ids.ed, listId, {
        title: "Plaster",
        estimate: est(30000, 40000),
        parentId,
      });

      const mixed = await createTask(db, ids.ed, listId, { title: "Paint", parentId });
      expect(mixed).toEqual(
        expect.objectContaining({ estimate: est(30000, 40000), unestimatedSubtasks: 1 }),
      );

      const noneLeft = await deleteTask(db, ids.ed, mixed.subtasks[0]!.id);
      expect(noneLeft).toEqual(expect.objectContaining({ estimate: null, unestimatedSubtasks: 1 }));
      const allWithout = await createTask(db, ids.ed, listId, { title: "Grout", parentId });
      expect(allWithout).toEqual(
        expect.objectContaining({ estimate: null, unestimatedSubtasks: 2 }),
      );
      expect(await listTasks(db, ids.vi, listId)).toEqual([allWithout]);
    });

    it("changes the task's figure when a subtask's estimate is edited and refuses an estimate edit of the task (#16 AC4)", async () => {
      const { listId, parentId } = await parentTask("Bath AC4");
      const created = await createTask(db, ids.ed, listId, {
        title: "Plaster",
        estimate: est(30000, 40000),
        parentId,
      });
      const subtaskId = created.subtasks[0]!.id;

      const edited = await updateTask(db, ids.ed, subtaskId, { estimate: est(70000, 80000) });
      expect(taskViewSchema.parse(edited)).toEqual(edited);
      expect(edited).toEqual({
        ...created,
        estimate: est(70000, 80000),
        subtasks: [{ ...created.subtasks[0], estimate: est(70000, 80000) }],
      });
      const renamed = await updateTask(db, ids.ed, subtaskId, { title: "Skim coat" });
      expect(renamed.id).toBe(parentId);
      expect(renamed.subtasks.map((t) => t.title)).toEqual(["Skim coat"]);

      const before = await parentRow(parentId);
      for (const input of [
        { estimate: est(300000, 400000) },
        { estimate: null },
        { title: "Bathroom walls", estimate: est(1) },
      ]) {
        await expect(updateTask(db, ids.alice, parentId, input)).rejects.toEqual(
          parentWithSubtasks,
        );
      }
      expect(await parentRow(parentId)).toEqual(before);

      const titled = await updateTask(db, ids.alice, parentId, { title: "Bathroom walls" });
      expect(titled).toEqual({ ...renamed, title: "Bathroom walls" });
      expect(await listTasks(db, ids.vi, listId)).toEqual([titled]);
    });

    it("keeps counting a completed subtask (R14)", async () => {
      const { listId, parentId } = await parentTask("Bath R14");
      const view = await createTask(db, ids.ed, listId, {
        title: "Plaster",
        estimate: est(30000, 40000),
        parentId,
      });
      await db
        .update(schema.tasks)
        .set({ status: "done" })
        .where(eq(schema.tasks.id, view.subtasks[0]!.id));

      expect(await listTasks(db, ids.vi, listId)).toEqual([
        { ...view, subtasks: [{ ...view.subtasks[0]!, completed: true }] },
      ]);
      expect(view.estimate).toEqual(est(30000, 40000));
    });

    it("returns a sum above the cap on typed amounts, which passes the response schemas", async () => {
      const { listId, parentId } = await parentTask("Bath cap");
      let view: TaskView | undefined;
      for (const title of ["Marble", "Gold taps", "Sauna"]) {
        view = await createTask(db, ids.ed, listId, {
          title,
          estimate: est(MAX_ESTIMATE_GROSZE),
          parentId,
        });
      }

      // 3 × the cap is also above PostgreSQL's integer range: the sum is not computed in SQL.
      expect(view?.estimate).toEqual(est(3 * MAX_ESTIMATE_GROSZE));
      expect(taskViewSchema.parse(view)).toEqual(view);
      const listed = await listTasks(db, ids.vi, listId);
      expect(taskListResponseSchema.parse(listed)).toEqual([view]);
    });

    it("refuses a subtask under a subtask and writes nothing", async () => {
      const { listId, parentId } = await parentTask("Bath depth");
      const { subtasks } = await createTask(db, ids.ed, listId, { title: "Plaster", parentId });
      const before = await rowsOf(listId);

      await expect(
        createTask(db, ids.ed, listId, { title: "Too deep", parentId: subtasks[0]!.id }),
      ).rejects.toEqual(new ConflictError("Subtasks cannot have subtasks"));
      expect(await rowsOf(listId)).toEqual(before);
    });

    it("reports a parent in another list or an unknown parent as a missing task", async () => {
      const { listId, parentId } = await parentTask("Bath here");
      const otherList = await sharedList("Bath there");

      for (const target of [parentId, unknownId]) {
        const error: unknown = await createTask(db, ids.alice, otherList, {
          title: "Misplaced",
          parentId: target,
        }).catch((e: unknown) => e);
        expect(error).toEqual(new NotFoundError("Task"));
      }
      await expect(
        createTask(db, ids.alice, otherList, { title: "x", parentId: "not-a-uuid" }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(await rowsOf(otherList)).toEqual([]);
      expect(await rowsOf(listId)).toHaveLength(1);
    });

    it("hides another user's task as a parent, and their subtasks (#16 AC5)", async () => {
      const aliceList = await ensureDefaultList(db, ids.alice);
      const bobList = await ensureDefaultList(db, ids.bob);
      const parent = await createTask(db, ids.alice, aliceList, { title: "Alice's bathroom" });
      const { subtasks } = await createTask(db, ids.alice, aliceList, {
        title: "Alice's plaster",
        parentId: parent.id,
      });
      const aliceRows = await rowsOf(aliceList);
      const bobRows = await rowsOf(bobList);

      const onOwnList: unknown = await createTask(db, ids.bob, bobList, {
        title: "Hacked",
        parentId: parent.id,
      }).catch((e: unknown) => e);
      expect(onOwnList).toEqual(new NotFoundError("Task"));
      await expect(
        createTask(db, ids.bob, aliceList, { title: "Hacked", parentId: parent.id }),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(updateTask(db, ids.bob, subtasks[0]!.id, { estimate: est(1) })).rejects.toEqual(
        new NotFoundError("Task"),
      );
      await expect(deleteTask(db, ids.bob, subtasks[0]!.id)).rejects.toEqual(
        new NotFoundError("Task"),
      );
      expect(await rowsOf(aliceList)).toEqual(aliceRows);
      expect(await rowsOf(bobList)).toEqual(bobRows);
    });

    it("forbids a viewer from adding, editing or deleting a subtask", async () => {
      const { listId, parentId } = await parentTask("Bath viewer");
      const { subtasks } = await createTask(db, ids.ed, listId, { title: "Plaster", parentId });
      const before = await rowsOf(listId);

      await expect(
        createTask(db, ids.vi, listId, { title: "Nope", parentId }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(
        updateTask(db, ids.vi, subtasks[0]!.id, { title: "Nope" }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(deleteTask(db, ids.vi, subtasks[0]!.id)).rejects.toBeInstanceOf(ForbiddenError);
      expect(await rowsOf(listId)).toEqual(before);
    });
  });

  describe("subtasks under concurrency", () => {
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

    async function waitUntilBlockedBy(waiterPid: number, blockerPid: number) {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        const { rows } = await pool.query<{ blocked: boolean }>(
          "SELECT $2::int = ANY(pg_blocking_pids($1::int)) AS blocked",
          [waiterPid, blockerPid],
        );
        if (rows[0]!.blocked) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`backend ${waiterPid} never waited on backend ${blockerPid}`);
    }

    /**
     * Runs `work` in a transaction on the shared pool that holds its locks until released, then
     * commits (or rolls back with `rollback`). A service cannot be paused from outside, so a
     * holder of a row it needs stops it at that row.
     */
    function holdInTransaction(work: (tx: Tx) => Promise<unknown>, { rollback = false } = {}) {
      const locked = deferred<number>();
      const release = deferred();
      const done = settle(
        db.transaction(async (tx) => {
          await work(tx);
          const { rows } = await tx.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`);
          locked.resolve(rows[0]!.pid);
          await release.promise;
          if (rollback) tx.rollback();
        }),
      );
      const pid = Promise.race([
        locked.promise,
        done.then((r) => Promise.reject(new Error(`holder ended early: ${String(r)}`))),
      ]);
      return { pid, release: release.resolve, done };
    }

    const lockRow = (table: "lists" | "tasks", id: string, mode: "key share" | "no key update") =>
      holdInTransaction((tx) => {
        const t = table === "lists" ? schema.lists : schema.tasks;
        return tx.select({ id: t.id }).from(t).where(eq(t.id, id)).for(mode);
      });

    /** A shared list with "Bathroom", typed at 1 000–2 000 zł. */
    async function parentTask(name: string) {
      const listId = await sharedList(name);
      const parent = await createTask(db, ids.alice, listId, {
        title: "Bathroom",
        estimate: est(100000, 200000),
      });
      return { listId, parentId: parent.id };
    }

    const estimateRow = async (taskId: string) =>
      (
        await db
          .select({ min: schema.tasks.estimateMinGrosze, max: schema.tasks.estimateMaxGrosze })
          .from(schema.tasks)
          .where(eq(schema.tasks.id, taskId))
      )[0];

    it("makes an estimate edit that waited for the parent see a subtask committed meanwhile: 409, figure kept", async () => {
      const { listId, parentId } = await parentTask("Race 409");
      // Holds the parent FOR KEY SHARE: the edit's FOR UPDATE waits, a subtask insert does not.
      const holder = lockRow("tasks", parentId, "key share");
      let patching: Promise<Settled<TaskView>> | undefined;
      let created: TaskView | undefined;
      let patchResult: Settled<TaskView> | undefined;
      try {
        const holderPid = await holder.pid;
        patching = settle(updateTask(ownerDb, ids.alice, parentId, { estimate: est(300000) }));
        await waitUntilBlockedBy(ownerPid, holderPid);
        created = await createTask(editorDb, ids.ed, listId, {
          title: "Plaster",
          estimate: est(30000, 40000),
          parentId,
        });
      } finally {
        holder.release();
        await holder.done;
        patchResult = await patching;
      }

      expect(created?.estimate).toEqual(est(30000, 40000));
      expect(patchResult).toEqual({ error: parentWithSubtasks });
      expect(await estimateRow(parentId)).toEqual({ min: 100000, max: 200000 });
      expect(await listTasks(db, ids.vi, listId)).toEqual([created]);
    });

    it("saves an estimate edit that committed before the first subtask, then hides it behind the sum", async () => {
      const { listId, parentId } = await parentTask("Race saved");
      // Holds the list row, so the subtask insert stops at its append lock.
      const holder = lockRow("lists", listId, "no key update");
      let creating: Promise<Settled<TaskView>> | undefined;
      let patched: TaskView | undefined;
      let createResult: Settled<TaskView> | undefined;
      try {
        const holderPid = await holder.pid;
        creating = settle(
          createTask(editorDb, ids.ed, listId, {
            title: "Plaster",
            estimate: est(30000, 40000),
            parentId,
          }),
        );
        await waitUntilBlockedBy(editorPid, holderPid);
        patched = await updateTask(ownerDb, ids.alice, parentId, { estimate: est(300000) });
      } finally {
        holder.release();
        await holder.done;
        createResult = await creating;
      }

      expect(patched).toEqual(expect.objectContaining({ estimate: est(300000), subtasks: [] }));
      expect(createResult).toEqual({
        value: expect.objectContaining({ id: parentId, estimate: est(30000, 40000) }),
      });
      expect(await estimateRow(parentId)).toEqual({ min: 300000, max: 300000 });
      const [listed] = await listTasks(db, ids.vi, listId);
      expect(listed?.estimate).toEqual(est(30000, 40000));
    });

    it("adds one subtask while another is deleted: both commit and the list sums what remains", async () => {
      const { listId, parentId } = await parentTask("Race add delete");
      await createTask(db, ids.alice, listId, {
        title: "Plaster",
        estimate: est(30000, 40000),
        parentId,
      });
      const { subtasks } = await createTask(db, ids.alice, listId, {
        title: "Paint",
        estimate: est(50000),
        parentId,
      });
      const [plaster, paint] = subtasks;
      // Holds the list row, so the insert waits while the delete commits.
      const holder = lockRow("lists", listId, "no key update");
      let creating: Promise<Settled<TaskView>> | undefined;
      let deleted: TaskView | null | undefined;
      let createResult: Settled<TaskView> | undefined;
      try {
        const holderPid = await holder.pid;
        creating = settle(
          createTask(editorDb, ids.ed, listId, { title: "Grout", estimate: est(1000), parentId }),
        );
        await waitUntilBlockedBy(editorPid, holderPid);
        deleted = await deleteTask(ownerDb, ids.alice, plaster!.id);
      } finally {
        holder.release();
        await holder.done;
        createResult = await creating;
      }

      // Each response is computed in its own transaction and misses the other's row.
      expect(deleted).toEqual(expect.objectContaining({ estimate: est(50000), subtasks: [paint] }));
      expect(createResult).toEqual({ value: expect.objectContaining({ estimate: est(51000) }) });
      const [listed] = await listTasks(db, ids.vi, listId);
      expect(listed?.subtasks.map((t) => t.title)).toEqual(["Paint", "Grout"]);
      expect(listed?.estimate).toEqual(est(51000));
    });

    it("makes a subtask add wait for a parent delete that locked the parent first, then report it as missing", async () => {
      const { listId, parentId } = await parentTask("Race delete first");
      const { subtasks } = await createTask(db, ids.alice, listId, { title: "Plaster", parentId });
      // Holds the existing subtask, so the delete stops in its cascade with the parent deleted.
      const holder = lockRow("tasks", subtasks[0]!.id, "key share");
      let deleting: Promise<Settled<TaskView | null>> | undefined;
      let creating: Promise<Settled<TaskView>> | undefined;
      let deleteResult: Settled<TaskView | null> | undefined;
      let createResult: Settled<TaskView> | undefined;
      try {
        const holderPid = await holder.pid;
        deleting = settle(deleteTask(ownerDb, ids.alice, parentId));
        await waitUntilBlockedBy(ownerPid, holderPid);
        creating = settle(createTask(editorDb, ids.ed, listId, { title: "Too late", parentId }));
        await waitUntilBlockedBy(editorPid, ownerPid);
      } finally {
        holder.release();
        await holder.done;
        deleteResult = await deleting;
        createResult = await creating;
      }

      expect(deleteResult).toEqual({ value: null });
      expect(createResult).toEqual({ error: new NotFoundError("Task") });
      expect(await rowsOf(listId)).toEqual([]);
    });

    it("makes a parent delete wait for a subtask add that locked the parent first, then cascade the new subtask", async () => {
      const { listId, parentId } = await parentTask("Race add first");
      // An uncommitted sibling at the key the add will pick: the add stops at the unique check of
      // its insert, after its explicit parent lock and before the FK check takes one.
      const holder = holdInTransaction(
        (tx) =>
          tx
            .insert(schema.tasks)
            .values({ listId, parentId, title: "Holder", position: positionBetween(null, null) }),
        { rollback: true },
      );
      let creating: Promise<Settled<TaskView>> | undefined;
      let deleting: Promise<Settled<TaskView | null>> | undefined;
      let createResult: Settled<TaskView> | undefined;
      let deleteResult: Settled<TaskView | null> | undefined;
      try {
        const holderPid = await holder.pid;
        creating = settle(createTask(editorDb, ids.ed, listId, { title: "Grout", parentId }));
        await waitUntilBlockedBy(editorPid, holderPid);
        deleting = settle(deleteTask(ownerDb, ids.alice, parentId));
        await waitUntilBlockedBy(ownerPid, holderPid);
      } finally {
        holder.release();
        await holder.done;
        createResult = await creating;
        deleteResult = await deleting;
      }

      expect(createResult).toEqual({
        value: expect.objectContaining({
          id: parentId,
          subtasks: [expect.objectContaining({ title: "Grout" })],
        }),
      });
      expect(deleteResult).toEqual({ value: null });
      expect(await rowsOf(listId)).toEqual([]);
    });

    describe("a completion racing a subtask add on the same task (C-1)", () => {
      /**
       * Holds the list row, queues `first` (owner) and then `second` (editor) behind it, and
       * releases: waiters on a row lock are served in order, so `first` commits before `second`
       * reads the parent.
       */
      async function race<A, B>(listId: string, first: () => Promise<A>, second: () => Promise<B>) {
        const holder = lockRow("lists", listId, "no key update");
        let firstRun: Promise<Settled<A>> | undefined;
        let secondRun: Promise<Settled<B>> | undefined;
        try {
          const holderPid = await holder.pid;
          firstRun = settle(first());
          await waitUntilBlockedBy(ownerPid, holderPid);
          secondRun = settle(second());
          await waitUntilBlockedBy(editorPid, ownerPid);
        } finally {
          holder.release();
          await holder.done;
        }
        return { first: await firstRun, second: await secondRun };
      }

      it("completes the new subtask too when the add commits first", async () => {
        const { listId, parentId } = await parentTask("Race add then complete");

        const result = await race(
          listId,
          () => createTask(ownerDb, ids.alice, listId, { title: "Grout", parentId }),
          () => setTaskCompleted(editorDb, ids.ed, parentId, { completed: true }),
        );

        expect(result.first).toEqual({ value: expect.objectContaining({ id: parentId }) });
        expect(result.second).toEqual({
          value: expect.objectContaining({
            completed: true,
            subtasks: [expect.objectContaining({ title: "Grout", completed: true })],
          }),
        });
        expect((await rowsOf(listId)).map((row) => row.status)).toEqual(["done", "done"]);
      });

      it("refuses the add with 409 when the completion commits first", async () => {
        const { listId, parentId } = await parentTask("Race complete then add");

        const result = await race(
          listId,
          () => setTaskCompleted(ownerDb, ids.alice, parentId, { completed: true }),
          () => createTask(editorDb, ids.ed, listId, { title: "Grout", parentId }),
        );

        expect(result.first).toEqual({ value: expect.objectContaining({ completed: true }) });
        expect(result.second).toEqual({ error: parentCompleted });
        expect(await rowsOf(listId)).toEqual([expect.objectContaining({ status: "done" })]);
      });
    });
  });

  describe("moveTask (#17)", () => {
    const listChanged = new ConflictError("The list changed. Try again.");
    const move = (
      taskId: string,
      afterId: string | null,
      beforeId: string | null,
      userId = ids.ed,
    ) => moveTask(db, userId, taskId, { afterId, beforeId });
    const order = async (listId: string) =>
      (await listTasks(db, ids.alice, listId)).map((task) => task.title).join("");
    const positions = async (listId: string) =>
      new Map((await rowsOf(listId)).map((row) => [row.title, row.position]));

    /** Tasks A, B, C, D in this order; A has subtasks s1, s2. */
    async function planned(name: string) {
      const listId = await sharedList(name);
      const made: Record<string, string> = {};
      for (const title of ["A", "B", "C", "D"]) {
        made[title] = (await createTask(db, ids.alice, listId, { title })).id;
      }
      for (const title of ["s1", "s2"]) {
        const parent = await createTask(db, ids.alice, listId, { title, parentId: made.A! });
        made[title] = parent.subtasks.at(-1)!.id;
      }
      return { listId, ...made } as Record<string, string> & { listId: string };
    }

    it("moves a task between two others, writing only its own position (AC1, AC2)", async () => {
      const t = await planned("Move AC1");
      const before = await positions(t.listId);

      const view = await move(t.D!, t.A!, t.B!);

      expect(taskViewSchema.parse(view)).toEqual(view);
      expect(await order(t.listId)).toBe("ADBC");
      const after = await positions(t.listId);
      for (const title of ["A", "B", "C", "s1", "s2"]) {
        expect(after.get(title)).toBe(before.get(title));
      }
      expect(after.get("D")).not.toBe(before.get("D"));
    });

    it("moves a subtask within its task and returns the task (AC4)", async () => {
      const t = await planned("Move AC4");

      const view = await move(t.s2!, null, t.s1!);

      expect(view.id).toBe(t.A);
      expect(view.subtasks.map((subtask) => subtask.title)).toEqual(["s2", "s1"]);
      expect(await order(t.listId)).toBe("ABCD");
    });

    it("refuses a subtask moved to the top level or into another task, and a task among subtasks (AC5)", async () => {
      const t = await planned("Move AC5");
      const b1 = (await createTask(db, ids.alice, t.listId, { title: "b1", parentId: t.B! }))
        .subtasks[0]!.id;
      const before = await positions(t.listId);

      expect(await settle(move(t.s1!, t.A!, t.B!))).toEqual({ error: listChanged });
      expect(await settle(move(t.s1!, b1, null))).toEqual({ error: listChanged });
      expect(await settle(move(t.C!, t.s1!, t.s2!))).toEqual({ error: listChanged });
      expect(await positions(t.listId)).toEqual(before);
    });

    it("refuses a completed row, and moves an open subtask of a completed task (AC9, E03 Q2)", async () => {
      const t = await planned("Move AC9");
      await setTaskCompleted(db, ids.alice, t.C!, { completed: true });
      const before = await positions(t.listId);

      expect(await settle(move(t.C!, null, t.A!))).toEqual({ error: parentCompleted });
      expect(await positions(t.listId)).toEqual(before);

      await setTaskCompleted(db, ids.alice, t.A!, { completed: true });
      await setTaskCompleted(db, ids.alice, t.s1!, { completed: false });
      await setTaskCompleted(db, ids.alice, t.s2!, { completed: false });
      const view = await move(t.s2!, null, t.s1!);
      expect(view.subtasks.map((subtask) => subtask.title)).toEqual(["s2", "s1"]);
    });

    it("keeps the asked open order next to completed siblings, never taking their keys", async () => {
      const t = await planned("Move past completed");
      await setTaskCompleted(db, ids.alice, t.B!, { completed: true });

      await move(t.D!, t.A!, t.C!);

      expect(await order(t.listId)).toBe("ADCB");
      const keys = [...(await positions(t.listId)).values()];
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("refuses a move whose neighbours are no longer adjacent (M-1: A, C, D, B)", async () => {
      const t = await planned("Move M-1");
      await move(t.B!, t.D!, null);
      const before = await positions(t.listId);

      expect(await settle(move(t.C!, t.A!, t.B!))).toEqual({ error: listChanged });
      expect(await positions(t.listId)).toEqual(before);
      expect(await order(t.listId)).toBe("ACDB");
    });

    it("succeeds with no write when the row already sits there (M-2: A, C, B)", async () => {
      const listId = await sharedList("Move M-2");
      const made: string[] = [];
      for (const title of ["A", "B", "C"]) {
        made.push((await createTask(db, ids.alice, listId, { title })).id);
      }
      const [idA, idB, idC] = made as [string, string, string];
      await move(idB, idC, null);
      const before = await positions(listId);

      await move(idC, idA, idB);

      expect(await positions(listId)).toEqual(before);
      expect(await order(listId)).toBe("ACB");
    });

    it("lets a viewer read but not move, and hides the task from a non-member (403, 404)", async () => {
      const t = await planned("Move roles");

      expect(await settle(move(t.D!, null, t.A!, ids.vi))).toEqual({
        error: expect.any(ForbiddenError),
      });
      expect(await settle(move(t.D!, null, t.A!, ids.bob))).toEqual({
        error: new NotFoundError("Task"),
      });
      expect(await settle(move(unknownId, null, t.A!))).toEqual({
        error: new NotFoundError("Task"),
      });
      expect(await order(t.listId)).toBe("ABCD");
    });

    it("never gives two siblings the same position when two moves race (C-1)", async () => {
      const t = await planned("Move C-1");

      const results = await Promise.all([
        settle(move(t.D!, null, t.A!)),
        settle(move(t.C!, null, t.A!)),
      ]);

      // Both name A as the first open row; the one that takes the list lock second finds the
      // other's row already before A, so it is refused.
      expect(results.filter((result) => "value" in result)).toHaveLength(1);
      expect(results.filter((result) => "error" in result)).toEqual([{ error: listChanged }]);
      const keys = (await rowsOf(t.listId))
        .filter((row) => row.parentId === null)
        .map((row) => row.position);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("rejects input other than the two neighbour ids", async () => {
      const t = await planned("Move input");
      expect(await settle(moveTask(db, ids.ed, t.D!, { afterId: "x", beforeId: null }))).toEqual({
        error: expect.any(ZodError),
      });
    });
  });
});
