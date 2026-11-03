export type PlaceColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * The ten place colours, in the order the app hands them out: every new place gets the next one
 * and from the eleventh place they repeat (D26, Luki 3, tokens). The owner can change a colour.
 */
export const placeColors: PlaceColor[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** A room or space a task belongs to, e.g. "Łazienka" (D09, D26). */
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
