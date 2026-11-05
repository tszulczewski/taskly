import { describe, expect, it } from "vitest";
import { AI_MODEL, claudeEstimator, estimateTask } from "./ai";
import { NotImplementedError } from "./errors";
import { publishListEvent, subscribeListEvents } from "./events";
import { acceptInvitation, createInvitation, removeMember } from "./invitations";
import { ensureShoppingList } from "./lists";
import {
  addShoppingItem,
  deleteShoppingItem,
  listShoppingItems,
  setShoppingItemChecked,
} from "./shopping";
import { moveTask } from "./tasks";
import type { Db } from "./types";

const db = {} as Db;
const calls: Array<[string, () => Promise<unknown>]> = [
  ["claudeEstimator", () => claudeEstimator("prompt")],
  ["estimateTask", () => estimateTask(db, "u", "t")],
  ["acceptInvitation", () => acceptInvitation(db, { id: "u", email: "e" }, "token")],
  ["createInvitation", () => createInvitation(db, "u", "l", { email: "e", role: "viewer" })],
  ["removeMember", () => removeMember(db, "u", "l", "m")],
  ["ensureShoppingList", () => ensureShoppingList(db, "u")],
  ["addShoppingItem", () => addShoppingItem(db, "u", { title: "t" })],
  ["deleteShoppingItem", () => deleteShoppingItem(db, "u", "i")],
  ["listShoppingItems", () => listShoppingItems(db, "u", "l")],
  ["setShoppingItemChecked", () => setShoppingItemChecked(db, "u", "i", true)],
  ["moveTask", () => moveTask(db, "u", "t", { afterId: null, beforeId: null })],
];

describe("service stubs", () => {
  it.each(calls)("%s is not implemented yet", async (name, call) => {
    await expect(call()).rejects.toBeInstanceOf(NotImplementedError);
    await expect(call()).rejects.toThrow(name);
  });

  it("event bus stubs throw synchronously", () => {
    expect(() => publishListEvent("l", "task")).toThrow(NotImplementedError);
    expect(() => subscribeListEvents(() => {})).toThrow(NotImplementedError);
  });

  it("exposes the default AI model", () => {
    expect(AI_MODEL).toBe("claude-sonnet-5-5");
  });
});
