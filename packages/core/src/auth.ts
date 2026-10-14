import "server-only";
import { getDb, schema } from "@taskly/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { getEnv } from "./env";

function createAuth() {
  const env = getEnv();
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    // Built-in brute-force protection for sign-in/sign-up (in-memory; enough for a single process).
    rateLimit: { enabled: true, window: 60, max: 30 },
    advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
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
