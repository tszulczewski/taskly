import { ConflictError, createPlaceInput, placeMessages, type PlaceView } from "@taskly/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const listPlaces = vi.fn();
const createPlace = vi.fn();
vi.mock("@taskly/core/server", () => ({ getSessionUser, listPlaces, createPlace }));
const db = { name: "db" };
vi.mock("@taskly/db", () => ({ getDb: () => db }));

const { GET, POST } = await import("./route");

const URL_ = "http://x/api/places";
const CSRF = { "x-requested-with": "taskly" };
const ctx = { params: Promise.resolve({}) };
const salon: PlaceView = { id: "6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f", name: "Salon", color: 1 };

const post = (body: string, headers: Record<string, string> = CSRF) =>
  POST(new Request(URL_, { method: "POST", headers, body }), ctx);

beforeEach(() => {
  vi.resetAllMocks();
  getSessionUser.mockResolvedValue({ id: "u1" });
});

describe("GET /api/places", () => {
  it("returns the session user's places", async () => {
    listPlaces.mockResolvedValue([salon]);
    const res = await GET(new Request(URL_), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: [salon] });
    expect(listPlaces).toHaveBeenCalledExactlyOnceWith(db, "u1");
  });

  it("answers 401 without a session and never calls core", async () => {
    getSessionUser.mockResolvedValue(null);
    expect((await GET(new Request(URL_), ctx)).status).toBe(401);
    expect(listPlaces).not.toHaveBeenCalled();
  });

  it("turns a place outside the ten colours into the generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    listPlaces.mockResolvedValue([{ ...salon, color: 11 }]);
    expect((await GET(new Request(URL_), ctx)).status).toBe(500);
  });
});

describe("POST /api/places", () => {
  it("passes the body as sent to core and returns the new place", async () => {
    createPlace.mockResolvedValue({ ...salon, name: "Jadalnia", color: 9 });
    const res = await post(JSON.stringify({ name: "Jadalnia" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { ...salon, name: "Jadalnia", color: 9 } });
    expect(createPlace).toHaveBeenCalledExactlyOnceWith(db, "u1", { name: "Jadalnia" });
  });

  it("rejects a request without the CSRF header before reading the session", async () => {
    expect((await post(JSON.stringify({ name: "Hall" }), {})).status).toBe(403);
    expect(getSessionUser).not.toHaveBeenCalled();
    expect(createPlace).not.toHaveBeenCalled();
  });

  it("answers 400 with the name rule's message", async () => {
    createPlace.mockImplementation(async (_db, _user, input: unknown) => {
      throw createPlaceInput.safeParse(input).error;
    });
    const res = await post(JSON.stringify({ name: " " }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: { code: "validation_error", fieldErrors: { name: [placeMessages.emptyName] } },
    });
  });

  it.each([placeMessages.duplicateName, placeMessages.limit])("answers 409 %s", async (message) => {
    createPlace.mockRejectedValue(new ConflictError(message));
    const res = await post(JSON.stringify({ name: "Hall" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: { code: "conflict", message } });
  });
});
