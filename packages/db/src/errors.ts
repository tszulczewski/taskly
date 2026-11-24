import "server-only";
import { DrizzleQueryError } from "drizzle-orm";

/**
 * Whether a thrown value is the error Drizzle wraps a failed query in. The check lives here so
 * `instanceof` uses the same `drizzle-orm` copy that runs the queries: a caller with its own copy
 * would get `false` for every query error.
 */
export function isDrizzleQueryError(error: unknown): error is DrizzleQueryError {
  return error instanceof DrizzleQueryError;
}
