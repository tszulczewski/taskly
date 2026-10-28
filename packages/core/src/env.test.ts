import { describe, expect, it } from "vitest";
import { afterEach, vi } from "vitest";
import { getEnv, parseEnv } from "./env";
import { formatPln, formatPlnRange } from "./money";

const valid = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  ANTHROPIC_API_KEY: "key",
};

describe("parseEnv", () => {
  it("applies defaults", () => {
    const env = parseEnv(valid);
    expect(env.DATABASE_POOL_MAX).toBe(5);
    expect(env.ANTHROPIC_MODEL).toBe("claude-sonnet-5-5");
    expect(env.ALLOW_SIGN_UP).toBe(false);
  });
  it("parses ALLOW_SIGN_UP as a boolean string", () => {
    expect(parseEnv({ ...valid, ALLOW_SIGN_UP: "true" }).ALLOW_SIGN_UP).toBe(true);
    expect(parseEnv({ ...valid, ALLOW_SIGN_UP: "false" }).ALLOW_SIGN_UP).toBe(false);
  });
  it("rejects an invalid or empty ALLOW_SIGN_UP", () => {
    expect(() => parseEnv({ ...valid, ALLOW_SIGN_UP: "maybe" })).toThrow();
    expect(() => parseEnv({ ...valid, ALLOW_SIGN_UP: "" })).toThrow();
  });
  it("rejects a short auth secret and a missing database url", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow();
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow();
  });
});

describe("money formatting", () => {
  it("formats grosze as PLN", () => {
    expect(formatPln(123456).replace(/\s/g, " ")).toContain("1");
    expect(formatPln(50)).toContain("0,50");
    expect(formatPlnRange(100, 250)).toContain("–");
  });
});

describe("getEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reads process.env once and caches the result", () => {
    for (const [k, v] of Object.entries(valid)) vi.stubEnv(k, v);
    const first = getEnv();
    vi.stubEnv("DATABASE_URL", "postgres://changed");
    expect(getEnv()).toBe(first);
  });
});
