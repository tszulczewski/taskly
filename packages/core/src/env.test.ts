import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";
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
