import { DrizzleQueryError } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = { name: "db" };
const ensureDefaultList = vi.fn();
const getDb = vi.fn(() => db);

vi.mock("@taskly/core/server", () => ({ ensureDefaultList }));
vi.mock("@taskly/db", () => ({ getDb }));

const { openDefaultList } = await import("./default-list");

/** The error Next's own `redirect()` / `notFound()` throws. */
function thrownBy(fn: () => never): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  ensureDefaultList.mockReset();
  getDb.mockClear();
});

describe("openDefaultList", () => {
  it("returns the user's default list id", async () => {
    ensureDefaultList.mockResolvedValueOnce("list-1");
    expect(await openDefaultList("u1")).toBe("list-1");
    expect(ensureDefaultList).toHaveBeenCalledWith(db, "u1");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("returns null and logs only the error's class and code when the list cannot be opened", async () => {
    const cause = Object.assign(new Error("connection terminated: Secret title"), {
      code: "57P01",
    });
    const error = new DrizzleQueryError('insert into "lists"', ["Secret title", "u1"], cause);
    ensureDefaultList.mockRejectedValueOnce(error);
    expect(await openDefaultList("u1")).toBeNull();
    expect(consoleError.mock.calls).toEqual([
      ["Could not open the default task list: DrizzleQueryError (code 57P01)"],
    ]);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("Secret title");
  });

  it("returns null when the database client cannot be created", async () => {
    getDb.mockImplementationOnce(() => {
      throw new Error("DATABASE_URL is missing");
    });
    expect(await openDefaultList("u1")).toBeNull();
    expect(ensureDefaultList).not.toHaveBeenCalled();
    expect(consoleError.mock.calls).toEqual([["Could not open the default task list: Error"]]);
  });

  it.each([
    ["redirect()", () => redirect("/sign-in")],
    ["notFound()", () => notFound()],
  ])("rethrows Next's %s error untouched and logs nothing", async (_, next) => {
    const error = thrownBy(next);
    ensureDefaultList.mockRejectedValueOnce(error);
    await expect(openDefaultList("u1")).rejects.toBe(error);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
