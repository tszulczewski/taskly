import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { getAuth } from "@taskly/core/server";
import { schema } from "@taskly/db";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clientIps, closeUserDb, createUser } from "./helpers";

const root = resolve(import.meta.dirname, "..");
const run = `setpwcli${Date.now()}`;
const email = (slug: string) => `${run}-${slug}@example.test`;
const OLD_PASSWORD = "old-password-before-reset";
const NEW_PASSWORD = "new-password-after-reset";
const SUCCESS = "Password updated; all sessions signed out";
const UNSUPPORTED_KEY =
  "Only letters, digits, symbols and Backspace work in the password prompt; arrow, Delete and other editing keys are not supported. Nothing was changed.";
// An open pg pool keeps Node alive for its 10 s idle timeout; a clean exit is far quicker.
const PROMPT_EXIT_MS = 5_000;

/** A command running in a fresh shell, with its combined output and a way to type into it. */
type Session = {
  output: () => string;
  type: (text: string) => void;
  waitFor: (text: string) => Promise<void>;
  exited: Promise<{ code: number | null; at: number }>;
};

/**
 * The reset command as the Runbook (`.ai/docs/runbook.md`) gives it, in `/bin/sh` with a clean environment: no app secret
 * of the test runner, only the temporary env file and the explicit `DATABASE_URL` override.
 * `tty` runs it inside a PTY made by util-linux `script`; otherwise stdin is a pipe.
 */
function startReset(
  envFile: string,
  home: string,
  target: string,
  { tty }: { tty: boolean },
): Session {
  const command = `npm run auth:set-password -- --env-file '${envFile}' '${target}'`;
  const env = {
    PATH: `${dirname(process.execPath)}:/usr/bin:/bin`,
    HOME: home,
    SHELL: "/bin/sh",
    TERM: "dumb",
    DATABASE_URL: process.env.DATABASE_URL,
  };
  const child = tty
    ? spawn("script", ["-qec", command, "/dev/null"], { cwd: root, env })
    : spawn("/bin/sh", ["-c", command], { cwd: root, env });

  let output = "";
  const waiters = new Set<() => void>();
  const collect = (chunk: Buffer) => {
    output += chunk.toString("utf8");
    waiters.forEach((check) => check());
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  const exited = new Promise<{ code: number | null; at: number }>((done) =>
    child.on("exit", (code) => done({ code, at: Date.now() })),
  );

  return {
    output: () => output,
    type: (text) => child.stdin.write(text),
    waitFor: (text) =>
      new Promise<void>((done, fail) => {
        const check = () => {
          if (!output.includes(text)) return;
          waiters.delete(check);
          done();
        };
        waiters.add(check);
        check();
        void exited.then(() => {
          waiters.delete(check);
          if (!output.includes(text)) fail(new Error(`Exited before "${text}":\n${output}`));
        });
      }),
    exited: exited.finally(() => child.stdin.end()),
  };
}

describe("npm run auth:set-password (fresh shell, real PostgreSQL)", () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema });
  const nextIp = clientIps(120);
  let dir: string;
  let envFile: string;

  const signIn = (address: string, password: string) =>
    getAuth().handler(
      new Request("http://127.0.0.1/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1",
          "x-forwarded-for": nextIp(),
        },
        body: JSON.stringify({ email: address, password }),
      }),
    );
  const sessionsOf = (userId: string) =>
    db.select().from(schema.session).where(eq(schema.session.userId, userId));
  const passwordHashOf = async (userId: string) =>
    (await db.select().from(schema.account).where(eq(schema.account.userId, userId)))[0]?.password;

  /** A disposable user with one live session. */
  async function userWithSession(slug: string) {
    const user = await createUser({
      name: `Reset ${slug}`,
      email: email(slug),
      password: OLD_PASSWORD,
    });
    expect((await signIn(user.email, OLD_PASSWORD)).status).toBe(200);
    expect(await sessionsOf(user.id)).toHaveLength(1);
    return user;
  }

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "taskly-reset-"));
    envFile = join(dir, "reset.env");
    // The file's database is unreachable: the reset can only succeed through the exported override.
    writeFileSync(
      envFile,
      [
        "DATABASE_URL=postgres://nobody:nothing@127.0.0.1:1/not-this-database",
        `BETTER_AUTH_SECRET=${randomBytes(32).toString("base64")}`,
        "BETTER_AUTH_URL=http://127.0.0.1",
        "ANTHROPIC_API_KEY=test-key-not-used",
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
    chmodSync(envFile, 0o600);
  });

  afterAll(async () => {
    await db.delete(schema.user).where(like(schema.user.email, `${run}-%`));
    await pool.end();
    await closeUserDb();
    rmSync(dir, { recursive: true, force: true });
  });

  it("resets the password through a terminal, signs out every session and exits promptly", async () => {
    const user = await userWithSession("tty");

    const reset = startReset(envFile, dir, user.email, { tty: true });
    await reset.waitFor("New password: ");
    reset.type(`${NEW_PASSWORD}\r`);
    await reset.waitFor("Repeat the new password: ");
    reset.type(`${NEW_PASSWORD}\r`);
    await reset.waitFor(SUCCESS);
    const successAt = Date.now();
    const { code, at } = await reset.exited;

    expect(code).toBe(0);
    expect(at - successAt).toBeLessThan(PROMPT_EXIT_MS);
    // The PTY echoes in cooked mode, so this also proves the prompt turned echo off.
    expect(reset.output()).not.toContain(NEW_PASSWORD);
    expect(reset.output()).not.toMatch(/failed|error|invalid/i);
    expect(await sessionsOf(user.id)).toHaveLength(0);
    expect((await signIn(user.email, OLD_PASSWORD)).status).toBe(401);
    expect((await signIn(user.email, NEW_PASSWORD)).status).toBe(200);
  });

  it("reports a failed reset without success output", async () => {
    const reset = startReset(envFile, dir, email("never-created"), { tty: true });
    await reset.waitFor("New password: ");
    reset.type(`${NEW_PASSWORD}\r`);
    await reset.waitFor("Repeat the new password: ");
    reset.type(`${NEW_PASSWORD}\r`);
    const { code } = await reset.exited;

    expect(code).toBe(1);
    expect(reset.output()).toContain("No user with that email. Nothing was changed.");
    expect(reset.output()).not.toContain(SUCCESS);
    expect(reset.output()).not.toContain(NEW_PASSWORD);
  });

  it("rejects an arrow key in the password and changes nothing", async () => {
    const user = await userWithSession("arrow");
    const hashBefore = await passwordHashOf(user.id);
    // Left then X: the user believes they typed "…reseXt". The same keys at both prompts would
    // pass the mismatch check, so the repeat prompt gets them too if it ever appears.
    const keys = `${NEW_PASSWORD.slice(0, -1)}\x1b[DX${NEW_PASSWORD.slice(-1)}\r`;

    const reset = startReset(envFile, dir, user.email, { tty: true });
    await reset.waitFor("New password: ");
    reset.type(keys);
    const repeated = reset.waitFor("Repeat the new password: ").then(
      () => reset.type(keys),
      () => {},
    );
    const { code } = await reset.exited;
    await repeated;

    expect(code).toBe(1);
    expect(reset.output()).toContain(UNSUPPORTED_KEY);
    expect(reset.output()).not.toContain("Repeat the new password");
    expect(reset.output()).not.toContain(SUCCESS);
    expect(reset.output()).not.toContain(NEW_PASSWORD.slice(0, -1));
    expect(await passwordHashOf(user.id)).toBe(hashBefore);
    expect(await sessionsOf(user.id)).toHaveLength(1);
    expect((await signIn(user.email, OLD_PASSWORD)).status).toBe(200);
  });

  it("refuses piped input before prompting and changes nothing", async () => {
    const user = await userWithSession("piped");
    const hashBefore = await passwordHashOf(user.id);

    const reset = startReset(envFile, dir, user.email, { tty: false });
    reset.type(`${NEW_PASSWORD}\n${NEW_PASSWORD}\n`);
    const { code } = await reset.exited;

    expect(code).not.toBe(0);
    expect(reset.output()).toContain("Run this in an interactive terminal");
    expect(reset.output()).not.toContain("New password");
    expect(reset.output()).not.toContain(SUCCESS);
    expect(await passwordHashOf(user.id)).toBe(hashBefore);
    expect(await sessionsOf(user.id)).toHaveLength(1);
    expect((await signIn(user.email, OLD_PASSWORD)).status).toBe(200);
  });

  it("fails on a missing env file before prompting and changes nothing", async () => {
    const user = await userWithSession("nofile");
    const hashBefore = await passwordHashOf(user.id);

    const reset = startReset(join(dir, "missing.env"), dir, user.email, { tty: true });
    const { code } = await reset.exited;

    expect(code).not.toBe(0);
    expect(reset.output()).not.toContain("New password");
    expect(reset.output()).not.toContain(SUCCESS);
    expect(await passwordHashOf(user.id)).toBe(hashBefore);
    expect(await sessionsOf(user.id)).toHaveLength(1);
  });
});
