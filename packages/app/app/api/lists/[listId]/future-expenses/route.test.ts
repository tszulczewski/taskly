import { NotFoundError } from "@taskly/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const futureExpensesService = vi.fn();
vi.mock("@taskly/core/server", () => ({ getSessionUser, futureExpensesService }));
const db = { name: "db" };
vi.mock("@taskly/db", () => ({ getDb: () => db }));

const { GET } = await import("./route");

const LIST = "5e4d3c2b-1a09-4f8e-9d7c-6b5a4f3e2d1c";
const ctx = { params: Promise.resolve({ listId: LIST }) };
const get = () => GET(new Request(`http://x/api/lists/${LIST}/future-expenses`), ctx);

beforeEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
  getSessionUser.mockResolvedValue({ id: "u1" });
});

describe("GET /api/lists/[listId]/future-expenses", () => {
  it.each([[{ minGrosze: 150_000, maxGrosze: 270_000 }], [null]])(
    "answers the list's total (%o) in the success envelope",
    async (total) => {
      futureExpensesService.mockResolvedValue({ total });
      const res = await get();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, data: { total } });
      expect(futureExpensesService).toHaveBeenCalledExactlyOnceWith(db, "u1", LIST);
    },
  );

  it("strips fields the response schema does not know", async () => {
    futureExpensesService.mockResolvedValue({ total: null, unestimated: [] });
    expect(await (await get()).json()).toEqual({ ok: true, data: { total: null } });
  });

  it("answers 401 without a session and never calls core", async () => {
    getSessionUser.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(401);
    expect(futureExpensesService).not.toHaveBeenCalled();
  });

  it("answers 404 for a list the user is not a member of", async () => {
    futureExpensesService.mockRejectedValue(new NotFoundError("List"));
    const res = await get();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "not_found", message: "List not found" },
    });
  });

  it("turns a malformed total into the generic 500", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    futureExpensesService.mockResolvedValue({ total: { minGrosze: 2, maxGrosze: 1 } });
    const res = await get();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "internal_error", message: "Something went wrong" },
    });
    expect(error).toHaveBeenCalledExactlyOnceWith(
      `Response failed its output contract: GET /api/lists/${LIST}/future-expenses`,
    );
  });
});
