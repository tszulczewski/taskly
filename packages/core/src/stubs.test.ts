import { describe, expect, it } from "vitest";
import { AI_MODEL, claudeEstimator, estimateTask } from "./ai";
import { NotImplementedError } from "./errors";
import { publishListEvent, subscribeListEvents } from "./events";
import { acceptInvitation, createInvitation, removeMember } from "./invitations";
import { createList, deleteList, ensureShoppingList, listsForUser, renameList } from "./lists";
import {
  addShoppingItem,
  deleteShoppingItem,
  listShoppingItems,
  setShoppingItemChecked,
} from "./shopping";
import { globalSummary, listSummary } from "./summaryService";
import { createTask, deleteTask, listTasks, moveTask, updateTask } from "./tasks";
import type { Db } from "./types";

const db = {} as Db;
const calls: Array<[string, () => Promise<unknown>]> = [
  ["claudeEstimator", () => claudeEstimator("prompt")],
  ["estimateTask", () => estimateTask(db, "u", "t")],
  ["acceptInvitation", () => acceptInvitation(db, { id: "u", email: "e" }, "token")],
  ["createInvitation", () => createInvitation(db, "u", "l", { email: "e", role: "viewer" })],
  ["removeMember", () => removeMember(db, "u", "l", "m")],
  ["createList", () => createList(db, "u", { name: "n" })],
  ["deleteList", () => deleteList(db, "u", "l")],
  ["ensureShoppingList", () => ensureShoppingList(db, "u")],
  ["listsForUser", () => listsForUser(db, "u")],
  ["renameList", () => renameList(db, "u", "l", { name: "n" })],
  ["addShoppingItem", () => addShoppingItem(db, "u", { title: "t" })],
  ["deleteShoppingItem", () => deleteShoppingItem(db, "u", "i")],
  ["listShoppingItems", () => listShoppingItems(db, "u", "l")],
  ["setShoppingItemChecked", () => setShoppingItemChecked(db, "u", "i", true)],
  ["globalSummary", () => globalSummary(db, "u")],
  ["listSummary", () => listSummary(db, "u", "l")],
  ["createTask", () => createTask(db, "u", {})],
  ["deleteTask", () => deleteTask(db, "u", "t")],
  ["listTasks", () => listTasks(db, "u", "l")],
  ["moveTask", () => moveTask(db, "u", "t", { afterId: null, beforeId: null })],
  ["updateTask", () => updateTask(db, "u", "t", {})],
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
