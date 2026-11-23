import { beforeEach, describe, expect, it, vi } from "vitest";

type Config = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const betterAuth = vi.fn((config: Config) => ({ $context: { config } }));
const drizzleAdapter = vi.fn(() => "adapter");

vi.mock("better-auth", () => ({ betterAuth }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter }));
vi.mock("better-auth/next-js", () => ({
  nextCookies: vi.fn(() => "cookies"),
  toNextJsHandler: vi.fn(),
}));
vi.mock("@taskly/db", () => ({ getDb: vi.fn(() => "db"), schema: {} }));

const env = {
  DATABASE_URL: "postgres://u:p@localhost/db",
  BETTER_AUTH_SECRET: "s".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  ANTHROPIC_API_KEY: "key",
};

// App options that the offline reset must not have: they serve requests or need app secrets.
// A new app option goes either into sharedAuthOptions (auth-options.ts) or into this list.
const APP_ONLY = [
  "advanced",
  "baseURL",
  "hooks",
  "plugins",
  "rateLimit",
  "secret",
  "session",
  "trustedOrigins",
];

async function load() {
  vi.resetModules();
  return import("./maintenance-auth");
}

const configOf = (call: number) => betterAuth.mock.calls[call]?.[0] as Config;

// disableSignUp is the one shared setting the two instances set differently.
const withoutSignUp = (value: unknown) => {
  if (typeof value !== "object" || value === null) return value;
  const { disableSignUp: _, ...rest } = value as Config;
  return rest;
};

describe("maintenance auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    betterAuth.mockClear();
    drizzleAdapter.mockClear();
  });

  // Regression (#80): the password reset must start with DATABASE_URL alone.
  it("is created once, lazily, without reading any app setting", async () => {
    for (const key of Object.keys(env)) vi.stubEnv(key, undefined);
    const { getMaintenanceContext } = await load();
    expect(betterAuth).not.toHaveBeenCalled();

    const first = getMaintenanceContext();
    expect(getMaintenanceContext()).toBe(first);
    expect(betterAuth).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ config: configOf(0) });
  });

  // Review M1 on #97: the instance has no rate limit, sign-up hook or lasting secret.
  it("closes sign-up and has nothing that serves requests", async () => {
    const exported = await load();
    // Only the context: no handler or api to mount or call.
    expect(Object.keys(exported)).toEqual(["getMaintenanceContext"]);
    exported.getMaintenanceContext();
    const config = configOf(0);

    expect(Object.keys(config).sort()).toEqual([
      "database",
      "emailAndPassword",
      "logger",
      "secret",
    ]);
    expect(config.emailAndPassword.disableSignUp).toBe(true);
    expect(config.logger).toEqual({ disabled: true });
  });

  // Review M2 on #97: a reset that hashes or stores differently from the app locks the owner out.
  it("uses every shared option exactly as the app does", async () => {
    const { getMaintenanceContext } = await load();
    const { getAuth } = await import("./auth");
    const { sharedAuthOptions } = await import("./auth-options");
    getAuth();
    getMaintenanceContext();
    const [app, maintenance] = [configOf(0), configOf(1)];
    const shared = sharedAuthOptions();

    for (const key of Object.keys(shared)) {
      expect(withoutSignUp(maintenance[key]), key).toEqual(withoutSignUp(app[key]));
      expect(withoutSignUp(app[key]), key).toEqual(shared[key as keyof typeof shared]);
    }
    expect(betterAuth).toHaveBeenCalledTimes(2);
    const appOnly = Object.keys(app).filter((key) => !(key in shared));
    expect(appOnly.sort()).toEqual(APP_ONLY);
  });

  it("opens the database the way the app does", async () => {
    const { getMaintenanceContext } = await load();
    const { getAuth } = await import("./auth");
    getAuth();
    getMaintenanceContext();

    expect(drizzleAdapter).toHaveBeenCalledTimes(2);
    expect(drizzleAdapter.mock.calls[1]).toEqual(drizzleAdapter.mock.calls[0]);
  });

  it("gets a fresh random secret, never the deployment's", async () => {
    (await load()).getMaintenanceContext();
    (await load()).getMaintenanceContext();
    const [a, b] = betterAuth.mock.calls.map(([config]) => config.secret as string);

    expect(a).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(b).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(a).not.toBe(b);
    expect(a).not.toBe(env.BETTER_AUTH_SECRET);
  });
});
