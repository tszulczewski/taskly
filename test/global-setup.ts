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
  const url =
    process.env.TEST_DATABASE_URL ??
    (container = await new PostgreSqlContainer("postgres:16-alpine").start()).getConnectionUri();

  const pool = new Pool({ connectionString: url, max: 1 });
  await migrate(drizzle(pool), {
    migrationsFolder: resolve(import.meta.dirname, "../packages/db/migrations"),
  });
  await pool.end();

  process.env.DATABASE_URL = url;
}

export async function teardown() {
  await container?.stop();
}
