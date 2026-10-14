import { generateKeyBetween } from "fractional-indexing";

/** Key for an item inserted between two neighbours (null = list edge). */
export function positionBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}
