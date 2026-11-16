import { ConflictError, NotFoundError, placeMessages, type PlaceView } from "@taskly/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const updatePlace = vi.fn();
const deletePlace = vi.fn();
vi.mock("@taskly/core/server", () => ({ getSessionUser, updatePlace, deletePlace }));
const db = { name: "db" };
vi.mock("@taskly/db", () => ({ getDb: () => db }));

const { PATCH, DELETE } = await import("./route");

const PLACE = "6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f";
const URL_ = `http://x/api/places/${PLACE}`;
const CSRF = { "x-requested-with": "taskly" };
const ctx = { params: Promise.resolve({ placeId: PLACE }) };
const place: PlaceView = { id: PLACE, name: "Poddasze", color: 7 };

const patch = (body: string, headers: Record<string, string> = CSRF) =>
  PATCH(new Request(URL_, { method: "PATCH", headers, body }), ctx);
const remove = (headers: Record<string, string> = CSRF) =>
  DELETE(new Request(URL_, { method: "DELETE", headers }), ctx);

beforeEach(() => {
  vi.resetAllMocks();
  getSessionUser.mockResolvedValue({ id: "u1" });
});

describe("PATCH /api/places/[placeId]", () => {
  it("passes the id and body to core and returns the place", async () => {
    updatePlace.mockResolvedValue(place);
    const res = await patch(JSON.stringify({ name: "Poddasze" }));
    expect(await res.json()).toEqual({ ok: true, data: place });
    expect(updatePlace).toHaveBeenCalledExactlyOnceWith(db, "u1", PLACE, { name: "Poddasze" });
  });

  it("maps 404 and the duplicate 409 from core", async () => {
    updatePlace.mockRejectedValueOnce(new NotFoundError("Place"));
    expect((await patch(JSON.stringify({ color: 2 }))).status).toBe(404);
    updatePlace.mockRejectedValueOnce(new ConflictError(placeMessages.duplicateName));
    expect(await (await patch(JSON.stringify({ name: "x" }))).json()).toEqual({
      ok: false,
      error: { code: "conflict", message: placeMessages.duplicateName },
    });
  });

  it("answers 400 for a body that is not JSON and 403 without the CSRF header", async () => {
    expect((await patch("name=x")).status).toBe(400);
    expect((await patch("{}", {})).status).toBe(403);
    expect(updatePlace).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/places/[placeId]", () => {
  it("deletes through core and answers null", async () => {
    deletePlace.mockResolvedValue(null);
    const res = await remove();
    expect(await res.json()).toEqual({ ok: true, data: null });
    expect(deletePlace).toHaveBeenCalledExactlyOnceWith(db, "u1", PLACE);
  });

  it("answers 404 from core, 401 without a session, 403 without the CSRF header", async () => {
    deletePlace.mockRejectedValueOnce(new NotFoundError("Place"));
    expect((await remove()).status).toBe(404);
    getSessionUser.mockResolvedValueOnce(null);
    expect((await remove()).status).toBe(401);
    expect((await remove({})).status).toBe(403);
    expect(deletePlace).toHaveBeenCalledTimes(1);
  });
});
