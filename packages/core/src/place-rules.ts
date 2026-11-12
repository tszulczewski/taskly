import { z } from "zod";

/** At most this many places per user (D26, #19 AC10); checked under the `place_owners` lock. */
export const PLACE_LIMIT = 20;
/** The design system's ten place colours (`PlaceColor`); new places get them in turn (AC8). */
export const PLACE_COLOR_COUNT = 10;
const PLACE_NAME_MAX = 30;

/** The places' user-facing messages (spec E02, API Contracts; the picker shows them). */
export const placeMessages = {
  emptyName: "Enter a name.",
  longName: `Use at most ${PLACE_NAME_MAX} characters.`,
  duplicateName: "A place with this name already exists.",
  limit: `You can have up to ${PLACE_LIMIT} places. Delete one to add another.`,
} as const;

/**
 * A place's name (G4): trimmed and NFC-normalized, so "Łazienka" typed with a combining accent is
 * the same name, then 1–30 characters. The owner's data, never translated.
 */
export const placeNameSchema = z
  .string()
  .trim()
  .normalize("NFC")
  .min(1, placeMessages.emptyName)
  .max(PLACE_NAME_MAX, placeMessages.longName);

export const placeColorSchema = z.number().int().min(1).max(PLACE_COLOR_COUNT);

export const placeViewSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(PLACE_NAME_MAX),
  color: placeColorSchema,
});
export type PlaceView = z.infer<typeof placeViewSchema>;

/** `GET /api/places`: the user's places in their order. */
export const placeListResponseSchema = z.array(placeViewSchema);

/** `POST /api/places`: only a name; the colour comes from `nextPlaceColor` (D26). */
export const createPlaceInput = z.strictObject({ name: placeNameSchema });

/** `PATCH /api/places/[placeId]`: a new name, a new colour, or both. */
export const updatePlaceInput = z
  .strictObject({ name: placeNameSchema, color: placeColorSchema })
  .partial()
  .refine((fields) => Object.values(fields).some((value) => value !== undefined), {
    message: "Change at least one field.",
  });

/**
 * The key names are unique by, per user: `toLowerCase` folds Polish letters ("Ł" → "ł") in any
 * locale, unlike PostgreSQL's `lower()` under the `C` collation. Takes a name `placeNameSchema`
 * has read (trimmed); normalizes again so the key never depends on the caller.
 */
export function placeNameKey(name: string): string {
  return name.normalize("NFC").toLowerCase();
}

/** The colour of a new place when the user has `count` places: 1–10 in turn (AC8). */
export function nextPlaceColor(count: number): number {
  return (count % PLACE_COLOR_COUNT) + 1;
}

/** Every user's first places, in this order and with colours 1–8 (#19 AC1). */
export const PREDEFINED_PLACES: readonly string[] = [
  "Salon",
  "Sypialnia",
  "Łazienka",
  "Kuchnia",
  "Garaż",
  "Ogródek",
  "Strych",
  "Biuro",
];

/**
 * The name rule as a form checks it before sending: the schema's messages, then a duplicate among
 * `places` ignoring case (the place being renamed, `placeId`, does not count against itself).
 */
export function placeNameError(
  name: string,
  places: readonly { id: string; name: string }[],
  placeId?: string,
): string | undefined {
  const read = placeNameSchema.safeParse(name);
  if (!read.success) return read.error.issues[0]!.message;
  const key = placeNameKey(read.data);
  const taken = places.some((place) => place.id !== placeId && placeNameKey(place.name) === key);
  return taken ? placeMessages.duplicateName : undefined;
}
