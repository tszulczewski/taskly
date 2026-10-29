import "server-only";
import { parseArgs } from "node:util";
import { getDb } from "@taskly/db";
import { ZodError } from "zod";
import { getEnv } from "../env";
import { NotFoundError } from "../errors";
import { SET_PASSWORD_NOT_FOUND, setPassword } from "../password-admin";
import { readHidden } from "./prompt-hidden";

export const SUCCESS_MESSAGE = "Password updated; all sessions signed out";
export const USAGE = "Usage: npm run auth:set-password -- --env-file <private-file> <email>";
export const NOT_INTERACTIVE =
  "Run this in an interactive terminal; the password cannot be piped in.";

export const EXIT_OK = 0;
export const EXIT_FAILURE = 1;
export const EXIT_USAGE = 2;

/** Everything `runSetPassword` touches outside its own logic, injected so tests can fake it. */
export type SetPasswordDeps = {
  /** Adds the file's variables to the environment; variables already set keep their value. */
  loadEnvFile(path: string): void;
  /** Throws when the environment is incomplete or invalid. */
  validateEnv(): void;
  isInteractive(): boolean;
  promptHidden(question: string): Promise<string>;
  setPassword(email: string, password: string): Promise<void>;
  closeDb(): Promise<void>;
  stdout(line: string): void;
  stderr(line: string): void;
};

/**
 * `auth:set-password -- --env-file <file> <email>`: replaces a user's password and signs out all
 * their sessions. Returns the exit code. Configuration is loaded and validated before the prompt
 * and before anything touches auth or the database. Error output never contains the password,
 * a setting's value or a raw database error (its message can carry the SQL parameters).
 */
export async function runSetPassword(argv: string[], deps: SetPasswordDeps): Promise<number> {
  const args = parseArguments(argv);
  if (!args) {
    deps.stderr(USAGE);
    return EXIT_USAGE;
  }
  if (!deps.isInteractive()) {
    deps.stderr(NOT_INTERACTIVE);
    return EXIT_FAILURE;
  }
  try {
    deps.loadEnvFile(args.envFile);
  } catch {
    deps.stderr(`Could not read the env file ${args.envFile}. Nothing was changed.`);
    return EXIT_FAILURE;
  }
  try {
    deps.validateEnv();
  } catch (error) {
    deps.stderr(configurationMessage(error));
    return EXIT_FAILURE;
  }

  let password: string;
  try {
    password = await deps.promptHidden("New password: ");
    const repeated = await deps.promptHidden("Repeat the new password: ");
    if (password !== repeated) {
      deps.stderr("The passwords do not match. Nothing was changed.");
      return EXIT_FAILURE;
    }
  } catch {
    deps.stderr("Cancelled. Nothing was changed.");
    return EXIT_FAILURE;
  }

  try {
    await deps.setPassword(args.email, password);
    deps.stdout(SUCCESS_MESSAGE);
    return EXIT_OK;
  } catch (error) {
    deps.stderr(resetFailureMessage(error));
    return EXIT_FAILURE;
  } finally {
    // An open pool keeps the process alive; a failed close must not turn the result around.
    await deps.closeDb().catch(() => deps.stderr("Could not close the database connection."));
  }
}

function parseArguments(argv: string[]) {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: { "env-file": { type: "string" } },
      allowPositionals: true,
      strict: true,
    });
    const envFile = values["env-file"];
    const [email, ...rest] = positionals;
    if (!envFile || !email || rest.length > 0) return null;
    return { envFile, email };
  } catch {
    return null;
  }
}

/** Names the invalid settings without their values. */
function configurationMessage(error: unknown) {
  const names =
    error instanceof ZodError ? [...new Set(error.issues.map((i) => i.path.join(".")))] : [];
  const detail = names.length > 0 ? `: ${names.join(", ")}` : "";
  return `Invalid configuration in the env file or environment${detail}. Nothing was changed.`;
}

function resetFailureMessage(error: unknown) {
  if (error instanceof ZodError) {
    // Messages come from our password schema (length rules); they never include the input.
    const rules = error.issues.map((i) => i.message).join(" ");
    return `The password was rejected: ${rules} Nothing was changed.`;
  }
  if (error instanceof NotFoundError) {
    return error.resource === SET_PASSWORD_NOT_FOUND.user
      ? "No user with that email. Nothing was changed."
      : "This account has no password sign-in (it uses another sign-in method). Nothing was changed.";
  }
  return "Password reset failed. Check the database connection and settings, then retry.";
}

/** The real terminal, environment, auth and database. */
export function nodeDeps(): SetPasswordDeps {
  return {
    loadEnvFile: (path) => process.loadEnvFile(path),
    validateEnv: () => void getEnv(),
    isInteractive: () => process.stdin.isTTY === true,
    promptHidden: (question) => readHidden(process.stdin, process.stderr, question),
    setPassword,
    closeDb: () => getDb().$client.end(),
    stdout: (line) => void process.stdout.write(`${line}\n`),
    stderr: (line) => void process.stderr.write(`${line}\n`),
  };
}
