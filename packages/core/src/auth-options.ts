import "server-only";
import { getDb, schema } from "@taskly/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * The Better Auth options that decide how passwords are hashed and checked and where users,
 * accounts and sessions are stored. The app and the offline password reset both build from them,
 * so the reset writes what the app reads. Any option of that kind belongs here, never inline in
 * one instance: `emailAndPassword.password.hash/verify`, `session.storeSessionInDatabase`,
 * `secondaryStorage`, `databaseHooks`, `advanced.database`, model or field names.
 */
export function sharedAuthOptions() {
  return {
    // Transactions so password replacement and session revocation commit together (off by default).
    database: drizzleAdapter(getDb(), { provider: "pg", schema, transaction: true }),
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
  } as const;
}
