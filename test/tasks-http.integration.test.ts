import {
  apiResponseSchema,
  deleteTaskResponseSchema,
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

type Method = "GET" | "POST" | "PATCH" | "DELETE";
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
        parentId: UNKNOWN_ID,
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

  it("rejects every mutation without the CSRF header and changes nothing", async () => {
    const task = await createOwnerTask("Door");
    const before = await taskRow(task.id);
    const calls: [string, Call][] = [
      [tasksPath(owner.listId), { method: "POST", body: { title: "Sneaky" } }],
      [`/tasks/${task.id}`, { method: "PATCH", body: { title: "Sneaky" } }],
      [`/tasks/${task.id}`, { method: "DELETE" }],
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

    const calls: [string, Call][] = [
      [tasksPath(owner.listId), { method: "POST", body: { title: "x" } }],
      [`/tasks/${task.id}`, { method: "PATCH", body: { title: "x" } }],
      [`/tasks/${task.id}`, { method: "DELETE" }],
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
