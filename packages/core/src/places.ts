import { schema } from "@taskly/db";
import { and, asc, desc, DrizzleQueryError, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ConflictError, NotFoundError } from "./errors";
import {
  createPlaceInput,
  nextPlaceColor,
  PLACE_LIMIT,
  placeMessages,
  placeNameKey,
  type PlaceView,
  PREDEFINED_PLACES,
  updatePlaceInput,
} from "./place-rules";
import { positionBetween } from "./position";
import type { Db, Tx } from "./types";

const { places, placeOwners } = schema;
const uuid = z.uuid();

/** The columns a `PlaceView` is built from. */
export const placeColumns = { id: places.id, name: places.name, color: places.color };
/** The places' order: fractional keys compare bytewise, whatever the column collation. */
export const placeOrder = [sql`${places.position} COLLATE "C"`, asc(places.id)] as const;

/**
 * A duplicate name (the case-insensitive key, AC5) becomes its 409. The new error carries no pg
 * detail: that holds the row values, and a DrizzleQueryError also holds the params.
 */
function translatePlaceError(error: unknown): unknown {
  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  const constraint =
    typeof cause === "object" && cause !== null && "constraint" in cause ? cause.constraint : null;
  return constraint === "places_user_name_key_uq"
    ? new ConflictError(placeMessages.duplicateName)
    : error;
}

async function translated<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw translatePlaceError(error);
  }
}

/** A malformed id names no place; checked before any query, which would fail with 22P02 (P3). */
function requirePlaceId(placeId: string): void {
  if (!uuid.safeParse(placeId).success) throw new NotFoundError("Place");
}

/**
 * Initializes the user's places once (spec E02, Data Model, F3): the `place_owners` row is the
 * durable "seeded" marker, so an owner who deleted all eight never gets them back (S-1). A
 * concurrent first use waits on the row's PK until this transaction commits, then finds it and
 * seeds nothing. With `lock`, the row is then held `FOR NO KEY UPDATE`: the one lock every
 * place-creating path takes, so creates are serialized per user (the limit, distinct keys).
 */
export async function ensurePlaces(tx: Tx, userId: string, { lock = false } = {}): Promise<void> {
  const created = await tx
    .insert(placeOwners)
    .values({ userId })
    .onConflictDoNothing()
    .returning({ userId: placeOwners.userId });
  if (created.length > 0) {
    let position: string | null = null;
    const rows = PREDEFINED_PLACES.map((name, index) => {
      position = positionBetween(position, null);
      return { userId, name, nameKey: placeNameKey(name), color: nextPlaceColor(index), position };
    });
    await tx.insert(places).values(rows);
  }
  if (lock) {
    await tx
      .select({ userId: placeOwners.userId })
      .from(placeOwners)
      .where(eq(placeOwners.userId, userId))
      .for("no key update");
  }
}

/** The session user's places in their order; the first call creates the eight (#19 AC1). */
export async function listPlaces(db: Db, userId: string): Promise<PlaceView[]> {
  return db.transaction(async (tx) => {
    await ensurePlaces(tx, userId);
    return tx
      .select(placeColumns)
      .from(places)
      .where(eq(places.userId, userId))
      .orderBy(...placeOrder);
  });
}

/**
 * Appends a place after the user's last one, with the next colour (AC8). Under the `place_owners`
 * lock, so two creates racing at 19 end with 20 places and one refusal (AC10, C-1). A create
 * before the first `GET` seeds the eight first and comes ninth (S-2).
 */
export async function createPlace(db: Db, userId: string, input: unknown): Promise<PlaceView> {
  const { name } = createPlaceInput.parse(input);
  return translated(() =>
    db.transaction(async (tx) => {
      await ensurePlaces(tx, userId, { lock: true });
      const existing = await tx
        .select({ position: places.position })
        .from(places)
        .where(eq(places.userId, userId))
        .orderBy(desc(placeOrder[0]));
      if (existing.length >= PLACE_LIMIT) throw new ConflictError(placeMessages.limit);
      const [row] = await tx
        .insert(places)
        .values({
          userId,
          name,
          nameKey: placeNameKey(name),
          color: nextPlaceColor(existing.length),
          position: positionBetween(existing[0]?.position ?? null, null),
        })
        .returning(placeColumns);
      return row!;
    }),
  );
}

/**
 * Renames or recolours one of the user's places. One statement, which locks the row itself
 * (`FOR NO KEY UPDATE`, so ticks holding it `FOR KEY SHARE` are not blocked). No place of this
 * user, or a malformed id → NotFoundError("Place"), with no write and no existence leak. It
 * neither seeds nor takes the owner lock: it cannot pass the limit, and the unique key catches a
 * duplicate name, which becomes 409.
 */
export async function updatePlace(
  db: Db,
  userId: string,
  placeId: string,
  input: unknown,
): Promise<PlaceView> {
  const { name, color } = updatePlaceInput.parse(input);
  requirePlaceId(placeId);
  const changes: Partial<typeof places.$inferInsert> = {};
  if (name !== undefined) Object.assign(changes, { name, nameKey: placeNameKey(name) });
  if (color !== undefined) changes.color = color;
  const [row] = await translated(() =>
    db
      .update(places)
      .set(changes)
      .where(and(eq(places.id, placeId), eq(places.userId, userId)))
      .returning(placeColumns),
  );
  if (!row) throw new NotFoundError("Place");
  return row;
}

/**
 * Deletes one of the user's places; the cascade removes it from every task (AC7). The delete locks
 * the row `FOR UPDATE`, so a tick holding it `FOR KEY SHARE` finishes first, and a later tick finds
 * no place (404). Not the user's place, or a malformed id → NotFoundError("Place").
 */
export async function deletePlace(db: Db, userId: string, placeId: string): Promise<null> {
  requirePlaceId(placeId);
  const [row] = await db
    .delete(places)
    .where(and(eq(places.id, placeId), eq(places.userId, userId)))
    .returning({ id: places.id });
  if (!row) throw new NotFoundError("Place");
  return null;
}
