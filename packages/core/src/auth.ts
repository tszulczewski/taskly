import "server-only";
import { getDb, schema } from "@taskly/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    // Sessions are stored in PostgreSQL (session table). Google login comes after the MVP.
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Lazy so that `next build` does not need runtime secrets. */
export function getAuth() {
  return (instance ??= createAuth());
}

export function authRouteHandlers() {
  return toNextJsHandler(getAuth());
}

/** Returns the signed-in user or null. Pass the request headers. */
export async function getSessionUser(headers: Headers) {
  const session = await getAuth().api.getSession({ headers });
  return session?.user ?? null;
}
