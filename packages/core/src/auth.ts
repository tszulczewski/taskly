import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { sharedAuthOptions } from "./auth-options";
import { getEnv } from "./env";
import { signUpBeforeHook } from "./sign-up-hook";

export const SESSION_TTL_S = 30 * 24 * 60 * 60;
export const SESSION_RENEW_AFTER_S = 24 * 60 * 60;

// Better Auth's built-in rule for `/sign-in*` (3 per 10 s, about 18 a minute) overrides the global
// limit; this stricter rule replaces it for password sign-in (T-03).
const SIGN_IN_RATE_LIMIT = { window: 60, max: 5 };

// Next bundles this module once for Route Handlers and once for pages, so each bundle builds its
// own instance; the flag lives on globalThis to warn once per process.
const SIGN_UP_WARNED = Symbol.for("taskly.auth.signUpWarned");
const globalForAuth = globalThis as unknown as Record<symbol, true | undefined>;

function createAuth() {
  const env = getEnv();
  // Options that change how passwords are hashed or where sessions live go into sharedAuthOptions,
  // so the offline reset (maintenance-auth.ts) gets them too.
  const shared = sharedAuthOptions();
  if (env.ALLOW_SIGN_UP && !globalForAuth[SIGN_UP_WARNED]) {
    globalForAuth[SIGN_UP_WARNED] = true;
    console.warn("ALLOW_SIGN_UP is on: anyone who can reach the app can create an account.");
  }
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    // Per client IP and path, in memory (reset on restart; enough for a single process).
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: { "/sign-in/email": SIGN_IN_RATE_LIMIT },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      // Behind Apache on loopback: without the forwarded client IP every request shares one rate-limit bucket.
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"], trustedProxies: ["127.0.0.1", "::1"] },
    },
    ...shared,
    emailAndPassword: { ...shared.emailAndPassword, disableSignUp: !env.ALLOW_SIGN_UP },
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

/**
 * Returns the signed-in user or null. Pass the request headers.
 * `disableRefresh` is for page renders, which cannot write a renewed cookie; API reads keep renewal on.
 */
export async function getSessionUser(headers: Headers, options: { disableRefresh?: boolean } = {}) {
  const session = await getAuth().api.getSession({
    headers,
    ...(options.disableRefresh && { query: { disableRefresh: true } }),
  });
  return session?.user ?? null;
}
