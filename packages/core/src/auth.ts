import "server-only";
import { getDb, schema } from "@taskly/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { getEnv } from "./env";
import { signUpBeforeHook } from "./sign-up-hook";

export const SESSION_TTL_S = 30 * 24 * 60 * 60;
export const SESSION_RENEW_AFTER_S = 24 * 60 * 60;

function createAuth() {
  const env = getEnv();
  if (env.ALLOW_SIGN_UP) {
    console.warn("ALLOW_SIGN_UP is on: anyone who can reach the app can create an account.");
  }
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    // Built-in brute-force protection for sign-in/sign-up (in-memory; enough for a single process).
    rateLimit: { enabled: true, window: 60, max: 30 },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      // Behind Apache on loopback: without the forwarded client IP every request shares one rate-limit bucket.
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"], trustedProxies: ["127.0.0.1", "::1"] },
    },
    // Transactions so password replacement and session revocation commit together (off by default).
    database: drizzleAdapter(getDb(), { provider: "pg", schema, transaction: true }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !env.ALLOW_SIGN_UP,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    session: { expiresIn: SESSION_TTL_S, updateAge: SESSION_RENEW_AFTER_S },
    hooks: { before: signUpBeforeHook },
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
