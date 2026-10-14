import { beforeEach, describe, expect, it, vi } from "vitest";

const betterAuth = vi.fn((config: unknown) => ({
  config,
  api: { getSession: vi.fn() },
}));
const toNextJsHandler = vi.fn(() => ({ GET: "get", POST: "post" }));

vi.mock("better-auth", () => ({ betterAuth }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: vi.fn(() => "adapter") }));
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
  });

  it("creates one lazily configured instance", async () => {
    const { getAuth } = await load();
    expect(betterAuth).not.toHaveBeenCalled();
    const first = getAuth();
    expect(getAuth()).toBe(first);
    expect(betterAuth).toHaveBeenCalledTimes(1);
    const config = betterAuth.mock.calls[0]?.[0] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(config.emailAndPassword).toEqual({ enabled: true, minPasswordLength: 10 });
    expect(config.trustedOrigins).toEqual([env.BETTER_AUTH_URL]);
    expect(config.rateLimit.enabled).toBe(true);
    expect(config.advanced.useSecureCookies).toBe(false);
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
