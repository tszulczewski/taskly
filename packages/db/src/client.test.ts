import { afterEach, describe, expect, it, vi } from "vitest";

const poolCtor = vi.fn();
vi.mock("pg", () => ({
  Pool: class {
    constructor(opts: unknown) {
      poolCtor(opts);
    }
  },
}));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn((pool: unknown) => ({ pool })) }));

async function load() {
  vi.resetModules();
  delete (globalThis as { pool?: unknown }).pool;
  return import("./client");
}

describe("getDb", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates one small pool and reuses it", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://x");
    vi.stubEnv("DATABASE_POOL_MAX", "");
    const { getDb } = await load();
    getDb();
    getDb();
    expect(poolCtor).toHaveBeenCalledTimes(1);
    expect(poolCtor).toHaveBeenCalledWith({ connectionString: "postgres://x", max: 5 });
  });

  it("honours DATABASE_POOL_MAX", async () => {
    poolCtor.mockClear();
    vi.stubEnv("DATABASE_URL", "postgres://x");
    vi.stubEnv("DATABASE_POOL_MAX", "2");
    const { getDb } = await load();
    getDb();
    expect(poolCtor).toHaveBeenCalledWith({ connectionString: "postgres://x", max: 2 });
  });
});
