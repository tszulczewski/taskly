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

export type RunningApp = {
  url: string;
  stop: () => Promise<void>;
  /** Everything the server has written to stderr so far (`console.warn` and `console.error`). */
  stderr: () => string;
};

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
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr?.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
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
  return { url, stop, stderr: () => stderr };
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

/** A cookie as agent-browser reports it; `expires` is in seconds since the epoch, -1 for a session cookie. */
export type BrowserCookie = { name: string; value: string; expires: number };

/** A request agent-browser has captured. */
export type BrowserRequest = { url: string; method: string };

/** How long the `waitFor*` browser helpers poll before failing. */
const BROWSER_WAIT_MS = 15_000;

/** Thin wrapper around the agent-browser CLI, used as the browser testing framework. */
export function createBrowser(session: string) {
  const bin = resolve(root, "node_modules/.bin/agent-browser");
  const run = (...args: string[]) =>
    execFileSync(bin, ["--session", session, ...args], {
      encoding: "utf8",
      timeout: 60_000,
    }).trim();

  /** Runs a JavaScript expression in the page and returns its (JSON-serializable) value. */
  function evaluate<T>(expression: string): T {
    const out = JSON.parse(run("--json", "eval", expression)) as {
      success: boolean;
      data: { result: T } | null;
      error: string | null;
    };
    if (!out.success || !out.data) throw new Error(`eval failed: ${out.error}`);
    return out.data.result;
  }

  /** Runs a command with `--json` and returns its `data`. */
  function runJson<T>(...args: string[]): T {
    const out = JSON.parse(run("--json", ...args)) as {
      success: boolean;
      data: T | null;
      error: string | null;
    };
    if (!out.success || !out.data) throw new Error(`${args[0]} failed: ${out.error}`);
    return out.data;
  }

  async function waitFor(check: () => boolean, what: () => string, timeoutMs = BROWSER_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        if (check()) return;
      } catch {
        // A check can fail while the page is navigating (its context is gone); poll again.
      }
      if (Date.now() > deadline)
        throw new Error(`Timed out after ${timeoutMs} ms waiting for ${what()}`);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const pathname = () => new URL(run("get", "url")).pathname;
  const hasText = (text: string) =>
    evaluate<boolean>(`document.body.innerText.includes(${JSON.stringify(text)})`);

  return {
    open: (url: string) => run("open", url),
    reload: () => run("reload"),
    title: () => run("get", "title"),
    url: () => run("get", "url"),
    text: (selector: string) => run("get", "text", selector),
    snapshot: () => run("snapshot"),
    evaluate,
    /** Polls `check` until it returns true; `what` describes the awaited state in the timeout error. */
    waitFor,
    /** Focuses the field and types with real key events (setting `value` by script misleads React). */
    typeInto: (selector: string, text: string) => {
      run("focus", selector);
      run("keyboard", "type", text);
    },
    /** Like `typeInto`, but first selects the field's text so the typing replaces it. */
    retypeInto: (selector: string, text: string) => {
      run("focus", selector);
      run("press", "Control+a");
      run("keyboard", "type", text);
    },
    /** Clicks the element with this ARIA role and exact accessible name. */
    clickRole: (role: string, name: string) =>
      run("find", "role", role, "click", "--name", name, "--exact"),
    /** Texts of the `role="alert"` elements on the page. */
    alerts: () =>
      evaluate<string[]>(
        `[...document.querySelectorAll('[role="alert"]')].map((e) => e.textContent.trim())`,
      ),
    /**
     * Whether the button with this exact text can be pressed: neither `disabled` nor busy
     * (`Button` keeps a loading button focusable and marks it `aria-disabled` instead).
     */
    buttonEnabled: (name: string) =>
      evaluate<boolean>(`(() => {
        const b = [...document.querySelectorAll("button")].find((e) => e.textContent.trim() === ${JSON.stringify(name)});
        return !!b && !b.disabled && b.getAttribute("aria-disabled") !== "true";
      })()`),
    /** Waits until the page's pathname is `path` (redirects and client navigations included). */
    waitForPath: (path: string, timeoutMs?: number) =>
      waitFor(
        () => pathname() === path,
        () => `path ${path} (still on ${run("get", "url")})`,
        timeoutMs,
      ),
    /** Number of elements matching a CSS selector. */
    count: (selector: string) =>
      evaluate<number>(`document.querySelectorAll(${JSON.stringify(selector)}).length`),
    /**
     * Waits until React has hydrated the element matching the CSS selector. Text typed into a
     * server-rendered input before that is wiped when React takes over the controlled field, and
     * a click does nothing, so wait for this before interacting with a form or button.
     */
    waitForHydrated: (selector: string, timeoutMs?: number) =>
      waitFor(
        () =>
          evaluate<boolean>(`(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            return !!el && Object.keys(el).some((k) => k.startsWith("__reactProps$"));
          })()`),
        () => `hydrated ${selector} on ${run("get", "url")}`,
        timeoutMs,
      ),
    /** Waits until the page's visible text contains `text`. */
    waitForText: (text: string, timeoutMs?: number) =>
      waitFor(
        () => hasText(text),
        () => `text "${text}" on ${run("get", "url")}`,
        timeoutMs,
      ),
    /** Fails the matching requests at the network level, as a dropped connection would. */
    abortRequests: (pattern: string) => run("network", "route", pattern, "--abort"),
    unroute: (pattern: string) => run("network", "unroute", pattern),
    /** Stores a `name=value` pair (e.g. from `sessionCookie`) as the secure, HttpOnly cookie Better Auth sets. */
    setSessionCookie: (pair: string, url: string) => {
      const at = pair.indexOf("=");
      run(
        "cookies",
        "set",
        pair.slice(0, at),
        pair.slice(at + 1),
        "--url",
        url,
        "--secure",
        "--httpOnly",
        "--sameSite",
        "Lax",
      );
    },
    clearCookies: () => run("cookies", "clear"),
    /** The cookies the current page can see, HttpOnly ones included. */
    cookies: () => runJson<{ cookies: BrowserCookie[] }>("cookies", "get").cookies,
    /** Requests the page has made since the last `clearRequests`, whose URL matches `filter`. */
    requests: (filter: string) =>
      runJson<{ requests: BrowserRequest[] }>("network", "requests", "--filter", filter).requests,
    clearRequests: () => run("network", "requests", "--clear"),
    /**
     * Sends `X-Forwarded-For: <address>` with every request, as Apache would append it, so the
     * page's auth requests use that address's rate-limit bucket instead of the shared 127.0.0.1 one.
     */
    setForwardedFor: (address: string) =>
      run("set", "headers", JSON.stringify({ "X-Forwarded-For": address })),
    clearHeaders: () => run("set", "headers", "{}"),
    close: () => run("close"),
  };
}
