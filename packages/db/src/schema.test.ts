import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as db from "./index";
import * as schema from "./schema";

describe("schema", () => {
  it("defines the expected tables", () => {
    const tables = [
      schema.lists,
      schema.listMembers,
      schema.invitations,
      schema.tasks,
      schema.shoppingItems,
      schema.places,
      schema.taskPlaces,
      schema.placeOwners,
      schema.user,
      schema.session,
      schema.account,
      schema.verification,
    ];
    expect(tables.map(getTableName).sort()).toEqual([
      "account",
      "invitations",
      "list_members",
      "lists",
      "place_owners",
      "places",
      "session",
      "shopping_items",
      "task_places",
      "tasks",
      "user",
      "verification",
    ]);
  });

  it("is exported from the package entry", () => {
    expect(db.schema.lists).toBe(schema.lists);
    expect(db.getDb).toBeTypeOf("function");
  });

  it("resolves every foreign key reference", () => {
    const withKeys = [
      schema.lists,
      schema.listMembers,
      schema.invitations,
      schema.tasks,
      schema.shoppingItems,
      schema.places,
      schema.taskPlaces,
      schema.placeOwners,
      schema.session,
      schema.account,
    ];
    for (const table of withKeys) {
      for (const fk of getTableConfig(table).foreignKeys) {
        expect(fk.reference().foreignTable).toBeDefined();
      }
    }
  });

  it("runs column defaults and relation builders", () => {
    const cfg = getTableConfig(schema.lists);
    const created = cfg.columns.find((c) => c.name === "created_at");
    expect(created?.hasDefault).toBe(true);
    const helpers = { many: () => ({ withFieldName: (n: string) => n }), one: () => ({}) };
    const relations = (
      schema.listsRelations as unknown as {
        config: (h: typeof helpers) => Record<string, unknown>;
      }
    ).config(helpers);
    expect(relations).toEqual({ members: "members", tasks: "tasks" });
  });
});
