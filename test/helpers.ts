import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const appDir = resolve(root, "packages/app");
const standalone = resolve(appDir, ".next/standalone/packages/app");

export const APP_PORT = 3200;
export const APP_URL = `http://127.0.0.1:${APP_PORT}`;

export type RunningApp = { url: string; stop: () => Promise<void> };

/** Starts the production (standalone) build against the ephemeral database. Needs `npm run build`. */
export async function startApp(databaseUrl: string): Promise<RunningApp> {
  const server = resolve(standalone, "server.js");
  if (!existsSync(server))
    throw new Error("Standalone build not found. Run `npm run build` first.");
  cpSync(resolve(appDir, "public"), resolve(standalone, "public"), { recursive: true });
  cpSync(resolve(appDir, ".next/static"), resolve(standalone, ".next/static"), { recursive: true });

  const child: ChildProcess = spawn("node", [server], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(APP_PORT),
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: randomBytes(32).toString("base64"),
      BETTER_AUTH_URL: APP_URL,
      ANTHROPIC_API_KEY: "test-key-not-used",
    },
    stdio: "ignore",
  });

  await waitForHttp(APP_URL);
  return {
    url: APP_URL,
    stop: async () => {
      child.kill("SIGTERM");
    },
  };
}

async function waitForHttp(url: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`App did not become ready at ${url}`);
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
