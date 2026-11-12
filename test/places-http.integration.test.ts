import {
  apiResponseSchema,
  placeListResponseSchema,
  placeMessages,
  placeViewSchema,
  PREDEFINED_PLACES,
  taskViewSchema,
} from "@taskly/core";
import { ensureDefaultList } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { like } from "drizzle-orm";
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
} from "./helpers";

const run = `placeshttp${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

type Call = { method?: string; cookie?: string; body?: unknown; csrf?: boolean };

// The place routes over HTTP against the production build and a real database (spec E02, #19).
describe("place routes over HTTP", () => {
  let app: RunningApp;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(140);
  let owner: { id: string; cookie: string; listId: string };
  let viewer: { id: string; cookie: string };
  let stranger: { id: string; cookie: string };

  async function signIn(slug: string) {
    const user = await createUser({ name: `User ${slug}`, email: email(slug), password });
    const res = await authRequest(app, "/sign-in/email", {
      forwardedFor: nextIp(),
      body: { email: email(slug), password },
    });
    expect(res.status).toBe(200);
    return { id: user.id, cookie: sessionCookie(res)! };
  }

  function api(path: string, { method = "GET", cookie, body, csrf = true }: Call = {}) {
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = cookie;
    if (csrf) headers["x-requested-with"] = "taskly";
    if (body !== undefined) headers["content-type"] = "application/json";
    const payload = typeof body === "string" || body === undefined ? body : JSON.stringify(body);
    return fetch(`${app.url}/api${path}`, { method, headers, body: payload, redirect: "manual" });
  }

  async function okData(res: Response) {
    expect(res.status).toBe(200);
    const body = apiResponseSchema.parse(await res.json());
    if (!body.ok) throw new Error(`Expected success, got ${body.error.code}`);
    return body.data;
  }

  async function failure(res: Response, status: number) {
    expect(res.status).toBe(status);
    const body = apiResponseSchema.parse(await res.json());
    if (body.ok) throw new Error("Expected an error envelope");
    return body.error;
  }

  const places = async (cookie: string) =>
    placeListResponseSchema.parse(await okData(await api("/places", { cookie })));

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, { port: 3212 });
    const o = await signIn("owner");
    owner = { ...o, listId: await ensureDefaultList(db, o.id) };
    viewer = await signIn("viewer");
    await db
      .insert(schema.listMembers)
      .values({ listId: owner.listId, userId: viewer.id, role: "viewer" });
    stranger = await signIn("stranger");
  });

  afterAll(async () => {
    await app?.stop();
    // Lists, places and assignments go with their user through the FKs.
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
    await closeUserDb();
  });

  it("lists the eight predefined places on the first GET, the same ones after (AC1)", async () => {
    const first = await places(owner.cookie);
    expect(first.map((place) => [place.name, place.color])).toEqual(
      PREDEFINED_PLACES.map((name, i) => [name, i + 1]),
    );
    expect(await places(owner.cookie)).toEqual(first);
  });

  it("creates a place with the next colour, refuses a bad or duplicate name (AC4, AC5, AC8)", async () => {
    const res = await api("/places", {
      method: "POST",
      cookie: owner.cookie,
      body: { name: " Jadalnia " },
    });
    expect(placeViewSchema.parse(await okData(res))).toEqual(
      expect.objectContaining({ name: "Jadalnia", color: 9 }),
    );
    const empty = await failure(
      await api("/places", { method: "POST", cookie: owner.cookie, body: { name: "" } }),
      400,
    );
    expect(empty.fieldErrors).toEqual({ name: [placeMessages.emptyName] });
    const dup = await failure(
      await api("/places", { method: "POST", cookie: owner.cookie, body: { name: "łazienka" } }),
      409,
    );
    expect(dup.message).toBe(placeMessages.duplicateName);
    expect((await api("/places", { method: "POST", cookie: owner.cookie, body: "{" })).status).toBe(
      400,
    );
  });

  it("renames, recolours and deletes only the user's own place; 404 for a malformed id (P3)", async () => {
    const [salon] = await places(owner.cookie);
    const path = `/places/${salon!.id}`;
    const renamed = await okData(
      await api(path, { method: "PATCH", cookie: owner.cookie, body: { name: "Hol", color: 10 } }),
    );
    expect(renamed).toEqual({ id: salon!.id, name: "Hol", color: 10 });
    await failure(
      await api(path, { method: "PATCH", cookie: owner.cookie, body: { name: "Kuchnia" } }),
      409,
    );
    await failure(await api(path, { method: "PATCH", cookie: owner.cookie, body: {} }), 400);
    await failure(
      await api(path, { method: "PATCH", cookie: stranger.cookie, body: { color: 2 } }),
      404,
    );
    await failure(await api(path, { method: "DELETE", cookie: stranger.cookie }), 404);
    await failure(
      await api("/places/not-a-uuid", {
        method: "PATCH",
        cookie: owner.cookie,
        body: { color: 2 },
      }),
      404,
    );
    await failure(await api("/places/not-a-uuid", { method: "DELETE", cookie: owner.cookie }), 404);
    expect(await okData(await api(path, { method: "DELETE", cookie: owner.cookie }))).toBeNull();
    await failure(await api(path, { method: "DELETE", cookie: owner.cookie }), 404);
  });

  it("assigns and unassigns a place on a task, idempotently; refuses others' places, viewers and bad ids", async () => {
    const task = taskViewSchema.parse(
      await okData(
        await api(`/lists/${owner.listId}/tasks`, {
          method: "POST",
          cookie: owner.cookie,
          body: { title: "Curtain rod" },
        }),
      ),
    );
    const kuchnia = (await places(owner.cookie)).find((place) => place.name === "Kuchnia")!;
    const path = `/tasks/${task.id}/places/${kuchnia.id}`;

    for (let i = 0; i < 2; i += 1) {
      const view = taskViewSchema.parse(
        await okData(await api(path, { method: "PUT", cookie: owner.cookie })),
      );
      expect(view.places).toEqual([kuchnia]);
    }
    const [strangers] = await places(stranger.cookie);
    await failure(
      await api(`/tasks/${task.id}/places/${strangers!.id}`, {
        method: "PUT",
        cookie: owner.cookie,
      }),
      404,
    );
    await failure(
      await api(`/tasks/${task.id}/places/not-a-uuid`, { method: "PUT", cookie: owner.cookie }),
      404,
    );
    await failure(
      await api(`/tasks/${UNKNOWN_ID}/places/${kuchnia.id}`, {
        method: "PUT",
        cookie: owner.cookie,
      }),
      404,
    );
    await failure(await api(path, { method: "DELETE", cookie: viewer.cookie }), 403);
    await failure(await api(path, { method: "PUT", cookie: stranger.cookie }), 404);
    // The viewer sees the owner's place through the task (Q3).
    const listed = await okData(
      await api(`/lists/${owner.listId}/tasks`, { cookie: viewer.cookie }),
    );
    expect(JSON.stringify(listed)).toContain(kuchnia.id);

    for (let i = 0; i < 2; i += 1) {
      const view = taskViewSchema.parse(
        await okData(await api(path, { method: "DELETE", cookie: owner.cookie })),
      );
      expect(view.places).toEqual([]);
    }
  });

  it("answers 401 without a session and 403 for a write without the CSRF header", async () => {
    await failure(await api("/places"), 401);
    await failure(
      await api("/places", {
        method: "POST",
        cookie: owner.cookie,
        body: { name: "X" },
        csrf: false,
      }),
      403,
    );
    await failure(
      await api(`/places/${UNKNOWN_ID}`, { method: "DELETE", cookie: owner.cookie, csrf: false }),
      403,
    );
    await failure(
      await api(`/tasks/${UNKNOWN_ID}/places/${UNKNOWN_ID}`, {
        method: "PUT",
        cookie: owner.cookie,
        csrf: false,
      }),
      403,
    );
  });
});
