import { schema } from "@taskly/db";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { ConflictError, NotFoundError } from "./errors";
import { placeMessages } from "./place-rules";
import { createPlace, deletePlace, listPlaces, updatePlace } from "./places";
import type { Db } from "./types";

const userId = "u1";
const placeId = "0b7e3c52-5d1a-4f0e-8c6b-2a9d4e1f3c77";

type Logged = { sql: string; params: unknown[] } | string;

/**
 * A real drizzle `Db` over a fake pg client (lesson 2026-10-29): the SQL text and params are
 * recorded; each query takes the next reply, rows in array mode or a value to throw.
 */
function fakeDb(...replies: unknown[]) {
  const log: Logged[] = [];
  const client = {
    query: vi.fn(async (config: { text: string }, params: unknown[] = []) => {
      if (/^(begin|commit|rollback)$/.test(config.text)) {
        log.push(config.text);
        return { rows: [] };
      }
      log.push({ sql: config.text, params });
      if (replies.length === 0) throw new Error(`unexpected query: ${config.text}`);
      const reply = replies.shift();
      if (!Array.isArray(reply)) throw reply;
      return { rows: reply };
    }),
  };
  const db = drizzle({ client: client as unknown as Pool, schema }) as unknown as Db;
  return { db, log };
}

/** A pg error as node-postgres raises it, with row values in its detail. */
const pgError = (code: string, constraint: string) =>
  Object.assign(new Error(`pg says ${code}`), {
    code,
    constraint,
    detail: "Key (user_id, name_key)=(u1, kuchnia) already exists.",
  });

const claimOwner = {
  sql: 'insert into "place_owners" ("user_id", "created_at") values ($1, default) on conflict do nothing returning "user_id"',
  params: [userId],
};
const lockOwner = {
  sql: 'select "user_id" from "place_owners" where "place_owners"."user_id" = $1 for no key update',
  params: [userId],
};
const seedSql =
  'insert into "places" ("id", "user_id", "name", "name_key", "color", "position", "created_at") values (default, $1, $2, $3, $4, $5, default), (default, $6, $7, $8, $9, $10, default), (default, $11, $12, $13, $14, $15, default), (default, $16, $17, $18, $19, $20, default), (default, $21, $22, $23, $24, $25, default), (default, $26, $27, $28, $29, $30, default), (default, $31, $32, $33, $34, $35, default), (default, $36, $37, $38, $39, $40, default)';
const readPlaces = {
  sql: 'select "id", "name", "color" from "places" where "places"."user_id" = $1 order by "places"."position" COLLATE "C", "places"."id" asc',
  params: [userId],
};
const readPositions = {
  sql: 'select "position" from "places" where "places"."user_id" = $1 order by "places"."position" COLLATE "C" desc',
  params: [userId],
};
const insertPlaceSql =
  'insert into "places" ("id", "user_id", "name", "name_key", "color", "position", "created_at") values (default, $1, $2, $3, $4, $5, default) returning "id", "name", "color"';

describe("listPlaces", () => {
  it("seeds the eight with colours 1–8 in order on the first call, in one transaction", async () => {
    const { db, log } = fakeDb([[userId]], [], [[placeId, "Salon", 1]]);
    expect(await listPlaces(db, userId)).toEqual([{ id: placeId, name: "Salon", color: 1 }]);
    expect(log).toEqual([
      "begin",
      claimOwner,
      { sql: seedSql, params: expect.any(Array) },
      readPlaces,
      "commit",
    ]);
    const params = (log[2] as { params: unknown[] }).params;
    const rows = Array.from({ length: 8 }, (_, i) => params.slice(i * 5, i * 5 + 5));
    expect(rows.map(([user, name, key, color]) => [user, name, key, color])).toEqual([
      [userId, "Salon", "salon", 1],
      [userId, "Sypialnia", "sypialnia", 2],
      [userId, "Łazienka", "łazienka", 3],
      [userId, "Kuchnia", "kuchnia", 4],
      [userId, "Garaż", "garaż", 5],
      [userId, "Ogródek", "ogródek", 6],
      [userId, "Strych", "strych", 7],
      [userId, "Biuro", "biuro", 8],
    ]);
    const positions = rows.map((row) => row[4] as string);
    expect([...positions].sort()).toEqual(positions);
    expect(new Set(positions).size).toBe(8);
  });

  it("seeds nothing and takes no owner lock once the owner row exists (S-1)", async () => {
    const { db, log } = fakeDb([], []);
    expect(await listPlaces(db, userId)).toEqual([]);
    expect(log).toEqual(["begin", claimOwner, readPlaces, "commit"]);
  });
});

describe("createPlace", () => {
  it("locks the owner row, then appends after the last place with the next colour", async () => {
    const created = [placeId, "Jadalnia", 9];
    const { db, log } = fakeDb(
      [],
      [],
      [["a7"], ["a6"], ["a5"], ["a4"], ["a3"], ["a2"], ["a1"], ["a0"]],
      [created],
    );
    expect(await createPlace(db, userId, { name: "  Jadalnia " })).toEqual({
      id: placeId,
      name: "Jadalnia",
      color: 9,
    });
    expect(log).toEqual([
      "begin",
      claimOwner,
      lockOwner,
      readPositions,
      { sql: insertPlaceSql, params: [userId, "Jadalnia", "jadalnia", 9, "a8"] },
      "commit",
    ]);
  });

  it("seeds first when the user never loaded places, then comes ninth (S-2)", async () => {
    const { db, log } = fakeDb([[userId]], [], [], [["a7"]], [[placeId, "Jadalnia", 9]]);
    await createPlace(db, userId, { name: "Jadalnia" });
    expect(log.slice(0, 4)).toEqual([
      "begin",
      claimOwner,
      { sql: seedSql, params: expect.any(Array) },
      lockOwner,
    ]);
  });

  it("gives the first place of a user with none colour 1 and the first key", async () => {
    const { db, log } = fakeDb([], [], [], [[placeId, "Hall", 1]]);
    await createPlace(db, userId, { name: "Hall" });
    expect(log[4]).toEqual({ sql: insertPlaceSql, params: [userId, "Hall", "hall", 1, "a0"] });
  });

  it("refuses the 21st place with the limit message and writes nothing (AC10)", async () => {
    const twenty = Array.from({ length: 20 }, (_, i) => [`a${i}`]);
    const { db, log } = fakeDb([], [], twenty);
    await expect(createPlace(db, userId, { name: "Hall" })).rejects.toEqual(
      new ConflictError(placeMessages.limit),
    );
    expect(log.at(-1)).toBe("rollback");
  });

  it("turns a duplicate name into its 409 without the pg detail (AC5)", async () => {
    const { db } = fakeDb([], [], [], pgError("23505", "places_user_name_key_uq"));
    const error = await createPlace(db, userId, { name: "kuchnia" }).catch((e: unknown) => e);
    expect(error).toEqual(new ConflictError(placeMessages.duplicateName));
    expect(JSON.stringify(error)).not.toContain("kuchnia");
  });

  it("passes any other database error through", async () => {
    const failure = pgError("23505", "places_user_position_uq");
    const { db } = fakeDb([], [], [], failure);
    await expect(createPlace(db, userId, { name: "Hall" })).rejects.toMatchObject({
      cause: failure,
    });
    const { db: other } = fakeDb(new Error("connection lost"));
    await expect(createPlace(other, userId, { name: "Hall" })).rejects.toThrow("Failed query");
  });

  it("validates the input before any query", async () => {
    const { db, log } = fakeDb();
    await expect(createPlace(db, userId, { name: " " })).rejects.toBeInstanceOf(ZodError);
    await expect(createPlace(db, userId, { name: "Hall", color: 1 })).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(log).toEqual([]);
  });
});

describe("updatePlace", () => {
  const updateSql = (set: string) =>
    `update "places" set ${set} where ("places"."id" = $X and "places"."user_id" = $Y) returning "id", "name", "color"`;

  it("renames with the new key, only the user's place, in one statement", async () => {
    const { db, log } = fakeDb([[placeId, "Spiżarnia", 4]]);
    expect(await updatePlace(db, userId, placeId, { name: " Spiżarnia " })).toEqual({
      id: placeId,
      name: "Spiżarnia",
      color: 4,
    });
    expect(log).toEqual([
      {
        sql: updateSql('"name" = $1, "name_key" = $2').replace("$X", "$3").replace("$Y", "$4"),
        params: ["Spiżarnia", "spiżarnia", placeId, userId],
      },
    ]);
  });

  it("recolours alone, or renames and recolours together", async () => {
    const { db, log } = fakeDb([[placeId, "Salon", 10]], [[placeId, "Hall", 2]]);
    await updatePlace(db, userId, placeId, { color: 10 });
    await updatePlace(db, userId, placeId, { name: "Hall", color: 2 });
    expect(log).toEqual([
      {
        sql: updateSql('"color" = $1').replace("$X", "$2").replace("$Y", "$3"),
        params: [10, placeId, userId],
      },
      {
        sql: updateSql('"name" = $1, "name_key" = $2, "color" = $3')
          .replace("$X", "$4")
          .replace("$Y", "$5"),
        params: ["Hall", "hall", 2, placeId, userId],
      },
    ]);
  });

  it("answers 404 for no place of this user (another user's, deleted, never seeded)", async () => {
    const { db } = fakeDb([]);
    await expect(updatePlace(db, userId, placeId, { color: 1 })).rejects.toEqual(
      new NotFoundError("Place"),
    );
  });

  it("answers 404 for a malformed id before any query (P3)", async () => {
    const { db, log } = fakeDb();
    await expect(updatePlace(db, userId, "not-a-uuid", { color: 1 })).rejects.toEqual(
      new NotFoundError("Place"),
    );
    expect(log).toEqual([]);
  });

  it("turns a duplicate name into its 409 (AC5)", async () => {
    const { db } = fakeDb(pgError("23505", "places_user_name_key_uq"));
    await expect(updatePlace(db, userId, placeId, { name: "Łazienka" })).rejects.toEqual(
      new ConflictError(placeMessages.duplicateName),
    );
  });

  it("validates the input", async () => {
    const { db } = fakeDb();
    await expect(updatePlace(db, userId, placeId, {})).rejects.toBeInstanceOf(ZodError);
    await expect(updatePlace(db, userId, placeId, { color: 11 })).rejects.toBeInstanceOf(ZodError);
  });
});

describe("deletePlace", () => {
  const deleteSql = {
    sql: 'delete from "places" where ("places"."id" = $1 and "places"."user_id" = $2) returning "id"',
    params: [placeId, userId],
  };

  it("deletes only the user's place and answers null", async () => {
    const { db, log } = fakeDb([[placeId]]);
    expect(await deletePlace(db, userId, placeId)).toBeNull();
    expect(log).toEqual([deleteSql]);
  });

  it("answers 404 when it is not the user's place", async () => {
    const { db } = fakeDb([]);
    await expect(deletePlace(db, userId, placeId)).rejects.toEqual(new NotFoundError("Place"));
  });

  it("answers 404 for a malformed id before any query (P3)", async () => {
    const { db, log } = fakeDb();
    await expect(deletePlace(db, userId, "x")).rejects.toEqual(new NotFoundError("Place"));
    expect(log).toEqual([]);
  });
});
