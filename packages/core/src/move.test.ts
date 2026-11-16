import { describe, expect, it } from "vitest";
import { type MoveSibling, movePosition } from "./move";

const row = (id: string, position: string, completed = false): MoveSibling => ({
  id,
  position,
  completed,
});

/** The open order after applying `outcome` to row `id`. */
function openOrder(
  siblings: MoveSibling[],
  id: string,
  afterId: string | null,
  beforeId: string | null,
) {
  const outcome = movePosition(siblings, id, afterId, beforeId);
  if (outcome.kind !== "move") return outcome.kind;
  return siblings
    .map((sibling) => (sibling.id === id ? { ...sibling, position: outcome.position } : sibling))
    .filter((sibling) => !sibling.completed)
    .sort((a, b) => (a.position < b.position ? -1 : 1))
    .map((sibling) => sibling.id)
    .join("");
}

describe("movePosition", () => {
  const abcd = [row("A", "a0"), row("B", "a1"), row("C", "a2"), row("D", "a3")];

  it("moves a row to the first, a middle and the last place", () => {
    expect(openOrder(abcd, "C", null, "A")).toBe("CABD");
    expect(openOrder(abcd, "D", "A", "B")).toBe("ADBC");
    expect(openOrder(abcd, "A", "D", null)).toBe("BCDA");
  });

  it("writes nothing when the row already sits between the neighbours (M-2)", () => {
    expect(movePosition(abcd, "B", "A", "C")).toEqual({ kind: "stay" });
    expect(movePosition(abcd, "A", null, "B")).toEqual({ kind: "stay" });
    expect(movePosition(abcd, "D", "C", null)).toEqual({ kind: "stay" });
    // A, C, B: a move of C between A and B already holds.
    const acb = [row("A", "a0"), row("C", "a1"), row("B", "a2")];
    expect(movePosition(acb, "C", "A", "B")).toEqual({ kind: "stay" });
  });

  it("stays for the only open row, with no neighbours asked", () => {
    expect(movePosition([row("A", "a0"), row("X", "a1", true)], "A", null, null)).toEqual({
      kind: "stay",
    });
  });

  it("refuses neighbours that are no longer adjacent (M-1: A, C, D, B)", () => {
    const acdb = [row("A", "a0"), row("C", "a1"), row("D", "a2"), row("B", "a3")];
    expect(movePosition(acdb, "C", "A", "B")).toEqual({ kind: "conflict" });
  });

  it("refuses an unknown, completed or self neighbour, and wrong ends", () => {
    const withDone = [...abcd, row("X", "a4", true)];
    expect(movePosition(withDone, "A", "X", null)).toEqual({ kind: "conflict" });
    expect(movePosition(withDone, "A", "D", "X")).toEqual({ kind: "conflict" });
    expect(movePosition(abcd, "A", "Z", null)).toEqual({ kind: "conflict" });
    expect(movePosition(abcd, "B", "B", "C")).toEqual({ kind: "conflict" });
    expect(movePosition(abcd, "A", null, "C")).toEqual({ kind: "conflict" });
    expect(movePosition(abcd, "A", "C", null)).toEqual({ kind: "conflict" });
    expect(movePosition(abcd, "A", null, null)).toEqual({ kind: "conflict" });
  });

  it("never takes a completed sibling's key and keeps the open order asked for", () => {
    // Stored: A, X (done), Y (done), B, C. Open: A, B, C.
    const mixed = [
      row("A", "a0"),
      row("X", "a1", true),
      row("Y", "a2", true),
      row("B", "a3"),
      row("C", "a4"),
    ];
    const outcome = movePosition(mixed, "C", "A", "B");
    expect(outcome.kind).toBe("move");
    const position = (outcome as { position: string }).position;
    expect(position > "a0" && position < "a1").toBe(true);
    expect(openOrder(mixed, "C", "A", "B")).toBe("ACB");
    // To the front, before a completed sibling stored first.
    const doneFirst = [row("X", "a0", true), row("A", "a1"), row("B", "a2")];
    const front = movePosition(doneFirst, "B", null, "A");
    expect((front as { position: string }).position > "a0").toBe(true);
    expect(openOrder(doneFirst, "B", null, "A")).toBe("BA");
  });
});
