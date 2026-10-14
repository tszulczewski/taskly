import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { schema } from "@taskly/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBrowser, type RunningApp, startApp } from "./helpers";

const databaseUrl = () => process.env.DATABASE_URL as string;

describe("running app (production build + ephemeral PostgreSQL)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-integration");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });

  beforeAll(async () => {
    app = await startApp(databaseUrl());
  });

  afterAll(async () => {
    try {
      browser.close();
    } catch {
      // browser was never opened
    }
    await app.stop();
    await pool.end();
  });

  describe("home page", () => {
    it("renders in a real browser", () => {
      browser.open(app.url);
      expect(browser.title()).toBe("Taskly");
      expect(browser.url()).toBe(`${app.url}/`);
      expect(browser.snapshot()).toContain("heading");
    });
  });

  describe("auth API", () => {
    const email = `integration-${Date.now()}@example.test`;

    it("reports healthy", async () => {
      const res = await fetch(`${app.url}/api/auth/ok`);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("rejects a too-short password", async () => {
      const res = await fetch(`${app.url}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: app.url },
        body: JSON.stringify({ email, password: "short", name: "Test" }),
      });
      expect(res.status).toBe(400);
    });

    it("signs a user up and stores the session in PostgreSQL", async () => {
      const res = await fetch(`${app.url}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: app.url },
        body: JSON.stringify({ email, password: "correct-horse-battery", name: "Test" }),
      });
      expect(res.status).toBe(200);
      const [user] = await db.select().from(schema.user).where(eq(schema.user.email, email));
      expect(user?.name).toBe("Test");
      const sessions = await db
        .select()
        .from(schema.session)
        .where(eq(schema.session.userId, user!.id));
      expect(sessions).toHaveLength(1);
      await db.delete(schema.user).where(eq(schema.user.id, user!.id));
    });
  });
});
