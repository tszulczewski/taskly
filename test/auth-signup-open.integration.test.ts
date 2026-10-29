import { schema } from "@taskly/db";
import { count, eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authRequest, clientIps, type RunningApp, sessionCookie, startApp } from "./helpers";

const run = `authopen${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";

// Direct requests to Better Auth's sign-up endpoint with sign-up open: the server hook, not the
// form, enforces the name rules.
describe("sign-up open (ALLOW_SIGN_UP=true, HTTP)", () => {
  let app: RunningApp;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps();
  const usersByEmail = (address: string) =>
    db.select().from(schema.user).where(eq(schema.user.email, address));
  const accountCount = async () => (await db.select({ n: count() }).from(schema.account))[0]?.n;
  const signUp = (body: Record<string, unknown>) =>
    authRequest(app, "/sign-up/email", { forwardedFor: nextIp(), body });

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3202,
      env: { ALLOW_SIGN_UP: "true" },
    });
  });

  afterAll(async () => {
    await app?.stop();
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
  });

  it.each([
    { slug: "empty", label: "empty", name: "" },
    { slug: "blank", label: "whitespace-only", name: "   " },
    { slug: "long", label: "101 characters long", name: "a".repeat(101) },
  ])(
    "rejects a name that is $label with INVALID_SIGN_UP_INPUT and saves nothing",
    async ({ slug, name }) => {
      const accountsBefore = await accountCount();
      const res = await signUp({ name, email: email(slug), password });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "INVALID_SIGN_UP_INPUT" });
      expect(sessionCookie(res)).toBeUndefined();
      expect(await usersByEmail(email(slug))).toHaveLength(0);
      expect(await accountCount()).toBe(accountsBefore);
    },
  );

  it("rejects a too-short password and saves nothing", async () => {
    const res = await signUp({ name: "Short", email: email("short"), password: "short" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "INVALID_SIGN_UP_INPUT" });
    expect(await usersByEmail(email("short"))).toHaveLength(0);
  });

  it("stores a padded valid name trimmed and signs the new user in", async () => {
    const res = await signUp({ name: "  Ada Lovelace  ", email: email("padded"), password });
    expect(res.status).toBe(200);
    expect(sessionCookie(res)).toBeDefined();

    const [user] = await usersByEmail(email("padded"));
    expect(user?.name).toBe("Ada Lovelace");
    const accounts = await db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, user!.id));
    expect(accounts).toMatchObject([{ providerId: "credential" }]);
    const sessions = await db
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, user!.id));
    expect(sessions).toHaveLength(1);
  });

  // Pages and the auth Route Handler each get their own copy of the auth module.
  it("logs the ALLOW_SIGN_UP warning once after a page render and an auth API call", async () => {
    const page = await fetch(`${app.url}/`);
    await page.text();
    expect(page.ok).toBe(true);
    const api = await authRequest(app, "/get-session", { forwardedFor: nextIp(), method: "GET" });
    expect(api.status).toBe(200);
    const warnings = app.stderr().split("ALLOW_SIGN_UP is on:").length - 1;
    expect(warnings).toBe(1);
  });
});
