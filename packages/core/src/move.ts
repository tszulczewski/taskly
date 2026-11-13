import { positionBetween } from "./position";

/** A row of the moved row's sibling group (same list, same parent), the moved row included. */
export interface MoveSibling {
  id: string;
  position: string;
  completed: boolean;
}

/**
 * What a move asks for, checked against the sibling group (spec E02, `PUT …/position`):
 * - `conflict`: the neighbours are not adjacent open siblings (any more), or one is the row;
 * - `stay`: the row already sits between them, so nothing is written;
 * - `move`: the one new key for the row.
 */
export type MoveOutcome =
  { kind: "conflict" } | { kind: "stay" } | { kind: "move"; position: string };

/** Fractional keys compare bytewise, as `COLLATE "C"` does; siblings' keys are unique. */
const byKey = (a: MoveSibling, b: MoveSibling) => (a.position < b.position ? -1 : 1);

/**
 * The new place of row `id` between `afterId` and `beforeId`, its new neighbours among its open
 * siblings (as `moveTarget` gives them; null is an end of the group). Used by `moveTask` on the
 * locked rows and by the app for the row it shows at once. The key is taken between the nearest
 * stored siblings (any status), so it never equals a completed sibling's key, and the open order
 * is exactly the one asked for.
 */
export function movePosition(
  siblings: readonly MoveSibling[],
  id: string,
  afterId: string | null,
  beforeId: string | null,
): MoveOutcome {
  const stored = siblings.filter((row) => row.id !== id).sort(byKey);
  const open = stored.filter((row) => !row.completed);
  const after = afterId === null ? -1 : open.findIndex((row) => row.id === afterId);
  // `beforeId` must be the open sibling right after `afterId` (the first one when it is null).
  if (afterId !== null && after === -1) return { kind: "conflict" };
  if ((open[after + 1]?.id ?? null) !== beforeId) return { kind: "conflict" };

  const row = siblings.find((sibling) => sibling.id === id)!;
  const withRow = [...open, row].sort(byKey);
  const index = withRow.indexOf(row);
  if (
    (withRow[index - 1]?.id ?? null) === afterId &&
    (withRow[index + 1]?.id ?? null) === beforeId
  ) {
    return { kind: "stay" };
  }

  if (afterId !== null) {
    const lower = open[after]!;
    const next = stored[stored.indexOf(lower) + 1];
    return { kind: "move", position: positionBetween(lower.position, next?.position ?? null) };
  }
  const upper = open[0]!;
  const previous = stored[stored.indexOf(upper) - 1];
  return { kind: "move", position: positionBetween(previous?.position ?? null, upper.position) };
}
