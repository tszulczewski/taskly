import { schema } from "@taskly/db";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { ForbiddenError, NotFoundError } from "./errors";
import { createList, ensureDefaultList } from "./lists";
import { positionBetween } from "./position";
import { taskListResponseSchema, taskViewSchema } from "./schemas";
import { createTask, deleteTask, listTasks, requireTaskRole, updateTask } from "./tasks";

const url = process.env.DATABASE_URL;
const run = `tsk${Date.now()}`;
const ids = { alice: `${run}-alice`, bob: `${run}-bob`, ed: `${run}-ed`, vi: `${run}-vi` };
const unknownId = "00000000-0000-4000-8000-000000000000";

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

  /** Inserts a subtask directly: the services create none until task 3.1. */
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
        unestimatedSubtasks: 1,
        subtasks: [
          {
            id: plaster,
            title: "Sub a0",
            description: null,
            estimate: { minGrosze: 30000, maxGrosze: 40000 },
          },
          { id: paint, title: "Sub a1", description: null, estimate: null },
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
});
