import { schema } from "@taskly/db";
import { eq, like } from "drizzle-orm";
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

const run = `authhttp${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";
const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * DAY_MS;
// Server work between "now" in the test and the write in the app; far below the 1-day renewal step.
const CLOCK_SLACK_MS = 5 * 60 * 1000;
// The heading of `/`, the signed-in page.
const HEADING = "My renovation";
// The "page did not open" state, which also shows the heading.
const PAGE_FAILED = "Could not open your tasks.";

function expectAboutThirtyDaysAhead(date: Date) {
  expect(Math.abs(date.getTime() - (Date.now() + SESSION_TTL_MS))).toBeLessThan(CLOCK_SLACK_MS);
}

// Direct HTTP requests against the production build with sign-up closed (the default).
describe("auth over HTTP (sign-up closed)", () => {
  let app: RunningApp;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps();

  /** The session row's token: the signed cookie value is `<token>.<signature>`. */
  const tokenOf = (cookie: string) => decodeURIComponent(cookie.split("=")[1]!).split(".")[0]!;
  const sessionRow = async (token: string) =>
    (await db.select().from(schema.session).where(eq(schema.session.token, token)))[0];
  const setExpiresAt = (token: string, expiresAt: Date) =>
    db.update(schema.session).set({ expiresAt }).where(eq(schema.session.token, token));

  async function signedInCookie(slug: string) {
    await createUser({ name: `User ${slug}`, email: email(slug), password });
    const res = await authRequest(app, "/sign-in/email", {
      forwardedFor: nextIp(),
      body: { email: email(slug), password },
    });
    expect(res.status).toBe(200);
    const cookie = sessionCookie(res);
    expect(cookie).toBeDefined();
    return cookie!;
  }

  const getSession = (cookie?: string) =>
    authRequest(app, "/get-session", { method: "GET", forwardedFor: nextIp(), cookie });

  const wrongSignIn = (forwardedFor: string) =>
    authRequest(app, "/sign-in/email", {
      forwardedFor,
      body: { email: email("nobody"), password: "wrong-password-123" },
    });

  /** A client-side navigation's Flight request (`RSC: 1`), as the App Router sends it. */
  async function flightGet(path: string, cookie: string) {
    const headers = { rsc: "1", cookie };
    const res = await fetch(`${app.url}${path}`, { headers, redirect: "manual" });
    if (res.status !== 307) return res;
    // Next validates the `_rsc` cache-busting search param of Flight requests and redirects to
    // the URL carrying the expected one (validateRSCRequestHeaders, on by default).
    const location = new URL(res.headers.get("location")!, app.url);
    expect(location.searchParams.has("_rsc")).toBe(true);
    expect(touchesSessionCookie(res)).toBe(false);
    return fetch(location, { headers, redirect: "manual" });
  }

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, { port: 3201 });
  });

  afterAll(async () => {
    await app?.stop();
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
    await closeUserDb();
  });

  it("refuses a valid direct sign-up with EMAIL_PASSWORD_SIGN_UP_DISABLED", async () => {
    const res = await authRequest(app, "/sign-up/email", {
      forwardedFor: nextIp(),
      body: { name: "Stranger", email: email("closed"), password },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" });
    expect(sessionCookie(res)).toBeUndefined();
    const users = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, email("closed")));
    expect(users).toHaveLength(0);
  });

  it("rejects a wrong password with 401", async () => {
    await createUser({ name: "Wrong", email: email("wrong"), password });
    const res = await authRequest(app, "/sign-in/email", {
      forwardedFor: nextIp(),
      body: { email: email("wrong"), password: "not-the-password" },
    });
    expect(res.status).toBe(401);
    expect(sessionCookie(res)).toBeUndefined();
  });

  it("answers the 4th rapid wrong sign-in from one client with 429 and X-Retry-After", async () => {
    const ip = nextIp();
    for (let i = 0; i < 3; i++) expect((await wrongSignIn(ip)).status).toBe(401);
    const limited = await wrongSignIn(ip);
    expect(limited.status).toBe(429);
    const retryAfter = Number(limited.headers.get("x-retry-after"));
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(10);
  });

  it("buckets by the address Apache appends, not by a forged prefix", async () => {
    for (let i = 0; i < 3; i++)
      expect((await wrongSignIn("forged-1, 198.51.100.7")).status).toBe(401);
    expect((await wrongSignIn("forged-2, 198.51.100.7")).status).toBe(429);
    expect((await wrongSignIn("forged-1, 198.51.100.8")).status).toBe(401);
  });

  it("sends a visitor without a session from / to /sign-in before the page content", async () => {
    const res = await fetch(`${app.url}/`, { redirect: "manual" });
    // The redirect happens inside <Suspense>, so it streams with 200: assert the payload instead.
    const body = await res.text();
    expect(body).toContain("NEXT_REDIRECT;replace;/sign-in;");
    expect(body).toContain(
      '<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/sign-in"',
    );
    expect(body).not.toContain(HEADING);
  });

  it("gives a new session an expiry about 30 days ahead", async () => {
    const cookie = await signedInCookie("ttl");
    const row = await sessionRow(tokenOf(cookie));
    expectAboutThirtyDaysAhead(row!.expiresAt);
  });

  it("refuses a session cookie after sign-out", async () => {
    const cookie = await signedInCookie("signout");
    expect(await (await getSession(cookie)).json()).toMatchObject({
      user: { email: email("signout") },
    });

    const out = await authRequest(app, "/sign-out", { forwardedFor: nextIp(), cookie });
    expect(out.status).toBe(200);
    expect(await sessionRow(tokenOf(cookie))).toBeUndefined();

    const after = await getSession(cookie);
    expect(after.status).toBe(200);
    expect(await after.json()).toBeNull();
  });

  it("signs out with 200 when the request has no session cookie", async () => {
    const res = await authRequest(app, "/sign-out", { forwardedFor: nextIp() });
    expect(res.status).toBe(200);
  });

  it("signs out with 200 and clears the cookie when the session has expired", async () => {
    const cookie = await signedInCookie("expired");
    await setExpiresAt(tokenOf(cookie), new Date(Date.now() - 60_000));
    const res = await authRequest(app, "/sign-out", { forwardedFor: nextIp(), cookie });
    expect(res.status).toBe(200);
    expect(touchesSessionCookie(res)).toBe(true);
    expect(sessionCookie(res)).toBeUndefined();
  });

  it("renews a session due for renewal only in the API read, never in page renders", async () => {
    const cookie = await signedInCookie("renew");
    const token = tokenOf(cookie);
    // Renewal is due once expiresAt - 30 days + 1 day has passed; 28 days left is 1 day past that.
    const aged = new Date(Date.now() + 28 * DAY_MS);
    await setExpiresAt(token, aged);

    const doc = await fetch(`${app.url}/`, { headers: { cookie }, redirect: "manual" });
    expect(doc.status).toBe(200);
    const html = await doc.text();
    expect(html).toContain(HEADING);
    expect(html).not.toContain(PAGE_FAILED);
    expect(touchesSessionCookie(doc)).toBe(false);
    expect((await sessionRow(token))?.expiresAt).toEqual(aged);

    const flight = await flightGet("/", cookie);
    expect(flight.status).toBe(200);
    expect(flight.headers.get("content-type")).toContain("text/x-component");
    const payload = await flight.text();
    expect(payload).toContain(HEADING);
    expect(payload).not.toContain(PAGE_FAILED);
    expect(touchesSessionCookie(flight)).toBe(false);
    expect((await sessionRow(token))?.expiresAt).toEqual(aged);

    const api = await getSession(cookie);
    expect(api.status).toBe(200);
    const body = (await api.json()) as { session: { expiresAt: string } };
    expectAboutThirtyDaysAhead(new Date(body.session.expiresAt));
    const renewed = sessionCookie(api);
    expect(renewed).toBeDefined();
    expect(tokenOf(renewed!)).toBe(token);
    expect(api.headers.getSetCookie().join("\n")).toMatch(/Max-Age=2592000/i);
    expectAboutThirtyDaysAhead((await sessionRow(token))!.expiresAt);
  });
});
