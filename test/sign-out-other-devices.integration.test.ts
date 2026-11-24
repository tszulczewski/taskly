import { randomBytes } from "node:crypto";
import { schema } from "@taskly/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { useSignedInBrowserSuite } from "./browser-suite";
import { authRequest, clientIps, createUser, SESSION_COOKIE } from "./helpers";

const run = `signoutothers${Date.now()}`;
const HEADER = '[data-slot="app-header"]';
const FAILED = "Could not sign out other devices. Try again.";

// #78 (threat T-06) against the production build, sign-up closed: Better Auth's
// `POST /api/auth/revoke-other-sessions` behind the header's "Sign out of other devices", and the
// session cookie's flags.
describe("signing out of other devices (#78)", () => {
  const { app, browser, db, signIn, newSession } = useSignedInBrowserSuite({
    run,
    port: 3215,
    session: "taskly-sign-out-other-devices",
  });
  const nextIp = clientIps(200);

  /** A signed-in API read: 200 for a live session, 401 for a revoked one. */
  const placesStatus = async (cookie: string) =>
    (await fetch(`${app().url}/api/places`, { headers: { cookie } })).status;
  const revokeOthers = (cookie?: string) =>
    authRequest(app(), "/revoke-other-sessions", { forwardedFor: nextIp(), cookie });
  const tokenOf = (cookie: string) => decodeURIComponent(cookie.split("=")[1]!).split(".")[0]!;
  const sessionTokens = async (userId: string) =>
    (await db.select().from(schema.session).where(eq(schema.session.userId, userId)))
      .map((row) => row.token)
      .sort();

  it("sets the session cookie HttpOnly, Secure and SameSite=Lax", async () => {
    const email = `${run}-flags@example.test`;
    const password = randomBytes(18).toString("base64url");
    await createUser({ name: "Flags", email, password });
    const res = await authRequest(app(), "/sign-in/email", {
      forwardedFor: nextIp(),
      body: { email, password },
    });
    expect(res.status).toBe(200);
    const header = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    expect(header).toBeDefined();
    const attributes = (header ?? "")
      .split(";")
      .slice(1)
      .map((attribute) => attribute.trim().toLowerCase());
    expect(attributes).toEqual(
      expect.arrayContaining(["httponly", "secure", "samesite=lax", "path=/"]),
    );
  });

  it("ends every other session of the user over HTTP, and keeps this one and other users'", async () => {
    const owner = await signIn("owner");
    const laptop = await newSession("owner");
    const phone = await newSession("owner");
    const stranger = await signIn("stranger");
    for (const cookie of [owner.cookie, laptop, phone, stranger.cookie]) {
      expect(await placesStatus(cookie)).toBe(200);
    }

    const res = await revokeOthers(owner.cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: true });

    expect(await placesStatus(laptop)).toBe(401);
    expect(await placesStatus(phone)).toBe(401);
    expect(await placesStatus(owner.cookie)).toBe(200);
    expect(await placesStatus(stranger.cookie)).toBe(200);
    expect(await sessionTokens(owner.id)).toEqual([tokenOf(owner.cookie)]);
    expect(await sessionTokens(stranger.id)).toEqual([tokenOf(stranger.cookie)]);
  });

  // No cross-origin case here: an app started by the test runner inherits Vitest's `TEST=true`,
  // which makes Better Auth skip its origin check (T-05 covers that layer).
  it("refuses without a session and with a signed-out one, ending nothing", async () => {
    const owner = await signIn("refused");
    const other = await newSession("refused");

    expect((await revokeOthers()).status).toBe(401);
    expect(await sessionTokens(owner.id)).toEqual([tokenOf(owner.cookie), tokenOf(other)].sort());

    await authRequest(app(), "/sign-out", { forwardedFor: nextIp(), cookie: other });
    expect((await revokeOthers(other)).status).toBe(401);
    expect(await placesStatus(owner.cookie)).toBe(200);
    expect(await sessionTokens(owner.id)).toEqual([tokenOf(owner.cookie)]);
  });

  // Two devices press it at once. Better Auth lists and deletes without a lock, so each may end
  // the other: the third session always ends, and at most one of the two stays (fails closed).
  it("leaves at most one session when two devices sign out the others at the same time", async () => {
    const first = await signIn("race");
    const second = await newSession("race");
    const third = await newSession("race");

    const answers = await Promise.all([revokeOthers(first.cookie), revokeOthers(second)]);
    for (const answer of answers) expect([200, 401]).toContain(answer.status);

    expect(await placesStatus(third)).toBe(401);
    const alive = await sessionTokens(first.id);
    expect(alive.length).toBeLessThanOrEqual(1);
    for (const token of alive) expect([tokenOf(first.cookie), tokenOf(second)]).toContain(token);
  });

  async function openSignedIn(slug: string) {
    const user = await signIn(slug);
    browser.setSessionCookie(user.cookie, app().url);
    browser.open(`${app().url}/`);
    await browser.waitForHydrated(HEADER);
    return user;
  }

  function chooseOtherDevices() {
    browser.clickRole("button", "Sign out");
    browser.clickRole("menuitem", "Sign out of other devices");
  }

  /** Success shows nothing (design system), so wait for its effect, then for the ready button. */
  async function waitUntilSignedOut(otherDevice: string) {
    await expect.poll(() => placesStatus(otherDevice), { timeout: 15_000 }).toBe(401);
    await browser.waitFor(
      () => browser.buttonEnabled("Sign out"),
      () => "the Sign out button to be ready again",
    );
  }

  it("signs out another device from the header and stays signed in here", async () => {
    const user = await openSignedIn("browser");
    const otherDevice = await newSession("browser");

    chooseOtherDevices();
    await waitUntilSignedOut(otherDevice);
    expect(browser.alerts()).toEqual([]);
    expect(browser.url()).toBe(`${app().url}/`);
    expect(await sessionTokens(user.id)).toEqual([tokenOf(user.cookie)]);

    const cookie = browser.cookies().find((c) => c.name === SESSION_COOKIE);
    expect(cookie && tokenOf(`${cookie.name}=${cookie.value}`)).toBe(tokenOf(user.cookie));
    browser.reload();
    await browser.waitForHydrated(HEADER);
    expect(browser.url()).toBe(`${app().url}/`);
  });

  it("says so when the request fails, ends nothing, and a retry works", async () => {
    const user = await openSignedIn("browser-fail");
    const otherDevice = await newSession("browser-fail");

    browser.abortRequests("**/api/auth/revoke-other-sessions");
    try {
      chooseOtherDevices();
      await browser.waitForText(FAILED);
      expect(browser.alerts()).toContain(FAILED);
      expect(await placesStatus(otherDevice)).toBe(200);
    } finally {
      browser.unroute("**/api/auth/revoke-other-sessions");
    }

    chooseOtherDevices();
    await waitUntilSignedOut(otherDevice);
    expect(browser.alerts()).toEqual([]);
    expect(await sessionTokens(user.id)).toEqual([tokenOf(user.cookie)]);
  });

  // The T-06 case: another device (say, the thief's) signed this one out first, so this request
  // gets 401. Like any 401, the app goes to sign-in instead of offering a retry that cannot work.
  it("goes to /sign-in when this session was already signed out from another device", async () => {
    const user = await openSignedIn("browser-gone");
    const otherDevice = await newSession("browser-gone");
    expect((await revokeOthers(otherDevice)).status).toBe(200);

    chooseOtherDevices();
    await browser.waitForPath("/sign-in");
    expect(browser.alerts()).toEqual([]);
    expect(await placesStatus(otherDevice)).toBe(200);
    expect(await sessionTokens(user.id)).toEqual([tokenOf(otherDevice)]);
  });
});
