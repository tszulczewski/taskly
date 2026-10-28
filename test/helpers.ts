import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createPasswordUser } from "@taskly/core/server";
import { getDb } from "@taskly/db";
import { vi } from "vitest";

const root = resolve(import.meta.dirname, "..");
const appDir = resolve(root, "packages/app");
const standalone = resolve(appDir, ".next/standalone/packages/app");

/** Default port of the app under test; files that run their own app pass another one. */
export const APP_PORT = 3200;

export type RunningApp = { url: string; stop: () => Promise<void> };

export type StartAppOptions = {
  port?: number;
  /** Extra variables for the server, e.g. `{ ALLOW_SIGN_UP: "true" }`. Sign-up is off unless set. */
  env?: Record<string, string>;
};

/** Starts the production (standalone) build against the test database. Needs `npm run build`. */
export async function startApp(
  databaseUrl: string,
  { port = APP_PORT, env = {} }: StartAppOptions = {},
): Promise<RunningApp> {
  const server = resolve(standalone, "server.js");
  if (!existsSync(server))
    throw new Error("Standalone build not found. Run `npm run build` first.");
  const url = `http://127.0.0.1:${port}`;
  // A server left over from another run would answer instead of this build.
  if (await isListening(url)) throw new Error(`Port ${port} is already in use.`);
  cpSync(resolve(appDir, "public"), resolve(standalone, "public"), { recursive: true });
  cpSync(resolve(appDir, ".next/static"), resolve(standalone, ".next/static"), { recursive: true });

  const child: ChildProcess = spawn("node", [server], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: randomBytes(32).toString("base64"),
      BETTER_AUTH_URL: url,
      ANTHROPIC_API_KEY: "test-key-not-used",
      ALLOW_SIGN_UP: "false",
      ...env,
    },
    stdio: "ignore",
  });
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise((r) => child.once("exit", r));
    child.kill("SIGTERM");
    await exited;
  };

  try {
    await waitForHttp(url);
  } catch (error) {
    await stop();
    throw error;
  }
  return { url, stop };
}

async function isListening(url: string) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

async function waitForHttp(url: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // The prerendered /sign-in shell answers without touching the database.
    if (await isListening(`${url}/sign-in`)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`App did not become ready at ${url}`);
}

let authEnvStubbed = false;

/**
 * Creates an email + password user straight in the database through `createPasswordUser`: works
 * while sign-up is closed and spends no rate-limit attempt. Call `closeUserDb()` in `afterAll`.
 */
export async function createUser(input: { name: string; email: string; password: string }) {
  if (!authEnvStubbed) {
    // Better Auth in the test process only hashes and writes rows; the app has its own secret.
    vi.stubEnv("BETTER_AUTH_SECRET", randomBytes(32).toString("base64"));
    vi.stubEnv("BETTER_AUTH_URL", "http://127.0.0.1");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-not-used");
    authEnvStubbed = true;
  }
  try {
    return await createPasswordUser(input);
  } catch (error) {
    // The raw error (a DrizzleQueryError) carries the SQL params, including the password hash.
    const code = (error as { cause?: { code?: unknown } }).cause?.code;
    throw new Error(
      `createUser failed for ${input.email}${typeof code === "string" ? ` (${code})` : ""}`,
    );
  }
}

/** Closes the pool `createUser` opened and drops its env stubs. */
export async function closeUserDb() {
  if (!authEnvStubbed) return;
  await getDb().$client.end();
  vi.unstubAllEnvs();
  authEnvStubbed = false;
}

/**
 * Unique client addresses for one test file (documentation range 198.51.100.0/24). The app sees
 * every direct request as coming from the trusted 127.0.0.1, so without an `X-Forwarded-For`
 * tail all requests would share one rate-limit bucket; each test sends its own, as Apache would.
 */
export function clientIps(first = 20) {
  let next = first;
  return () => {
    if (next > 254) throw new Error("Out of test client addresses.");
    return `198.51.100.${next++}`;
  };
}

export type AuthRequest = {
  /** The `X-Forwarded-For` value, ending in the client address Apache would append. */
  forwardedFor: string;
  method?: "GET" | "POST";
  /** JSON body of a POST; `{}` when omitted, as `authCall` sends (Better Auth answers 415 without one). */
  body?: unknown;
  /** A `name=value` cookie pair, e.g. from `sessionCookie`. */
  cookie?: string;
};

/** Calls a Better Auth endpoint (`path` below `/api/auth`) with the trusted Origin. */
export function authRequest(
  app: RunningApp,
  path: string,
  { forwardedFor, method = "POST", body = {}, cookie }: AuthRequest,
) {
  const headers: Record<string, string> = { origin: app.url, "x-forwarded-for": forwardedFor };
  if (cookie) headers.cookie = cookie;
  if (method === "GET") return fetch(`${app.url}/api/auth${path}`, { headers });
  headers["content-type"] = "application/json";
  return fetch(`${app.url}/api/auth${path}`, { method, headers, body: JSON.stringify(body) });
}

/** Better Auth's session cookie as Next.js runs it in production (`useSecureCookies`). */
export const SESSION_COOKIE = "__Secure-better-auth.session_token";

/** The session cookie a response sets, as a `name=value` pair to forward; undefined if none. */
export function sessionCookie(res: Response) {
  const header = res.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`) && !/max-age=0\b/i.test(c));
  return header?.split(";")[0];
}

/** Whether a response sets or clears the session cookie at all. */
export function touchesSessionCookie(res: Response) {
  return res.headers.getSetCookie().some((c) => c.startsWith(`${SESSION_COOKIE}=`));
}

/** Thin wrapper around the agent-browser CLI, used as the browser testing framework. */
export function createBrowser(session: string) {
  const bin = resolve(root, "node_modules/.bin/agent-browser");
  const run = (...args: string[]) =>
    execFileSync(bin, ["--session", session, ...args], {
      encoding: "utf8",
      timeout: 60_000,
    }).trim();
  return {
    open: (url: string) => run("open", url),
    title: () => run("get", "title"),
    url: () => run("get", "url"),
    text: (selector: string) => run("get", "text", selector),
    snapshot: () => run("snapshot"),
    close: () => run("close"),
  };
}
