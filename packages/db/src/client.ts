import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

// Small pool: the VPS has ~1 GB RAM shared with PostgreSQL.
export function getDb() {
  globalForDb.pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
  });
  return drizzle(globalForDb.pool, { schema });
}
