import { schema } from "@taskly/db";
import { and, eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authRequest,
  clientIps,
  closeUserDb,
  createBrowser,
  createUser,
  type RunningApp,
  sessionCookie,
  startApp,
} from "./helpers";

const databaseUrl = () => process.env.DATABASE_URL as string;
const run = `app${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";
const HEADING = "My renovation";
const PAGE_FAILED = "Could not open your tasks.";

// Smoke test of the production build and the `/` page. Auth behaviour has its own suites
// (auth-*.integration.test.ts); the task routes have tasks-http.integration.test.ts.
describe("running app (production build + test PostgreSQL)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-integration");
  const pool = new Pool({ connectionString: databaseUrl(), max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(200);

  const defaultLists = (userId: string) =>
    db
      .select({ id: schema.lists.id, name: schema.lists.name, kind: schema.lists.kind })
      .from(schema.lists)
      .where(eq(schema.lists.defaultForUserId, userId));
  const memberships = (listId: string) =>
    db
      .select({ userId: schema.listMembers.userId, role: schema.listMembers.role })
      .from(schema.listMembers)
      .where(eq(schema.listMembers.listId, listId));

  beforeAll(async () => {
    app = await startApp(databaseUrl());
  });

  afterAll(async () => {
    try {
      browser.close();
    } catch {
      // browser was never opened
    }
    await app?.stop();
    // A user's default list (and its membership) goes with the user through the FKs.
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

  it("renders the sign-in page in a real browser", () => {
    browser.open(`${app.url}/sign-in`);
    expect(browser.title()).toBe("Sign in · Taskly");
    expect(browser.url()).toBe(`${app.url}/sign-in`);
    expect(browser.snapshot()).toContain("heading");
  });

  it("mounts the auth API", async () => {
    const res = await fetch(`${app.url}/api/auth/ok`);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("sends a signed-out visitor from / to /sign-in", async () => {
    browser.open("about:blank");
    browser.clearCookies();
    browser.open(`${app.url}/`);
    await browser.waitForPath("/sign-in");
    expect(browser.title()).toBe("Sign in · Taskly");
  });

  it("creates one default list on the first visit to / and reuses it afterwards", async () => {
    const user = await createUser({ name: "First Visit", email: email("first"), password });
    expect(await defaultLists(user.id)).toEqual([]);
    const res = await authRequest(app, "/sign-in/email", {
      forwardedFor: nextIp(),
      body: { email: email("first"), password },
    });
    const cookie = sessionCookie(res);
    if (!cookie) throw new Error(`Sign-in over HTTP failed with ${res.status}`);
    browser.open("about:blank");
    browser.clearCookies();
    browser.setSessionCookie(cookie, app.url);

    browser.open(`${app.url}/`);
    await browser.waitForText(HEADING);
    expect(browser.url()).toBe(`${app.url}/`);
    expect(browser.evaluate<string>("document.querySelector('h1').textContent")).toBe(HEADING);
    expect(browser.alerts()).not.toContain(PAGE_FAILED);
    const lists = await defaultLists(user.id);
    expect(lists).toEqual([{ id: expect.any(String), name: HEADING, kind: "project" }]);
    expect(await memberships(lists[0]!.id)).toEqual([{ userId: user.id, role: "owner" }]);

    browser.open("about:blank");
    browser.open(`${app.url}/`);
    await browser.waitForText(HEADING);
    expect(browser.alerts()).not.toContain(PAGE_FAILED);
    expect(await defaultLists(user.id)).toEqual(lists);
    expect(
      await db
        .select({ listId: schema.listMembers.listId })
        .from(schema.listMembers)
        .where(and(eq(schema.listMembers.userId, user.id), eq(schema.listMembers.role, "owner"))),
    ).toEqual([{ listId: lists[0]!.id }]);
  });
});
