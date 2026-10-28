import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const betterAuth = vi.fn((config: unknown) => ({
  config,
  api: { getSession: vi.fn() },
}));
const toNextJsHandler = vi.fn(() => ({ GET: "get", POST: "post" }));

vi.mock("better-auth", () => ({ betterAuth }));
const drizzleAdapter = vi.fn(() => "adapter");

vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter }));
vi.mock("better-auth/next-js", () => ({ nextCookies: vi.fn(() => "cookies"), toNextJsHandler }));
vi.mock("@taskly/db", () => ({ getDb: vi.fn(() => "db"), schema: {} }));

const env = {
  DATABASE_URL: "postgres://u:p@localhost/db",
  BETTER_AUTH_SECRET: "s".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  ANTHROPIC_API_KEY: "key",
};

async function load() {
  vi.resetModules();
  return import("./auth");
}

describe("auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    betterAuth.mockClear();
    drizzleAdapter.mockClear();
  });

  afterEach(() => vi.restoreAllMocks());

  it("creates one lazily configured instance", async () => {
    const { getAuth } = await load();
    expect(betterAuth).not.toHaveBeenCalled();
    const first = getAuth();
    expect(getAuth()).toBe(first);
    expect(betterAuth).toHaveBeenCalledTimes(1);
    const config = betterAuth.mock.calls[0]?.[0] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(config.trustedOrigins).toEqual([env.BETTER_AUTH_URL]);
    expect(config.rateLimit.enabled).toBe(true);
    expect(config.advanced.useSecureCookies).toBe(false);
  });

  it("closes sign-up by default and sets sessions, transactions and client IP", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getAuth, SESSION_TTL_S, SESSION_RENEW_AFTER_S } = await load();
    getAuth();
    const config = betterAuth.mock.calls[0]?.[0] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(config.emailAndPassword).toEqual({
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    });
    expect(SESSION_TTL_S).toBe(30 * 24 * 60 * 60);
    expect(SESSION_RENEW_AFTER_S).toBe(24 * 60 * 60);
    expect(config.session).toEqual({ expiresIn: SESSION_TTL_S, updateAge: SESSION_RENEW_AFTER_S });
    expect(config.advanced.ipAddress).toEqual({
      ipAddressHeaders: ["x-forwarded-for"],
      trustedProxies: ["127.0.0.1", "::1"],
    });
    expect(drizzleAdapter).toHaveBeenCalledWith("db", {
      provider: "pg",
      schema: {},
      transaction: true,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("opens sign-up when ALLOW_SIGN_UP is true and warns once, on first use", async () => {
    vi.stubEnv("ALLOW_SIGN_UP", "true");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getAuth } = await load();
    expect(warn).not.toHaveBeenCalled();
    getAuth();
    getAuth();
    const config = betterAuth.mock.calls[0]?.[0] as {
      emailAndPassword: { disableSignUp: boolean };
    };
    expect(config.emailAndPassword.disableSignUp).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("ALLOW_SIGN_UP");
  });

  it("uses secure cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { getAuth } = await load();
    getAuth();
    const config = betterAuth.mock.calls[0]?.[0] as { advanced: { useSecureCookies: boolean } };
    expect(config.advanced.useSecureCookies).toBe(true);
  });

  it("exposes Next.js route handlers", async () => {
    const { authRouteHandlers } = await load();
    expect(authRouteHandlers()).toEqual({ GET: "get", POST: "post" });
  });

  it("returns the session user or null", async () => {
    const { getAuth, getSessionUser } = await load();
    const getSession = getAuth().api.getSession as unknown as ReturnType<typeof vi.fn>;
    getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    expect(await getSessionUser(new Headers())).toEqual({ id: "u1" });
    getSession.mockResolvedValueOnce(null);
    expect(await getSessionUser(new Headers())).toBeNull();
  });
});
