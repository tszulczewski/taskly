import { describe, expect, it } from "vitest";
import {
  createPlaceInput,
  nextPlaceColor,
  PLACE_LIMIT,
  placeColorSchema,
  placeMessages,
  placeNameError,
  placeNameKey,
  placeNameSchema,
  placeViewSchema,
  PREDEFINED_PLACES,
  updatePlaceInput,
} from "./place-rules";

// "Ogródek" with "o" + a combining acute (NFD), as some keyboards type it.
const DECOMPOSED = "Ogro\u0301dek";
const COMPOSED = "Ogr\u00f3dek";

describe("placeNameSchema", () => {
  it("trims and normalizes to NFC", () => {
    expect(placeNameSchema.parse("  Salon  ")).toBe("Salon");
    expect(placeNameSchema.parse(DECOMPOSED)).toBe(COMPOSED);
  });

  it("refuses an empty or blank name", () => {
    for (const name of ["", "   "]) {
      expect(placeNameSchema.safeParse(name).error?.issues[0]?.message).toBe(
        placeMessages.emptyName,
      );
    }
  });

  it("allows 30 characters and refuses 31", () => {
    expect(placeNameSchema.parse("a".repeat(30))).toHaveLength(30);
    expect(placeNameSchema.safeParse("a".repeat(31)).error?.issues[0]?.message).toBe(
      placeMessages.longName,
    );
    // Counted after trimming.
    expect(placeNameSchema.parse(` ${"a".repeat(30)} `)).toHaveLength(30);
  });
});

describe("placeNameKey", () => {
  it("ignores case, Polish letters included", () => {
    expect(placeNameKey("Łazienka")).toBe(placeNameKey("łazienka"));
    expect(placeNameKey("ŁAZIENKA")).toBe("łazienka");
  });

  it("gives an NFD name the key of its NFC form", () => {
    expect(placeNameKey(DECOMPOSED)).toBe(placeNameKey(COMPOSED));
    expect(COMPOSED).not.toBe(DECOMPOSED);
  });
});

describe("nextPlaceColor", () => {
  it("hands out the ten colours in turn", () => {
    expect(nextPlaceColor(0)).toBe(1);
    expect(nextPlaceColor(8)).toBe(9);
    expect(nextPlaceColor(9)).toBe(10);
    expect(nextPlaceColor(10)).toBe(1);
    expect(nextPlaceColor(19)).toBe(10);
  });
});

describe("PREDEFINED_PLACES", () => {
  it("are the eight Polish names of #19 AC1, in order", () => {
    expect(PREDEFINED_PLACES).toEqual([
      "Salon",
      "Sypialnia",
      "Łazienka",
      "Kuchnia",
      "Garaż",
      "Ogródek",
      "Strych",
      "Biuro",
    ]);
    expect(PREDEFINED_PLACES.every((name) => placeNameSchema.parse(name) === name)).toBe(true);
    expect(PLACE_LIMIT).toBe(20);
  });
});

describe("request and response schemas", () => {
  it("takes only a name on create", () => {
    expect(createPlaceInput.parse({ name: " Jadalnia " })).toEqual({ name: "Jadalnia" });
    expect(createPlaceInput.safeParse({ name: "Jadalnia", color: 3 }).success).toBe(false);
  });

  it("takes a name, a colour or both on update, and at least one", () => {
    expect(updatePlaceInput.parse({ color: 10 })).toEqual({ color: 10 });
    expect(updatePlaceInput.parse({ name: "Hall", color: 1 })).toEqual({ name: "Hall", color: 1 });
    expect(updatePlaceInput.safeParse({}).success).toBe(false);
    expect(updatePlaceInput.safeParse({ name: undefined }).success).toBe(false);
    expect(updatePlaceInput.safeParse({ color: 11 }).success).toBe(false);
    expect(updatePlaceInput.safeParse({ color: 1, position: "a0" }).success).toBe(false);
  });

  it("checks the colour and the view", () => {
    expect(placeColorSchema.safeParse(0).success).toBe(false);
    expect(placeColorSchema.safeParse(1.5).success).toBe(false);
    const view = { id: "00000000-0000-4000-8000-000000000001", name: "Salon", color: 1 };
    expect(placeViewSchema.parse({ ...view, position: "a0" })).toEqual(view);
  });
});

describe("placeNameError", () => {
  const places = [
    { id: "p1", name: "Łazienka" },
    { id: "p2", name: "Kuchnia" },
  ];

  it("returns the schema's message first", () => {
    expect(placeNameError("  ", places)).toBe(placeMessages.emptyName);
    expect(placeNameError("a".repeat(31), places)).toBe(placeMessages.longName);
  });

  it("refuses a duplicate ignoring case (#19 AC5)", () => {
    expect(placeNameError("łazienka", places)).toBe(placeMessages.duplicateName);
    expect(placeNameError(" KUCHNIA ", places, "p1")).toBe(placeMessages.duplicateName);
  });

  it("lets a place keep its own name in another case", () => {
    expect(placeNameError("kuchnia", places, "p2")).toBeUndefined();
    expect(placeNameError("Jadalnia", places)).toBeUndefined();
  });
});
