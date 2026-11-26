import { createHash } from "node:crypto";
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
import {
  contentSecurityPolicy,
  SHELL_SCRIPT_HASHES,
} from "../packages/app/lib/content-security-policy";
import { securityHeaders } from "../packages/app/lib/security-headers";

const sha256 = (script: string) =>
  `'sha256-${createHash("sha256").update(script).digest("base64")}'`;

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

  it("sends the production CSP and the framing, sniffing and referrer headers (T-07)", async () => {
    const nonces = new Set<string>();
    for (const path of ["/sign-in", "/", "/api/auth/ok", "/no-such-page"]) {
      const res = await fetch(`${app.url}${path}`, { redirect: "manual" });
      const headers = Object.fromEntries(
        securityHeaders().map(({ key }) => [key, res.headers.get(key)]),
      );
      expect(headers, path).toEqual(
        Object.fromEntries(securityHeaders().map(({ key, value }) => [key, value])),
      );
      const policy = res.headers.get("Content-Security-Policy") ?? "";
      const nonce = policy.match(/'nonce-([^']+)'/)?.[1] ?? "";
      expect(policy, path).toBe(contentSecurityPolicy({ dev: false, nonce }));
      nonces.add(nonce);
    }
    expect(nonces.size).toBe(4);
  });

  // Every inline script Next writes must carry the response's nonce or a shell hash, on a
  // prerendered page and on the 404 page alike; one without either would be refused (#101).
  it("allows every inline script on a page by its nonce or a shell hash (T-07, #101)", async () => {
    for (const path of ["/sign-in", "/no-such-page"]) {
      const res = await fetch(`${app.url}${path}`);
      const nonce = res.headers.get("Content-Security-Policy")?.match(/'nonce-([^']+)'/)?.[1];
      const inline = [...(await res.text()).matchAll(/<script(?![^>]*\ssrc=)([^>]*)>([^<]*)/g)].map(
        ([, attributes = "", body = ""]) => ({ attributes, body }),
      );
      expect(inline.length, path).toBeGreaterThan(0);
      const refused = inline.filter(
        ({ attributes, body }) =>
          !attributes.includes(` nonce="${nonce}"`) && !SHELL_SCRIPT_HASHES.includes(sha256(body)),
      );
      expect(
        refused.map(({ body }) => body.slice(0, 40)),
        path,
      ).toEqual([]);
    }
  });

  // Injected markup can no longer run script through an inline `<script>`, a `javascript:` link
  // or a `javascript:` iframe: no `'unsafe-inline'` on `script-src` (#101).
  it("refuses injected inline script and javascript: URLs, and reports them (T-07, #101)", async () => {
    browser.open(`${app.url}/sign-in`);
    expect(browser.cspViolations()).toEqual([]);
    browser.evaluate(
      `(document.body.append(document.createRange().createContextualFragment('<script>window.__injected = "script"<\\/script><a id="injected-link" href="javascript:window.__injected = \\'link\\'">x</a><iframe src="javascript:parent.__injected = \\'iframe\\'"></iframe>')), true)`,
    );
    browser.click("#injected-link");
    let seen: string[] = [];
    await browser.waitFor(
      () => (seen = [...seen, ...browser.cspViolations()]).length >= 3,
      () => `three CSP violations, saw ${JSON.stringify(seen)}`,
    );
    expect(seen).toEqual(Array(3).fill("script-src-elem blocked inline on /sign-in"));
    expect(browser.evaluate<boolean>("window.__injected === undefined")).toBe(true);
  });

  // Also proves the recorder behind `cspViolations()`, which every browser suite checks.
  it("refuses an inline event handler in injected markup, and reports it (T-07)", async () => {
    browser.open(`${app.url}/sign-in`);
    expect(browser.cspViolations()).toEqual([]);
    browser.evaluate(
      `(document.body.insertAdjacentHTML("beforeend", '<img src="/missing.png" onerror="window.__injected = true">'), true)`,
    );
    let seen: string[] = [];
    await browser.waitFor(
      () => (seen = browser.cspViolations()).length > 0,
      () => "a CSP violation for the injected handler",
    );
    expect(seen).toEqual(["script-src-attr blocked inline on /sign-in"]);
    expect(browser.evaluate<boolean>("window.__injected === undefined")).toBe(true);
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
