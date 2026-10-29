import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb } from "@taskly/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "../env";
import { NotFoundError } from "../errors";
import { SET_PASSWORD_NOT_FOUND, setPassword } from "../password-admin";
import { setPasswordInput } from "../schemas";
import { PromptCancelledError, UnsupportedKeyError, readHidden } from "./prompt-hidden";
import {
  EXIT_FAILURE,
  EXIT_OK,
  EXIT_USAGE,
  NOT_INTERACTIVE,
  type SetPasswordDeps,
  SUCCESS_MESSAGE,
  UNSUPPORTED_KEY,
  USAGE,
  nodeDeps,
  runSetPassword,
} from "./set-password";

vi.mock("../password-admin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../password-admin")>()),
  setPassword: vi.fn(),
}));
vi.mock("@taskly/db", () => ({ getDb: vi.fn() }));
vi.mock("./prompt-hidden", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./prompt-hidden")>()),
  readHidden: vi.fn(),
}));
// getEnv caches its first result; validate the current process.env on every call instead.
vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return { ...actual, getEnv: vi.fn(() => actual.parseEnv(process.env)) };
});

const PASSWORD = "correct-horse-battery";
const ARGV = ["--env-file", "/private/taskly-reset.env", "owner@example.test"];

/** Fake deps that record every call in order; the happy path unless overridden. */
function fakeDeps(overrides: Partial<SetPasswordDeps> = {}) {
  const calls: string[] = [];
  const out: string[] = [];
  const err: string[] = [];
  const deps: SetPasswordDeps = {
    loadEnvFile: (path) => void calls.push(`loadEnvFile ${path}`),
    validateEnv: () => void calls.push("validateEnv"),
    isInteractive: () => (calls.push("isInteractive"), true),
    promptHidden: async (question) => (calls.push(`prompt ${question}`), PASSWORD),
    setPassword: async (email) => void calls.push(`setPassword ${email}`),
    closeDb: async () => void calls.push("closeDb"),
    stdout: (line) => (calls.push("stdout"), void out.push(line)),
    stderr: (line) => (calls.push("stderr"), void err.push(line)),
    ...overrides,
  };
  const printed = () => [...out, ...err].join("\n");
  return { deps, calls, out, err, printed };
}

describe("runSetPassword", () => {
  it("loads and validates the configuration, prompts twice, resets, then reports success", async () => {
    const f = fakeDeps();

    expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_OK);
    expect(f.calls).toStrictEqual([
      "isInteractive",
      "loadEnvFile /private/taskly-reset.env",
      "validateEnv",
      "prompt New password: ",
      "prompt Repeat the new password: ",
      "setPassword owner@example.test",
      "stdout",
      "closeDb",
    ]);
    expect(f.out).toStrictEqual([SUCCESS_MESSAGE]);
    expect(f.err).toStrictEqual([]);
  });

  it("accepts --env-file=<path> and the email before the option", async () => {
    const f = fakeDeps();

    expect(await runSetPassword(["owner@example.test", "--env-file=/p.env"], f.deps)).toBe(EXIT_OK);
    expect(f.calls).toContain("loadEnvFile /p.env");
    expect(f.calls).toContain("setPassword owner@example.test");
  });

  it("passes the entered password to setPassword and never prints it", async () => {
    const reset = vi.fn(async () => {});
    const f = fakeDeps({ setPassword: reset });

    await runSetPassword(ARGV, f.deps);
    expect(reset).toHaveBeenCalledWith("owner@example.test", PASSWORD);
    expect(f.printed()).not.toContain(PASSWORD);
  });

  it.each([
    ["no arguments", []],
    ["a missing email", ["--env-file", "/p.env"]],
    ["a missing --env-file", ["owner@example.test"]],
    ["--env-file without a value", ["owner@example.test", "--env-file"]],
    ["an empty --env-file", ["--env-file=", "owner@example.test"]],
    ["two emails", [...ARGV, "other@example.test"]],
    ["an unknown option", [...ARGV, "--password", PASSWORD]],
  ])("prints the usage for %s before touching anything", async (_case, argv) => {
    const f = fakeDeps();

    expect(await runSetPassword(argv, f.deps)).toBe(EXIT_USAGE);
    expect(f.calls).toStrictEqual(["stderr"]);
    expect(f.err).toStrictEqual([USAGE]);
    expect(f.printed()).not.toContain(PASSWORD);
  });

  it("refuses non-interactive stdin before loading, prompting or writing", async () => {
    const f = fakeDeps({ isInteractive: () => false });

    expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_FAILURE);
    expect(f.calls).toStrictEqual(["stderr"]);
    expect(f.err).toStrictEqual([NOT_INTERACTIVE]);
    expect(NOT_INTERACTIVE).toContain("Run this in an interactive terminal");
  });

  it("fails on a missing or unreadable env file before validating or prompting", async () => {
    const f = fakeDeps({
      loadEnvFile: () => {
        throw Object.assign(new Error("EACCES: permission denied, open '/private/x'"), {
          code: "EACCES",
        });
      },
    });

    expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_FAILURE);
    expect(f.calls).toStrictEqual(["isInteractive", "stderr"]);
    expect(f.err).toStrictEqual([
      "Could not read the env file /private/taskly-reset.env. Nothing was changed.",
    ]);
  });

  it("names invalid settings without their values, before prompting or initializing auth", async () => {
    const secret = "too-short-secret-value";
    const f = fakeDeps({
      validateEnv: () => {
        f.calls.push("validateEnv");
        parseEnv({ DATABASE_URL: "postgres://u:dbpass@h/db", BETTER_AUTH_SECRET: secret });
      },
    });

    expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_FAILURE);
    expect(f.calls).toStrictEqual([
      "isInteractive",
      "loadEnvFile /private/taskly-reset.env",
      "validateEnv",
      "stderr",
    ]);
    expect(f.err).toStrictEqual([
      "Invalid configuration in the env file or environment: BETTER_AUTH_SECRET, BETTER_AUTH_URL, ANTHROPIC_API_KEY. Nothing was changed.",
    ]);
    expect(f.printed()).not.toContain(secret);
    expect(f.printed()).not.toContain("dbpass");
  });

  it("reports an unexpected configuration error generically", async () => {
    const f = fakeDeps({
      validateEnv: () => {
        throw new Error("value postgres://u:dbpass@h/db");
      },
    });

    expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_FAILURE);
    expect(f.err).toStrictEqual([
      "Invalid configuration in the env file or environment. Nothing was changed.",
    ]);
  });

  it("aborts on mismatched passwords without resetting", async () => {
    const answers = [PASSWORD, `${PASSWORD}x`];
    const f = fakeDeps({ promptHidden: async () => answers.shift() ?? "" });

    expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_FAILURE);
    expect(f.calls).not.toContain("setPassword owner@example.test");
    expect(f.calls).not.toContain("closeDb");
    expect(f.out).toStrictEqual([]);
    expect(f.err).toStrictEqual(["The passwords do not match. Nothing was changed."]);
    expect(f.printed()).not.toContain(PASSWORD);
  });

  it.each([
    ["is cancelled", new PromptCancelledError()],
    ["closes with an unexpected error", new Error("EIO: i/o error, read")],
  ])("aborts without resetting when the prompt %s", async (_case, error) => {
    const f = fakeDeps({
      promptHidden: async () => {
        throw error;
      },
    });

    expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_FAILURE);
    expect(f.calls).not.toContain("setPassword owner@example.test");
    expect(f.err).toStrictEqual(["Cancelled. Nothing was changed."]);
  });

  it.each([
    ["first", 0],
    ["repeat", 1],
  ])("explains an unsupported key at the %s prompt and never resets", async (_prompt, rejectAt) => {
    let asked = 0;
    const f = fakeDeps({
      promptHidden: async (question) => {
        f.calls.push(`prompt ${question}`);
        if (asked++ === rejectAt) throw new UnsupportedKeyError();
        return PASSWORD;
      },
    });

    expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_FAILURE);
    expect(f.calls.filter((call) => call.startsWith("prompt"))).toHaveLength(rejectAt + 1);
    expect(f.calls).not.toContain("setPassword owner@example.test");
    expect(f.calls).not.toContain("closeDb");
    expect(f.out).toStrictEqual([]);
    expect(f.err).toStrictEqual([UNSUPPORTED_KEY]);
    expect(UNSUPPORTED_KEY).toMatch(/Backspace.*arrow, Delete.*Nothing was changed\.$/);
  });

  it("prints success only once the reset has committed", async () => {
    let commit: (() => void) | undefined;
    const f = fakeDeps({
      setPassword: () => new Promise<void>((resolve) => (commit = resolve)),
    });

    const running = runSetPassword(ARGV, f.deps);
    await vi.waitFor(() => expect(commit).toBeDefined());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(f.out).toStrictEqual([]);

    commit?.();
    expect(await running).toBe(EXIT_OK);
    expect(f.out).toStrictEqual([SUCCESS_MESSAGE]);
  });

  describe("when the reset fails", () => {
    it.each([
      [
        "a rejected password",
        () => setPasswordInput.parse({ email: "owner@example.test", newPassword: "short" }),
        "The password was rejected: Use at least 10 characters. Nothing was changed.",
      ],
      [
        "an unknown email",
        () => {
          throw new NotFoundError(SET_PASSWORD_NOT_FOUND.user);
        },
        "No user with that email. Nothing was changed.",
      ],
      [
        "a user without a password account",
        () => {
          throw new NotFoundError(SET_PASSWORD_NOT_FOUND.credentialAccount);
        },
        "This account has no password sign-in (it uses another sign-in method). Nothing was changed.",
      ],
      [
        "a database error",
        () => {
          throw new Error(`Failed query: update "account" params: $argon$hash,${PASSWORD}`);
        },
        "Password reset failed. Check the database connection and settings, then retry.",
      ],
    ])("reports %s without success output and closes the pool", async (_case, fail, message) => {
      const f = fakeDeps({ setPassword: async () => void fail() });

      expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_FAILURE);
      expect(f.out).toStrictEqual([]);
      expect(f.err).toStrictEqual([message]);
      expect(f.calls.at(-1)).toBe("closeDb");
      expect(f.printed()).not.toContain(PASSWORD);
      expect(f.printed()).not.toContain("hash");
    });
  });

  it("keeps the result when closing the pool fails", async () => {
    const f = fakeDeps({ closeDb: () => Promise.reject(new Error("pool already ended")) });

    expect(await runSetPassword(ARGV, f.deps)).toBe(EXIT_OK);
    expect(f.out).toStrictEqual([SUCCESS_MESSAGE]);
    expect(f.err).toStrictEqual(["Could not close the database connection."]);
  });
});

describe("nodeDeps", () => {
  const APP_KEYS = [
    "DATABASE_URL",
    "DATABASE_POOL_MAX",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_MODEL",
    "ALLOW_SIGN_UP",
  ];
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "taskly-set-password-"));
    for (const key of APP_KEYS) vi.stubEnv(key, undefined);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("lets an exported DATABASE_URL win over the env file", async () => {
    const file = join(dir, "reset.env");
    writeFileSync(
      file,
      [
        "DATABASE_URL=postgres://file@127.0.0.1:5432/taskly",
        `BETTER_AUTH_SECRET=${"s".repeat(40)}`,
        "BETTER_AUTH_URL=http://localhost:3000",
        "ANTHROPIC_API_KEY=key-from-file",
      ].join("\n"),
      { mode: 0o600 },
    );
    vi.stubEnv("DATABASE_URL", "postgres://tunnel@127.0.0.1:5433/taskly");
    let urlAtReset: string | undefined;
    vi.mocked(setPassword).mockImplementation(async () => {
      urlAtReset = process.env.DATABASE_URL;
    });
    vi.mocked(getDb).mockReturnValue({
      $client: { end: async () => {} },
    } as unknown as ReturnType<typeof getDb>);
    const deps = { ...nodeDeps(), isInteractive: () => true, promptHidden: async () => PASSWORD };
    vi.spyOn(process.stdout, "write").mockReturnValue(true);

    expect(await runSetPassword(["--env-file", file, "owner@example.test"], deps)).toBe(EXIT_OK);
    expect(urlAtReset).toBe("postgres://tunnel@127.0.0.1:5433/taskly");
    expect(process.env.BETTER_AUTH_SECRET).toBe("s".repeat(40));
    expect(process.env.ANTHROPIC_API_KEY).toBe("key-from-file");
  });

  it("fails validation before any auth or database call when the file is incomplete", async () => {
    const file = join(dir, "partial.env");
    writeFileSync(file, "DATABASE_URL=postgres://file@127.0.0.1:5432/taskly\n");
    const deps = { ...nodeDeps(), isInteractive: () => true, promptHidden: vi.fn() };
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    expect(await runSetPassword(["--env-file", file, "owner@example.test"], deps)).toBe(
      EXIT_FAILURE,
    );
    expect(stderr).toHaveBeenCalledWith(
      "Invalid configuration in the env file or environment: BETTER_AUTH_SECRET, BETTER_AUTH_URL, ANTHROPIC_API_KEY. Nothing was changed.\n",
    );
    expect(deps.promptHidden).not.toHaveBeenCalled();
    expect(setPassword).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("throws from loadEnvFile when the file is missing", () => {
    expect(() => nodeDeps().loadEnvFile(join(dir, "missing.env"))).toThrow();
  });

  it("detects a terminal on stdin", () => {
    const original = process.stdin.isTTY;
    try {
      process.stdin.isTTY = true;
      expect(nodeDeps().isInteractive()).toBe(true);
      Reflect.deleteProperty(process.stdin, "isTTY");
      expect(nodeDeps().isInteractive()).toBe(false);
    } finally {
      process.stdin.isTTY = original;
    }
  });

  it("prompts on the terminal, asking on stderr", async () => {
    vi.mocked(readHidden).mockResolvedValue(PASSWORD);

    await expect(nodeDeps().promptHidden("New password: ")).resolves.toBe(PASSWORD);
    expect(readHidden).toHaveBeenCalledWith(process.stdin, process.stderr, "New password: ");
  });

  it("resets through setPassword and closes the shared pool", async () => {
    const end = vi.fn(async () => {});
    vi.mocked(getDb).mockReturnValue({ $client: { end } } as unknown as ReturnType<typeof getDb>);
    const deps = nodeDeps();

    expect(deps.setPassword).toBe(setPassword);
    await deps.closeDb();
    expect(end).toHaveBeenCalledOnce();
  });

  it("writes lines to stdout and stderr", () => {
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    nodeDeps().stdout("done");
    nodeDeps().stderr("failed");
    expect(stdout).toHaveBeenCalledWith("done\n");
    expect(stderr).toHaveBeenCalledWith("failed\n");
  });
});
