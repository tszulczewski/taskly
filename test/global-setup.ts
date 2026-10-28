import { resolve } from "node:path";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

let container: StartedPostgreSqlContainer | undefined;

/**
 * Starts an ephemeral PostgreSQL (Testcontainers) and applies the repo migrations.
 * Set TEST_DATABASE_URL to reuse an existing database instead (e.g. when Docker is unavailable).
 */
export async function setup() {
  try {
    const url =
      process.env.TEST_DATABASE_URL ??
      (container = await new PostgreSqlContainer("postgres:16-alpine").start()).getConnectionUri();

    const pool = new Pool({ connectionString: url, max: 1 });
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(import.meta.dirname, "../packages/db/migrations"),
    });
    await pool.end();

    process.env.DATABASE_URL = url;
  } catch (error) {
    throw setupError(error);
  }
}

export async function teardown() {
  await container?.stop();
}

/**
 * Vitest 5.0.5 loads this file's code as a Buffer, so formatting the stack of any error with a
 * frame here crashes with `code.charCodeAt is not a function` and hides the cause. Report the
 * cause in the message, with a stack that is already a string, and without `cause` (its stack
 * would crash the same way).
 */
function setupError(error: unknown): Error {
  const causes: string[] = [];
  for (let e: unknown = error; e !== undefined; e = e instanceof Error ? e.cause : undefined) {
    causes.push(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  }
  const cause = causes.join(" <- caused by ");
  const hint = process.env.TEST_DATABASE_URL
    ? ""
    : " (Testcontainers needs a running Docker; without Docker set TEST_DATABASE_URL to an existing database)";
  const wrapped = new Error(`Integration test setup failed: ${cause}${hint}`);
  wrapped.stack = `Error: ${wrapped.message}`;
  return wrapped;
}
