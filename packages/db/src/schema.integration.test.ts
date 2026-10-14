import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "./schema";

class Rollback extends Error {}

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("schema (real PostgreSQL)", () => {
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema });
  afterAll(() => pool.end());

  it("stores lists, members and tasks and cascades deletes", async () => {
    await db.transaction(async (tx) => {
      await tx.insert(schema.user).values({ id: "u1", name: "U", email: "u1@example.test" });
      const [list] = await tx.insert(schema.lists).values({ name: "Bathroom" }).returning();
      await tx.insert(schema.listMembers).values({ listId: list!.id, userId: "u1", role: "owner" });
      await tx.insert(schema.tasks).values([
        { listId: list!.id, title: "Plastering", position: "a0", costGrosze: 12000 },
        { listId: list!.id, title: "Painting", position: "a1", estimateMinGrosze: 5000, estimateMaxGrosze: 9000 },
      ]);

      const rows = await tx.select().from(schema.tasks).where(eq(schema.tasks.listId, list!.id));
      expect(rows.map((r) => r.title).sort()).toEqual(["Painting", "Plastering"]);

      await tx.delete(schema.lists).where(eq(schema.lists.id, list!.id));
      expect(await tx.select().from(schema.tasks).where(eq(schema.tasks.listId, list!.id))).toEqual([]);
      throw new Rollback();
    }).catch((e) => {
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
});
