import {
  apiResponseSchema,
  deleteTaskResponseSchema,
  futureExpensesResponseSchema,
  taskListResponseSchema,
  type TaskView,
  taskViewSchema,
} from "@taskly/core";
import { ensureDefaultList } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authRequest,
  clientIps,
  closeUserDb,
  createUser,
  type RunningApp,
  sessionCookie,
  startApp,
  touchesSessionCookie,
} from "./helpers";

const run = `taskshttp${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";
const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * DAY_MS;
// Server work between "now" in the test and the write in the app; far below the 1-day renewal step.
const CLOCK_SLACK_MS = 5 * 60 * 1000;
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Call = {
  method?: Method;
  cookie?: string;
  /** Sent as JSON unless it is already a string (to send a malformed body as is). */
  body?: unknown;
  /** The header the client helper always sets; `false` sends the request without it. */
  csrf?: boolean;
};

// The task routes over HTTP against the production build and a real database.
describe("task routes over HTTP", () => {
  let app: RunningApp;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(120);

  let owner: { id: string; cookie: string; listId: string };
  let viewer: { id: string; cookie: string };
  let stranger: { id: string; cookie: string; listId: string };

  /** The session row's token: the signed cookie value is `<token>.<signature>`. */
  const tokenOf = (cookie: string) => decodeURIComponent(cookie.split("=")[1]!).split(".")[0]!;
  const sessionRow = async (token: string) =>
    (await db.select().from(schema.session).where(eq(schema.session.token, token)))[0];
  const taskRow = async (id: string) =>
    (await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)))[0];

  async function signIn(slug: string) {
    const user = await createUser({ name: `User ${slug}`, email: email(slug), password });
    const res = await authRequest(app, "/sign-in/email", {
      forwardedFor: nextIp(),
      body: { email: email(slug), password },
    });
    expect(res.status).toBe(200);
    const cookie = sessionCookie(res);
    expect(cookie).toBeDefined();
    return { id: user.id, cookie: cookie! };
  }

  function api(path: string, { method = "GET", cookie, body, csrf = true }: Call = {}) {
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = cookie;
    if (csrf) headers["x-requested-with"] = "taskly";
    if (body !== undefined) headers["content-type"] = "application/json";
    const payload = typeof body === "string" || body === undefined ? body : JSON.stringify(body);
    return fetch(`${app.url}/api${path}`, { method, headers, body: payload, redirect: "manual" });
  }

  /** The response's envelope, checked against the shape every client accepts. */
  async function envelope(res: Response) {
    return apiResponseSchema.parse(await res.json());
  }

  async function okData(res: Response, status = 200) {
    expect(res.status).toBe(status);
    const body = await envelope(res);
    if (!body.ok) throw new Error(`Expected success, got ${body.error.code}`);
    return body.data;
  }

  async function failure(res: Response, status: number) {
    expect(res.status).toBe(status);
    const body = await envelope(res);
    if (body.ok) throw new Error("Expected an error envelope");
    return body.error;
  }

  const tasksPath = (listId: string) => `/lists/${listId}/tasks`;
  const expensesPath = (listId: string) => `/lists/${listId}/future-expenses`;

  async function createOwnerTask(title: string, estimate: unknown = null): Promise<TaskView> {
    const res = await api(tasksPath(owner.listId), {
      method: "POST",
      cookie: owner.cookie,
      body: { title, estimate },
    });
    return taskViewSchema.parse(await okData(res));
  }

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, { port: 3205 });
    const o = await signIn("owner");
    owner = { ...o, listId: await ensureDefaultList(db, o.id) };
    viewer = await signIn("viewer");
    await db
      .insert(schema.listMembers)
      .values({ listId: owner.listId, userId: viewer.id, role: "viewer" });
    const s = await signIn("stranger");
    stranger = { ...s, listId: await ensureDefaultList(db, s.id) };
  });

  afterAll(async () => {
    await app?.stop();
    // Default lists (and with them memberships and tasks) go with their user through the FKs.
    const users = await db
      .delete(schema.user)
      .where(like(schema.user.email, `${run}-%`))
      .returning({ id: schema.user.id });
    if (users.length > 0) {
      const left = await db
        .select()
        .from(schema.lists)
        .where(
          inArray(
            schema.lists.defaultForUserId,
            users.map((u) => u.id),
          ),
        );
      expect(left).toEqual([]);
    }
    await pool.end();
    await closeUserDb();
  });

  it("lists an empty default list", async () => {
    const res = await api(tasksPath(stranger.listId), { cookie: stranger.cookie });
    expect(taskListResponseSchema.parse(await okData(res))).toEqual([]);
  });

  it("creates tasks that pass their schema and lists them in order", async () => {
    const range = await createOwnerTask("Tiles", { minGrosze: 150_000, maxGrosze: 200_000 });
    expect(range).toEqual({
      id: expect.any(String),
      title: "Tiles",
      description: null,
      estimate: { minGrosze: 150_000, maxGrosze: 200_000 },
      completed: false,
      important: false,
      urgent: false,
      places: [],
      position: expect.any(String),
      unestimatedSubtasks: 0,
      subtasks: [],
    });
    const exact = await createOwnerTask("Grout", { minGrosze: 1_250, maxGrosze: 1_250 });
    const none = await createOwnerTask("Silicone");

    const res = await api(tasksPath(owner.listId), { cookie: owner.cookie });
    const listed = taskListResponseSchema.parse(await okData(res));
    const ids = listed.map((t) => t.id);
    expect(ids.indexOf(range.id)).toBeLessThan(ids.indexOf(exact.id));
    expect(ids.indexOf(exact.id)).toBeLessThan(ids.indexOf(none.id));
    expect(listed.find((t) => t.id === exact.id)).toEqual(exact);
    expect(listed.find((t) => t.id === none.id)?.estimate).toBeNull();
  });

  it("writes only the parsed fields of a create body", async () => {
    const res = await api(tasksPath(owner.listId), {
      method: "POST",
      cookie: owner.cookie,
      body: {
        title: "Mirror",
        listId: stranger.listId,
        position: "zzz",
        costGrosze: 999,
      },
    });
    const created = taskViewSchema.parse(await okData(res));
    const row = await taskRow(created.id);
    expect(row).toMatchObject({ listId: owner.listId, parentId: null, costGrosze: null });
    expect(row?.position).not.toBe("zzz");
  });

  it("updates only the fields sent and deletes a task", async () => {
    const task = await createOwnerTask("Paint", { minGrosze: 30_000, maxGrosze: 40_000 });
    const patched = await api(`/tasks/${task.id}`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: { title: "Paint the ceiling" },
    });
    expect(taskViewSchema.parse(await okData(patched))).toEqual({
      ...task,
      title: "Paint the ceiling",
    });

    const deleted = await api(`/tasks/${task.id}`, { method: "DELETE", cookie: owner.cookie });
    expect(deleteTaskResponseSchema.parse(await okData(deleted))).toBeNull();
    expect(await taskRow(task.id)).toBeUndefined();
    const again = await api(`/tasks/${task.id}`, { method: "DELETE", cookie: owner.cookie });
    expect(await failure(again, 404)).toMatchObject({ code: "not_found" });
  });

  it("adds, edits and deletes a subtask, answering with its parent, and answers 409 and 404 where the subtask rules say so", async () => {
    const parent = await createOwnerTask("Bathroom", { minGrosze: 100_000, maxGrosze: 200_000 });
    const added = await api(tasksPath(owner.listId), {
      method: "POST",
      cookie: owner.cookie,
      body: {
        title: "Plaster",
        estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
        parentId: parent.id,
      },
    });
    const withSubtask = taskViewSchema.parse(await okData(added));
    expect(withSubtask).toEqual({
      ...parent,
      estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
      subtasks: [
        {
          id: expect.any(String),
          title: "Plaster",
          description: null,
          estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
          completed: false,
          important: false,
          urgent: false,
          places: [],
          position: expect.any(String),
        },
      ],
    });
    const subtaskId = withSubtask.subtasks[0]!.id;

    const deeper = await api(tasksPath(owner.listId), {
      method: "POST",
      cookie: owner.cookie,
      body: { title: "Too deep", parentId: subtaskId },
    });
    expect(await failure(deeper, 409)).toEqual({
      code: "conflict",
      message: "Subtasks cannot have subtasks",
    });
    const parentEstimate = await api(`/tasks/${parent.id}`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: { title: "Bathroom walls", estimate: null },
    });
    expect(await failure(parentEstimate, 409)).toEqual({
      code: "conflict",
      message: "A task with subtasks takes its estimate from them",
    });
    expect(await taskRow(parent.id)).toMatchObject({
      title: "Bathroom",
      estimateMinGrosze: 100_000,
      estimateMaxGrosze: 200_000,
    });
    const foreignParent = await api(tasksPath(stranger.listId), {
      method: "POST",
      cookie: stranger.cookie,
      body: { title: "Hacked", parentId: parent.id },
    });
    expect(await failure(foreignParent, 404)).toMatchObject({ code: "not_found" });

    const edited = await api(`/tasks/${subtaskId}`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: { estimate: { minGrosze: 50_000, maxGrosze: 50_000 } },
    });
    expect(taskViewSchema.parse(await okData(edited))).toEqual({
      ...withSubtask,
      estimate: { minGrosze: 50_000, maxGrosze: 50_000 },
      subtasks: [
        { ...withSubtask.subtasks[0], estimate: { minGrosze: 50_000, maxGrosze: 50_000 } },
      ],
    });
    const deleted = await api(`/tasks/${subtaskId}`, { method: "DELETE", cookie: owner.cookie });
    expect(deleteTaskResponseSchema.parse(await okData(deleted))).toEqual(parent);
  });

  it("sets and clears one marker per PATCH, leaving the other as it is, and answers 400 for a non-boolean (#18)", async () => {
    const task = await createOwnerTask("Fence");
    const patch = (body: unknown) =>
      api(`/tasks/${task.id}`, { method: "PATCH", cookie: owner.cookie, body });

    const important = taskViewSchema.parse(await okData(await patch({ important: true })));
    expect(important).toEqual({ ...task, important: true });
    const both = taskViewSchema.parse(await okData(await patch({ urgent: true })));
    expect(both).toEqual({ ...task, important: true, urgent: true });
    const cleared = taskViewSchema.parse(await okData(await patch({ urgent: false })));
    expect(cleared).toEqual({ ...task, important: true, urgent: false });
    expect(await taskRow(task.id)).toMatchObject({
      important: true,
      urgent: false,
      title: "Fence",
    });

    for (const body of [{ urgent: "yes" }, { important: null }]) {
      const res = await api(`/tasks/${task.id}`, { method: "PATCH", cookie: owner.cookie, body });
      expect(await failure(res, 400)).toMatchObject({ code: "validation_error" });
    }
    expect(await taskRow(task.id)).toMatchObject({ important: true, urgent: false });

    const viewerTry = await api(`/tasks/${task.id}`, {
      method: "PATCH",
      cookie: viewer.cookie,
      body: { urgent: true },
    });
    expect(await failure(viewerTry, 403)).toEqual({ code: "forbidden", message: "Forbidden" });
    expect(await taskRow(task.id)).toMatchObject({ urgent: false });
  });

  it("completes a task with its subtasks, reopens it, and answers 400 for a bad body", async () => {
    const parent = await createOwnerTask("Hallway");
    const added = await api(tasksPath(owner.listId), {
      method: "POST",
      cookie: owner.cookie,
      body: { title: "Prime", parentId: parent.id },
    });
    const withSubtask = taskViewSchema.parse(await okData(added));
    const path = `/tasks/${parent.id}/completion`;

    const done = await api(path, {
      method: "PUT",
      cookie: owner.cookie,
      body: { completed: true },
    });
    const completed = taskViewSchema.parse(await okData(done));
    expect(completed.completed).toBe(true);
    expect(completed.subtasks.map((s) => s.completed)).toEqual([true]);
    expect((await taskRow(parent.id))?.status).toBe("done");

    const reopened = await api(path, {
      method: "PUT",
      cookie: owner.cookie,
      body: { completed: false },
    });
    // Only the task reopens (R11): its subtask stays completed, and it is keyed before its first
    // sibling, or keeps its key without one (decision 2026-10-21).
    const open = taskViewSchema.parse(await okData(reopened));
    expect(open).toEqual({
      ...completed,
      completed: false,
      position: expect.any(String),
    });
    expect(open.position <= withSubtask.position).toBe(true);

    for (const body of [{}, { completed: "yes" }, { completed: true, title: "x" }, "{completed:"]) {
      const res = await api(path, { method: "PUT", cookie: owner.cookie, body });
      expect((await failure(res, 400)).code).toBe("validation_error");
    }
    expect((await taskRow(parent.id))?.status).toBe("todo");
  });

  it("moves a task between its new neighbours and answers 400 and 409 where the move rules say so (#17)", async () => {
    const first = await createOwnerTask("Porch");
    const last = await createOwnerTask("Gate");
    const move = (id: string, body: unknown) =>
      api(`/tasks/${id}/position`, { method: "PUT", cookie: owner.cookie, body });

    // Porch goes after Gate, the last open task: only Porch's key changes.
    const lastBefore = await taskRow(last.id);
    const moved = taskViewSchema.parse(
      await okData(await move(first.id, { afterId: last.id, beforeId: null })),
    );
    expect(moved).toEqual({ ...first, position: expect.any(String) });
    expect(moved.position > last.position).toBe(true);
    expect((await taskRow(first.id))?.position).toBe(moved.position);
    expect(await taskRow(last.id)).toEqual(lastBefore);

    for (const body of [
      {},
      { afterId: "x", beforeId: null },
      { afterId: null, beforeId: null, position: "a0" },
      "{afterId:",
    ]) {
      expect((await failure(await move(first.id, body), 400)).code).toBe("validation_error");
    }
    // Neighbours that are not adjacent open siblings any more.
    expect(
      await failure(await move(last.id, { afterId: first.id, beforeId: UNKNOWN_ID }), 409),
    ).toEqual({
      code: "conflict",
      message: "The list changed. Try again.",
    });
    await okData(
      await api(`/tasks/${first.id}/completion`, {
        method: "PUT",
        cookie: owner.cookie,
        body: { completed: true },
      }),
    );
    expect(await failure(await move(first.id, { afterId: null, beforeId: null }), 409)).toEqual({
      code: "conflict",
      message: "Task is completed",
    });
    expect((await taskRow(first.id))?.position).toBe(moved.position);
  });

  it("answers the future expenses of open main tasks in grosze, following completion", async () => {
    const planner = await signIn("planner");
    const listId = await ensureDefaultList(db, planner.id);
    const total = async () => {
      const res = await api(expensesPath(listId), { cookie: planner.cookie });
      return futureExpensesResponseSchema.parse(await okData(res)).total;
    };
    const add = async (body: object) => {
      const res = await api(tasksPath(listId), { method: "POST", cookie: planner.cookie, body });
      return taskViewSchema.parse(await okData(res));
    };
    expect(await total()).toBeNull();

    const tiles = await add({
      title: "Tiles",
      estimate: { minGrosze: 100_000, maxGrosze: 200_000 },
    });
    const walls = await add({
      title: "Walls",
      estimate: { minGrosze: 900_000, maxGrosze: 900_000 },
    });
    // The subtask's 300–400 zł replaces the task's own figure (R12, R17).
    await add({
      title: "Plaster",
      parentId: walls.id,
      estimate: { minGrosze: 30_000, maxGrosze: 40_000 },
    });
    await add({ title: "Paint" });
    expect(await total()).toEqual({ minGrosze: 130_000, maxGrosze: 240_000 });

    const completion = (completed: boolean) =>
      api(`/tasks/${tiles.id}/completion`, {
        method: "PUT",
        cookie: planner.cookie,
        body: { completed },
      });
    await okData(await completion(true));
    expect(await total()).toEqual({ minGrosze: 30_000, maxGrosze: 40_000 });
    await okData(await completion(false));
    expect(await total()).toEqual({ minGrosze: 130_000, maxGrosze: 240_000 });
  });

  it("lists what has no estimate and drops it after an estimate is added (#47)", async () => {
    const pricer = await signIn("pricer");
    const listId = await ensureDefaultList(db, pricer.id);
    const expenses = async () => {
      const res = await api(expensesPath(listId), { cookie: pricer.cookie });
      return futureExpensesResponseSchema.parse(await okData(res));
    };
    const add = async (body: object) => {
      const res = await api(tasksPath(listId), { method: "POST", cookie: pricer.cookie, body });
      return taskViewSchema.parse(await okData(res));
    };
    const addEstimate = (id: string, estimate: object) =>
      api(`/tasks/${id}`, { method: "PATCH", cookie: pricer.cookie, body: { estimate } });
    expect(await expenses()).toEqual({ total: null, unestimated: [] });

    const seal = await add({ title: "Seal the bath" });
    const bathroom = await add({ title: "Bathroom tiles" });
    const [tiles] = (await add({ title: "Tiles", parentId: bathroom.id })).subtasks;
    expect((await expenses()).unestimated).toEqual([
      { id: seal.id, title: "Seal the bath" },
      { id: tiles!.id, title: "Tiles", taskTitle: "Bathroom tiles" },
    ]);

    await okData(await addEstimate(tiles!.id, { minGrosze: 40_000, maxGrosze: 40_000 }));
    expect(await expenses()).toEqual({
      total: { minGrosze: 40_000, maxGrosze: 40_000 },
      unestimated: [{ id: seal.id, title: "Seal the bath" }],
    });

    // An item that gained subtasks meanwhile: the existing 409, and its subtask is listed instead.
    const [caulk] = (await add({ title: "Caulk", parentId: seal.id })).subtasks;
    const refused = await addEstimate(seal.id, { minGrosze: 100, maxGrosze: 200 });
    expect((await failure(refused, 409)).code).toBe("conflict");
    expect((await expenses()).unestimated).toEqual([
      { id: caulk!.id, title: "Caulk", taskTitle: "Seal the bath" },
    ]);
  });

  it("retries a refused estimate save and replaying it counts the estimate only once", async () => {
    const pricer = await signIn("estimate-retry");
    const listId = await ensureDefaultList(db, pricer.id);
    const created = await api(tasksPath(listId), {
      method: "POST",
      cookie: pricer.cookie,
      body: { title: "Hooks" },
    });
    const task = taskViewSchema.parse(await okData(created));
    const expenses = async () => {
      const res = await api(expensesPath(listId), { cookie: pricer.cookie });
      return futureExpensesResponseSchema.parse(await okData(res));
    };
    const save = (estimate: object) =>
      api(`/tasks/${task.id}`, {
        method: "PATCH",
        cookie: pricer.cookie,
        body: { estimate },
      });
    const before = await taskRow(task.id);
    const invalid = await save({ minGrosze: 20_000, maxGrosze: 10_000 });
    expect((await failure(invalid, 400)).code).toBe("validation_error");
    expect(await taskRow(task.id)).toEqual(before);
    expect(await expenses()).toEqual({
      total: null,
      unestimated: [{ id: task.id, title: "Hooks" }],
    });

    const estimate = { minGrosze: 10_000, maxGrosze: 20_000 };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const saved = taskViewSchema.parse(await okData(await save(estimate)));
      expect(saved.estimate).toEqual(estimate);
      expect(await expenses()).toEqual({ total: estimate, unestimated: [] });
      const listed = await api(tasksPath(listId), { cookie: pricer.cookie });
      expect(taskListResponseSchema.parse(await okData(listed))).toEqual([saved]);
    }
  });

  it("rejects every mutation without the CSRF header and changes nothing", async () => {
    const task = await createOwnerTask("Door");
    const before = await taskRow(task.id);
    const calls: [string, Call][] = [
      [tasksPath(owner.listId), { method: "POST", body: { title: "Sneaky" } }],
      [`/tasks/${task.id}`, { method: "PATCH", body: { title: "Sneaky" } }],
      [`/tasks/${task.id}`, { method: "DELETE" }],
      [`/tasks/${task.id}/completion`, { method: "PUT", body: { completed: true } }],
      [`/tasks/${task.id}/position`, { method: "PUT", body: { afterId: null, beforeId: null } }],
    ];
    for (const [path, call] of calls) {
      const res = await api(path, { ...call, cookie: owner.cookie, csrf: false });
      expect(await failure(res, 403)).toEqual({ code: "forbidden", message: "Forbidden" });
    }
    expect(await taskRow(task.id)).toEqual(before);
    const listed = taskListResponseSchema.parse(
      await okData(await api(tasksPath(owner.listId), { cookie: owner.cookie })),
    );
    expect(listed.some((t) => t.title === "Sneaky")).toBe(false);
  });

  it("answers 400 with field errors keyed by the field path", async () => {
    const created = await api(tasksPath(owner.listId), {
      method: "POST",
      cookie: owner.cookie,
      body: { title: " ", estimate: { minGrosze: 500, maxGrosze: 100 } },
    });
    const error = await failure(created, 400);
    expect(error.code).toBe("validation_error");
    expect(Object.keys(error.fieldErrors ?? {}).sort()).toEqual(["estimate.maxGrosze", "title"]);

    const task = await createOwnerTask("Window");
    const patched = await api(`/tasks/${task.id}`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: { title: "", description: "x".repeat(2_001) },
    });
    expect(Object.keys((await failure(patched, 400)).fieldErrors ?? {}).sort()).toEqual([
      "description",
      "title",
    ]);
    expect((await taskRow(task.id))?.title).toBe("Window");
  });

  it("answers 400 for a body that is not JSON", async () => {
    for (const body of ["{title:", ""]) {
      const res = await api(tasksPath(owner.listId), {
        method: "POST",
        cookie: owner.cookie,
        body,
      });
      expect(await failure(res, 400)).toEqual({
        code: "validation_error",
        message: "Invalid JSON body",
      });
    }
  });

  it("answers 401 without a session, also with a stale cookie", async () => {
    const task = await createOwnerTask("Shelf");
    const calls: [string, Call][] = [
      [tasksPath(owner.listId), {}],
      [tasksPath(owner.listId), { method: "POST", body: { title: "x" } }],
      [`/tasks/${task.id}`, { method: "PATCH", body: { title: "x" } }],
      [`/tasks/${task.id}`, { method: "DELETE" }],
      [`/tasks/${task.id}/completion`, { method: "PUT", body: { completed: true } }],
      [`/tasks/${task.id}/position`, { method: "PUT", body: { afterId: null, beforeId: null } }],
      [expensesPath(owner.listId), {}],
    ];
    const stale = `${owner.cookie.split("=")[0]}=not-a-session.sig`;
    for (const [path, call] of calls)
      for (const cookie of [undefined, stale]) {
        const res = await api(path, { ...call, cookie });
        expect(await failure(res, 401)).toEqual({ code: "unauthorized", message: "Unauthorized" });
      }
    expect((await taskRow(task.id))?.title).toBe("Shelf");
  });

  it("answers 404 for another user's list or task, and for unknown or malformed ids", async () => {
    const task = await createOwnerTask("Radiator");
    const calls: [string, Call][] = [
      [tasksPath(owner.listId), {}],
      [tasksPath(owner.listId), { method: "POST", body: { title: "x" } }],
      [`/tasks/${task.id}`, { method: "PATCH", body: { title: "x" } }],
      [`/tasks/${task.id}`, { method: "DELETE" }],
      [tasksPath(UNKNOWN_ID), {}],
      [tasksPath("not-a-uuid"), {}],
      [`/tasks/${UNKNOWN_ID}`, { method: "PATCH", body: { title: "x" } }],
      [`/tasks/not-a-uuid`, { method: "DELETE" }],
      [`/tasks/${task.id}/completion`, { method: "PUT", body: { completed: true } }],
      [`/tasks/${task.id}/position`, { method: "PUT", body: { afterId: null, beforeId: null } }],
      [`/tasks/${UNKNOWN_ID}/completion`, { method: "PUT", body: { completed: true } }],
      [`/tasks/${UNKNOWN_ID}/position`, { method: "PUT", body: { afterId: null, beforeId: null } }],
      [`/tasks/not-a-uuid/position`, { method: "PUT", body: { afterId: null, beforeId: null } }],
      [expensesPath(owner.listId), {}],
      [expensesPath(UNKNOWN_ID), {}],
      [expensesPath("not-a-uuid"), {}],
    ];
    for (const [path, call] of calls) {
      const res = await api(path, { ...call, cookie: stranger.cookie });
      expect(await failure(res, 404)).toMatchObject({ code: "not_found" });
    }
    expect((await taskRow(task.id))?.title).toBe("Radiator");
  });

  it("lets a viewer read the list but not change it", async () => {
    const task = await createOwnerTask("Skirting");
    const listed = await api(tasksPath(owner.listId), { cookie: viewer.cookie });
    expect(taskListResponseSchema.parse(await okData(listed)).some((t) => t.id === task.id)).toBe(
      true,
    );
    // A viewer reads the same total as the owner.
    const expenses = async (cookie: string) =>
      futureExpensesResponseSchema.parse(
        await okData(await api(expensesPath(owner.listId), { cookie })),
      );
    expect(await expenses(viewer.cookie)).toEqual(await expenses(owner.cookie));

    const calls: [string, Call][] = [
      [tasksPath(owner.listId), { method: "POST", body: { title: "x" } }],
      [`/tasks/${task.id}`, { method: "PATCH", body: { title: "x" } }],
      [`/tasks/${task.id}`, { method: "DELETE" }],
      [`/tasks/${task.id}/completion`, { method: "PUT", body: { completed: true } }],
      [`/tasks/${task.id}/position`, { method: "PUT", body: { afterId: null, beforeId: null } }],
    ];
    for (const [path, call] of calls) {
      const res = await api(path, { ...call, cookie: viewer.cookie });
      expect(await failure(res, 403)).toEqual({ code: "forbidden", message: "Forbidden" });
    }
    expect((await taskRow(task.id))?.title).toBe("Skirting");
  });

  it("renews a session due for renewal on GET …/tasks, cookie and database together", async () => {
    const user = await signIn("renew");
    const listId = await ensureDefaultList(db, user.id);
    const token = tokenOf(user.cookie);

    const fresh = await api(tasksPath(listId), { cookie: user.cookie });
    expect(fresh.status).toBe(200);
    expect(touchesSessionCookie(fresh)).toBe(false);

    // Renewal is due once expiresAt - 30 days + 1 day has passed; 28 days left is 1 day past that.
    const aged = new Date(Date.now() + 28 * DAY_MS);
    await db.update(schema.session).set({ expiresAt: aged }).where(eq(schema.session.token, token));

    // The page that opens the list first: a full document request (no `RSC: 1`) must not spend
    // the renewal, or the API call below would find nothing left to renew.
    const doc = await fetch(`${app.url}/`, {
      headers: { cookie: user.cookie },
      redirect: "manual",
    });
    expect(doc.status).toBe(200);
    const html = await doc.text();
    // The page gave this list to the screen (its id is in the screen's props).
    expect(html).toContain(listId);
    expect(html).not.toContain("Could not open your tasks.");
    expect(touchesSessionCookie(doc)).toBe(false);
    expect((await sessionRow(token))?.expiresAt).toEqual(aged);

    const res = await api(tasksPath(listId), { cookie: user.cookie });
    expect(taskListResponseSchema.parse(await okData(res))).toEqual([]);
    const renewed = sessionCookie(res);
    expect(renewed).toBeDefined();
    expect(tokenOf(renewed!)).toBe(token);
    expect(res.headers.getSetCookie().join("\n")).toMatch(/Max-Age=2592000/i);
    const expiresAt = (await sessionRow(token))!.expiresAt;
    expect(expiresAt.getTime()).toBeGreaterThan(aged.getTime());
    expect(Math.abs(expiresAt.getTime() - (Date.now() + SESSION_TTL_MS))).toBeLessThan(
      CLOCK_SLACK_MS,
    );
  });
});
