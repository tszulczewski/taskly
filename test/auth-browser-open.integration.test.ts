import { schema } from "@taskly/db";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

const run = `authbrowseropen${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const password = "correct-horse-battery";
const PLACEHOLDER = "Your tasks will appear here";
const SIGN_OUT_FAILED = "Could not sign out. Try again.";
const HEADER = '[data-slot="app-header"]';

// The browser cannot send `X-Forwarded-For`, so all its auth requests share the trusted-127.0.0.1
// bucket, one per path, of 3 attempts per 10 s for `/sign-in*` and `/sign-up*`. This file submits
// the sign-up form once and the sign-in form twice. Sign-out tests get their session over HTTP
// with their own client address instead, so they spend nothing from the browser's buckets.
describe("auth in the browser (sign-up open)", () => {
  let app: RunningApp;
  const browser = createBrowser("taskly-auth-browser-open");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps();

  const sessionCount = async (address: string) => {
    const [user] = await db.select().from(schema.user).where(eq(schema.user.email, address));
    if (!user) throw new Error(`No user ${address}`);
    return (await db.select().from(schema.session).where(eq(schema.session.userId, user.id)))
      .length;
  };

  /** An existing user, signed in over HTTP, whose session cookie the browser then carries. */
  async function signInBrowserAs(slug: string) {
    await createUser({ name: `User ${slug}`, email: email(slug), password });
    const res = await authRequest(app, "/sign-in/email", {
      forwardedFor: nextIp(),
      body: { email: email(slug), password },
    });
    const cookie = sessionCookie(res);
    if (!cookie) throw new Error(`Sign-in over HTTP failed with ${res.status}`);
    browser.setSessionCookie(cookie, app.url);
  }

  async function fillSignIn(address: string, secret: string) {
    browser.open(`${app.url}/sign-in`);
    await browser.waitForHydrated('input[autocomplete="email"]');
    browser.typeInto('input[autocomplete="email"]', address);
    browser.typeInto('input[autocomplete="current-password"]', secret);
    browser.clickRole("button", "Sign in");
  }

  beforeAll(async () => {
    app = await startApp(process.env.DATABASE_URL as string, {
      port: 3203,
      env: { ALLOW_SIGN_UP: "true" },
    });
  });

  beforeEach(() => {
    browser.open("about:blank");
    browser.clearCookies();
  });

  afterAll(async () => {
    try {
      browser.close();
    } catch {
      // browser was never opened
    }
    await app?.stop();
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
    await closeUserDb();
  });

  it("signs up through the form, lands on /, and signs out to /sign-in", async () => {
    browser.open(`${app.url}/sign-in`);
    await browser.waitForHydrated('a[href="/sign-up"]');
    browser.clickRole("link", "Create an account");
    await browser.waitForPath("/sign-up");
    await browser.waitForHydrated('input[autocomplete="name"]');
    browser.typeInto('input[autocomplete="name"]', "Ada Browser");
    browser.typeInto('input[autocomplete="email"]', email("signup"));
    browser.typeInto('input[autocomplete="new-password"]', password);
    browser.clickRole("button", "Create account");

    await browser.waitForPath("/");
    await browser.waitForText(PLACEHOLDER);
    expect(await sessionCount(email("signup"))).toBe(1);
    await browser.waitForHydrated(HEADER);

    browser.clickRole("button", "Sign out");
    await browser.waitForPath("/sign-in");
    expect(await sessionCount(email("signup"))).toBe(0);

    browser.open(`${app.url}/`);
    await browser.waitForPath("/sign-in");
    await browser.waitForHydrated('input[autocomplete="email"]');
    expect(browser.url()).toBe(`${app.url}/sign-in`);
  });

  it("keeps a failed sign-out on / with a retry message, and a retry signs out", async () => {
    await signInBrowserAs("signout-fail");
    browser.open(`${app.url}/`);
    await browser.waitForText(PLACEHOLDER);
    await browser.waitForHydrated(HEADER);

    browser.abortRequests("**/api/auth/sign-out");
    try {
      browser.clickRole("button", "Sign out");
      await browser.waitForText(SIGN_OUT_FAILED);
      expect(browser.alerts()).toContain(SIGN_OUT_FAILED);
      expect(browser.url()).toBe(`${app.url}/`);
      expect(browser.buttonEnabled("Sign out")).toBe(true);
      expect(await sessionCount(email("signout-fail"))).toBe(1);
    } finally {
      browser.unroute("**/api/auth/sign-out");
    }

    browser.clickRole("button", "Sign out");
    await browser.waitForPath("/sign-in");
    expect(await sessionCount(email("signout-fail"))).toBe(0);
    browser.open(`${app.url}/`);
    await browser.waitForPath("/sign-in");
  });

  it("signs in an existing user through the form and lands on /", async () => {
    await createUser({ name: "Signs In", email: email("signin"), password });
    await fillSignIn(email("signin"), password);
    await browser.waitForPath("/");
    await browser.waitForText(PLACEHOLDER);
    expect(browser.url()).toBe(`${app.url}/`);
  });

  it("shows 'Email or password is incorrect.' for a wrong password and stays on /sign-in", async () => {
    await createUser({ name: "Wrong Password", email: email("wrong"), password });
    await fillSignIn(email("wrong"), "not-the-password");
    await browser.waitForText("Email or password is incorrect.");
    expect(browser.alerts()).toContain("Email or password is incorrect.");
    expect(browser.url()).toBe(`${app.url}/sign-in`);
    expect(await sessionCount(email("wrong"))).toBe(0);
  });
});
