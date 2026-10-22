export type PlaceColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** The ten place colours, in the order the first places get them (Luki 3, tokens). */
export const placeColors: PlaceColor[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** A room or space a task belongs to, e.g. "Bathroom" (D09). */
export interface Place {
  id: string;
  name: string;
  color: PlaceColor;
}

/** Static class names, so Tailwind finds every one of them. */
export const placeDotClass: Record<PlaceColor, string> = {
  1: "bg-place-1",
  2: "bg-place-2",
  3: "bg-place-3",
  4: "bg-place-4",
  5: "bg-place-5",
  6: "bg-place-6",
  7: "bg-place-7",
  8: "bg-place-8",
  9: "bg-place-9",
  10: "bg-place-10",
};

/** Colours no other place uses; `exceptId` keeps that place's own colour free (editing it). */
export function freePlaceColors(places: Place[], exceptId?: string): PlaceColor[] {
  const used = new Set(places.filter((place) => place.id !== exceptId).map((place) => place.color));
  return placeColors.filter((color) => !used.has(color));
}

/**
 * The first six places get colours 1–6 in turn, without asking (tokens, Luki 3, decision G4);
 * from the seventh the user picks a free colour.
 */
export const placeColorIsAutomatic = (places: Place[]) => places.length < 6;
