import "server-only";
import { DrizzleQueryError } from "drizzle-orm";

/**
 * Only identifier-like text is logged: a `code` or class name is data on the error object, and a
 * value that is not a plain identifier could carry anything (a row value, a param).
 */
const SAFE_IDENTIFIER = /^[A-Za-z0-9_]{1,64}$/;

function safeIdentifier(value: unknown): string | null {
  return typeof value === "string" && SAFE_IDENTIFIER.test(value) ? value : null;
}

function codeOf(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("code" in value)) return null;
  return safeIdentifier(value.code);
}

function classOf(error: Error): string {
  // The production server bundle is minified and renames library classes (`class e`), so the
  // class this log line mostly reports is matched by identity, not by `constructor.name`.
  if (error instanceof DrizzleQueryError) return "DrizzleQueryError";
  return safeIdentifier(error.constructor.name) ?? "Error";
}

/**
 * The safe facts about a thrown value for a server log line: its class name and the pg (or Node)
 * error `code`, read from the error or from its `cause` (a `DrizzleQueryError` wraps the pg error).
 * Never the message, params, query or `cause` itself: a `DrizzleQueryError`'s message holds the SQL
 * params, and a pg error's detail holds row values.
 */
export function describeError(error: unknown): string {
  const className = error instanceof Error ? classOf(error) : typeof error;
  const cause = error instanceof Error ? error.cause : undefined;
  const code = codeOf(error) ?? codeOf(cause);
  return code ? `${className} (code ${code})` : className;
}
