import { randomBytes } from "node:crypto";
import { ensureDefaultList } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach } from "vitest";
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

export type BrowserSuiteOptions = {
  /** Prefix of every user's email in this run; teardown deletes those users. */
  run: string;
  /** Port of this file's own app (files run in parallel). */
  port: number;
  /** agent-browser session name. */
  session: string;
};

export type SignedInUser = { id: string; cookie: string; listId: string };

/**
 * The frame of a browser suite against the production build with sign-up closed: its own app,
 * one browser reset before each test, a small pool, `signIn` over HTTP, and a teardown that
 * deletes the run's users (their places, lists and tasks go with them). Call inside `describe`.
 */
export function useSignedInBrowserSuite({ run, port, session }: BrowserSuiteOptions) {
  const password = randomBytes(18).toString("base64url");
  const email = (slug: string) => `${run}-${slug}@example.test`;
  const browser = createBrowser(session);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(60);
  let running: RunningApp | undefined;

  const app = () => {
    if (!running) throw new Error("The app is not running yet.");
    return running;
  };

  async function signIn(slug: string): Promise<SignedInUser> {
    const user = await createUser({ name: `User ${slug}`, email: email(slug), password });
    const res = await authRequest(app(), "/sign-in/email", {
      forwardedFor: nextIp(),
      body: { email: email(slug), password },
    });
    const cookie = sessionCookie(res);
    if (!cookie) throw new Error(`Sign-in over HTTP failed with ${res.status}`);
    return { id: user.id, cookie, listId: await ensureDefaultList(db, user.id) };
  }

  beforeAll(async () => {
    running = await startApp(process.env.DATABASE_URL as string, {
      port,
      env: { ALLOW_SIGN_UP: "false" },
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
    await running?.stop();
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
    await closeUserDb();
  });

  return { app, browser, pool, db, signIn };
}
