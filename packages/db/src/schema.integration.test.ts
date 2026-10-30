import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "./schema";

class Rollback extends Error {}

const url = process.env.DATABASE_URL;

const violation = (code: string, constraint: string) => ({ cause: { code, constraint } });
const CHECK = "23514";
const FOREIGN_KEY = "23503";
const UNIQUE = "23505";

describe.skipIf(!url)("schema (real PostgreSQL)", () => {
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema });
  afterAll(() => pool.end());

  it("stores lists, members and tasks and cascades deletes", async () => {
    await db
      .transaction(async (tx) => {
        await tx.insert(schema.user).values({ id: "u1", name: "U", email: "u1@example.test" });
        const [list] = await tx.insert(schema.lists).values({ name: "Bathroom" }).returning();
        await tx
          .insert(schema.listMembers)
          .values({ listId: list!.id, userId: "u1", role: "owner" });
        await tx.insert(schema.tasks).values([
          { listId: list!.id, title: "Plastering", position: "a0", costGrosze: 12000 },
          {
            listId: list!.id,
            title: "Painting",
            position: "a1",
            estimateMinGrosze: 5000,
            estimateMaxGrosze: 9000,
          },
        ]);

        const rows = await tx.select().from(schema.tasks).where(eq(schema.tasks.listId, list!.id));
        expect(rows.map((r) => r.title).sort()).toEqual(["Painting", "Plastering"]);

        await tx.delete(schema.lists).where(eq(schema.lists.id, list!.id));
        expect(
          await tx.select().from(schema.tasks).where(eq(schema.tasks.listId, list!.id)),
        ).toEqual([]);
        throw new Rollback();
      })
      .catch((e) => {
        if (!(e instanceof Rollback)) throw e;
      });
  });

  it("rejects a duplicate membership", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(schema.user).values({ id: "u2", name: "U", email: "u2@example.test" });
        const [list] = await tx.insert(schema.lists).values({ name: "Kitchen" }).returning();
        const m = { listId: list!.id, userId: "u2", role: "editor" as const };
        await tx.insert(schema.listMembers).values(m);
        await tx.insert(schema.listMembers).values(m);
      }),
    ).rejects.toThrow();
  });

  describe("migration 0001 constraints", () => {
    const run = randomUUID();
    const userIds: string[] = [];
    const listIds: string[] = [];

    const newUser = async () => {
      const id = `schema-test-${randomUUID()}`;
      await db.insert(schema.user).values({ id, name: "Schema test", email: `${id}@example.test` });
      userIds.push(id);
      return id;
    };
    const newList = async (values: Partial<typeof schema.lists.$inferInsert> = {}) => {
      const [list] = await db
        .insert(schema.lists)
        .values({ name: `schema-test-${run}`, ...values })
        .returning();
      listIds.push(list!.id);
      return list!;
    };
    const newTask = async (
      values: Partial<typeof schema.tasks.$inferInsert> & { listId: string },
    ) => {
      const [task] = await db
        .insert(schema.tasks)
        .values({ title: "Task", position: randomUUID(), ...values })
        .returning();
      return task!;
    };

    let listId: string;
    beforeAll(async () => {
      listId = (await newList()).id;
    });
    afterAll(async () => {
      if (listIds.length) await db.delete(schema.lists).where(inArray(schema.lists.id, listIds));
      if (userIds.length) await db.delete(schema.user).where(inArray(schema.user.id, userIds));
    });

    it("stores a description", async () => {
      const task = await newTask({ listId, description: "Two coats, white" });
      expect(task.description).toBe("Two coats, white");
      expect((await newTask({ listId })).description).toBeNull();
    });

    it("accepts no estimate, an exact price (min = max) and a range", async () => {
      await newTask({ listId });
      const exact = await newTask({ listId, estimateMinGrosze: 50000, estimateMaxGrosze: 50000 });
      expect([exact.estimateMinGrosze, exact.estimateMaxGrosze]).toEqual([50000, 50000]);
      await newTask({ listId, estimateMinGrosze: 0, estimateMaxGrosze: 0 });
      await newTask({ listId, estimateMinGrosze: 150000, estimateMaxGrosze: 200000 });
    });

    it("rejects min > max", async () => {
      await expect(
        newTask({ listId, estimateMinGrosze: 2001, estimateMaxGrosze: 2000 }),
      ).rejects.toMatchObject(violation(CHECK, "tasks_estimate_range_chk"));
    });

    it("rejects a single bound", async () => {
      await expect(newTask({ listId, estimateMinGrosze: 500 })).rejects.toMatchObject(
        violation(CHECK, "tasks_estimate_pair_chk"),
      );
      await expect(newTask({ listId, estimateMaxGrosze: 500 })).rejects.toMatchObject(
        violation(CHECK, "tasks_estimate_pair_chk"),
      );
    });

    it("rejects a negative amount", async () => {
      await expect(
        newTask({ listId, estimateMinGrosze: -1, estimateMaxGrosze: 100 }),
      ).rejects.toMatchObject(violation(CHECK, "tasks_estimate_range_chk"));
      await expect(
        newTask({ listId, estimateMinGrosze: 0, estimateMaxGrosze: -1 }),
      ).rejects.toMatchObject(violation(CHECK, "tasks_estimate_range_chk"));
    });

    it("rejects a parent in another list or a missing parent", async () => {
      const parent = await newTask({ listId });
      const other = await newList();
      await expect(newTask({ listId: other.id, parentId: parent.id })).rejects.toMatchObject(
        violation(FOREIGN_KEY, "tasks_list_id_parent_id_fk"),
      );
      await expect(newTask({ listId, parentId: randomUUID() })).rejects.toMatchObject(
        violation(FOREIGN_KEY, "tasks_list_id_parent_id_fk"),
      );
      const subtask = await newTask({ listId, parentId: parent.id });
      expect(subtask.parentId).toBe(parent.id);
    });

    it("deletes subtasks with their parent", async () => {
      const parent = await newTask({ listId });
      const sibling = await newTask({ listId });
      await newTask({ listId, parentId: parent.id });
      await newTask({ listId, parentId: parent.id });
      const siblingChild = await newTask({ listId, parentId: sibling.id });

      await db.delete(schema.tasks).where(eq(schema.tasks.id, parent.id));

      expect(
        await db.select().from(schema.tasks).where(eq(schema.tasks.parentId, parent.id)),
      ).toEqual([]);
      const left = await db
        .select({ id: schema.tasks.id })
        .from(schema.tasks)
        .where(inArray(schema.tasks.id, [sibling.id, siblingChild.id]));
      expect(left).toHaveLength(2);
    });

    it("rejects duplicate top-level positions in a list (NULL parent)", async () => {
      const position = randomUUID();
      await newTask({ listId, position });
      await expect(newTask({ listId, position })).rejects.toMatchObject(
        violation(UNIQUE, "tasks_sibling_position_uq"),
      );
    });

    it("rejects duplicate subtask positions under one parent", async () => {
      const parent = await newTask({ listId });
      const position = randomUUID();
      await newTask({ listId, parentId: parent.id, position });
      await expect(newTask({ listId, parentId: parent.id, position })).rejects.toMatchObject(
        violation(UNIQUE, "tasks_sibling_position_uq"),
      );
    });

    it("allows the same position for non-siblings", async () => {
      const position = randomUUID();
      const parent = await newTask({ listId, position });
      const other = await newTask({ listId });
      await newTask({ listId, parentId: parent.id, position });
      await newTask({ listId, parentId: other.id, position });
      await newTask({ listId: (await newList()).id, position });
    });

    it("allows one default list per user and kind", async () => {
      const userA = await newUser();
      const userB = await newUser();
      await newList({ defaultForUserId: userA });
      await expect(newList({ defaultForUserId: userA })).rejects.toMatchObject(
        violation(UNIQUE, "lists_default_for_user_kind_uq"),
      );
      await newList({ defaultForUserId: userA, kind: "shopping" });
      await newList({ defaultForUserId: userB });
      // Lists that are nobody's default are not limited.
      await newList();
      await newList();
    });

    it("deletes a user's default lists with the user", async () => {
      const userId = await newUser();
      const list = await newList({ defaultForUserId: userId });
      await db.delete(schema.user).where(eq(schema.user.id, userId));
      expect(await db.select().from(schema.lists).where(eq(schema.lists.id, list.id))).toEqual([]);
    });
  });
});
