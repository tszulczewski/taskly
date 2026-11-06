import { schema } from "@taskly/db";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NotFoundError } from "./errors";
import { futureExpensesService } from "./futureExpensesService";
import { createList } from "./lists";
import { createTask, deleteTask, setTaskCompleted, updateTask } from "./tasks";

const url = process.env.DATABASE_URL;
const run = `fex${Date.now()}`;
const ids = { alice: `${run}-alice`, bob: `${run}-bob`, vi: `${run}-vi` };
const unknownId = "00000000-0000-4000-8000-000000000000";

/** An estimate in grosze from złoty. */
const zl = (min: number, max = min) => ({ minGrosze: min * 100, maxGrosze: max * 100 });

describe.skipIf(!url)("future expenses service (real PostgreSQL)", () => {
  const pool = new Pool({ connectionString: url, max: 2 });
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

  /** A project list owned by alice, with vi as viewer. */
  async function list(name: string) {
    const { id } = await createList(db, ids.alice, { name });
    created.push(id);
    await db.insert(schema.listMembers).values({ listId: id, userId: ids.vi, role: "viewer" });
    return id;
  }

  const add = (listId: string, title: string, extra: object = {}) =>
    createTask(db, ids.alice, listId, { title, ...extra });
  const total = async (listId: string, userId = ids.alice) =>
    (await futureExpensesService(db, userId, listId)).total;

  it("adds up open tasks' ranges and exact prices (#21 AC1, AC7)", async () => {
    const ranges = await list("Ranges");
    await add(ranges, "Tiles", { estimate: zl(1000, 2000) });
    await add(ranges, "Paint", { estimate: zl(500, 700) });
    expect(await total(ranges)).toEqual(zl(1500, 2700));

    const exact = await list("Exact");
    await add(exact, "Rod", { estimate: zl(500) });
    await add(exact, "Hooks", { estimate: zl(300) });
    expect(await total(exact)).toEqual(zl(800));
  });

  it("counts a task with subtasks once, with their sum (#21 AC2)", async () => {
    const listId = await list("Bathroom");
    const task = await add(listId, "Bathroom", { estimate: zl(1000, 2000) });
    await add(listId, "Plaster", { parentId: task.id, estimate: zl(300, 400) });
    await add(listId, "Grout", { parentId: task.id, estimate: zl(500) });
    expect(await total(listId)).toEqual(zl(800, 900));
  });

  it("leaves out tasks without an estimate and those whose subtasks all lack one (#21 AC3)", async () => {
    const listId = await list("Hall");
    expect(await total(listId)).toBeNull();
    await add(listId, "Paint");
    const task = await add(listId, "Floor", { estimate: zl(2000) });
    await add(listId, "Skirting", { parentId: task.id });
    expect(await total(listId)).toBeNull();
    await add(listId, "Lamp", { estimate: zl(150, 250) });
    expect(await total(listId)).toEqual(zl(150, 250));
  });

  it("follows completion, reopening, edits and deletes (#21 AC4, AC5)", async () => {
    const listId = await list("Kitchen");
    const cabinets = await add(listId, "Cabinets", { estimate: zl(4000, 6000) });
    const sink = await add(listId, "Sink", { estimate: zl(800) });
    const withSubtask = await add(listId, "Walls");
    const primer = await add(listId, "Primer", { parentId: withSubtask.id, estimate: zl(100) });
    expect(await total(listId)).toEqual(zl(4900, 6900));

    // Completing only a subtask changes nothing (R14).
    await setTaskCompleted(db, ids.alice, primer.subtasks[0]!.id, { completed: true });
    expect(await total(listId)).toEqual(zl(4900, 6900));

    await setTaskCompleted(db, ids.alice, cabinets.id, { completed: true });
    expect(await total(listId)).toEqual(zl(900));
    await setTaskCompleted(db, ids.alice, cabinets.id, { completed: false });
    expect(await total(listId)).toEqual(zl(4900, 6900));

    await updateTask(db, ids.alice, sink.id, { estimate: zl(1000, 1200) });
    expect(await total(listId)).toEqual(zl(5100, 7300));
    await deleteTask(db, ids.alice, sink.id);
    expect(await total(listId)).toEqual(zl(4100, 6100));

    for (const id of [cabinets.id, withSubtask.id]) {
      await setTaskCompleted(db, ids.alice, id, { completed: true });
    }
    expect(await total(listId)).toBeNull();
  });

  const unestimated = async (listId: string, userId = ids.alice) =>
    (await futureExpensesService(db, userId, listId)).unestimated;

  it("lists what has no estimate, in display order (#47 AC1–AC3, AC5, AC7)", async () => {
    const listId = await list("Unpriced");
    const seal = await add(listId, "Seal the bath");
    await add(listId, "Mirror", { estimate: zl(200) });
    const bathroom = await add(listId, "Bathroom tiles", { estimate: zl(900) });
    await add(listId, "Tiles", { parentId: bathroom.id });
    const withGrout = await add(listId, "Grout", { parentId: bathroom.id, estimate: zl(400) });
    const [tiles] = withGrout.subtasks;
    const done = await add(listId, "Old door");
    await setTaskCompleted(db, ids.alice, done.id, { completed: true });
    const walls = await add(listId, "Walls");
    await add(listId, "Prime", { parentId: walls.id });
    const withPaint = await add(listId, "Paint", { parentId: walls.id });
    const [prime, paint] = withPaint.subtasks;
    await setTaskCompleted(db, ids.alice, prime!.id, { completed: true });

    expect(await unestimated(listId)).toEqual([
      { id: seal.id, title: "Seal the bath" },
      { id: tiles!.id, title: "Tiles", taskTitle: "Bathroom tiles" },
      { id: paint!.id, title: "Paint", taskTitle: "Walls" },
    ]);
    expect(await total(listId)).toEqual(zl(600));
  });

  it("drops an item once it has an estimate, which the total then counts (#47 AC4)", async () => {
    const listId = await list("Priced later");
    const seal = await add(listId, "Seal the bath");
    const kitchen = await add(listId, "Kitchen");
    const withSink = await add(listId, "Sink", { parentId: kitchen.id });
    const [sink] = withSink.subtasks;

    await updateTask(db, ids.alice, seal.id, { estimate: zl(100, 150) });
    expect(await unestimated(listId)).toEqual([
      { id: sink!.id, title: "Sink", taskTitle: "Kitchen" },
    ]);
    expect(await total(listId)).toEqual(zl(100, 150));

    await updateTask(db, ids.alice, sink!.id, { estimate: zl(300) });
    expect(await unestimated(listId, ids.vi)).toEqual([]);
    expect(await total(listId)).toEqual(zl(400, 450));
  });

  it("does not list a subtask reopened under a completed task (Q2-1)", async () => {
    const listId = await list("Reopened");
    const task = await add(listId, "Floor");
    const withSand = await add(listId, "Sand", { parentId: task.id });
    const [sand] = withSand.subtasks;
    await setTaskCompleted(db, ids.alice, task.id, { completed: true });
    await setTaskCompleted(db, ids.alice, sand!.id, { completed: false });
    expect(await unestimated(listId)).toEqual([]);
  });

  it("lets a viewer read the total", async () => {
    const listId = await list("Attic");
    await add(listId, "Insulation", { estimate: zl(3000, 3500) });
    expect(await total(listId, ids.vi)).toEqual(zl(3000, 3500));
  });

  it.each([
    ["a non-member", async () => [ids.bob, await list("Private")]],
    ["an unknown list", async () => [ids.alice, unknownId]],
    ["a malformed id", async () => [ids.alice, "not-a-uuid"]],
  ])("answers 404 for %s", async (_, target) => {
    const [userId, listId] = await target();
    await expect(futureExpensesService(db, userId!, listId!)).rejects.toEqual(
      new NotFoundError("List"),
    );
  });
});
