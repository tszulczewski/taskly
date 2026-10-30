import { randomBytes } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = resolve(import.meta.dirname, "../migrations");
const url = process.env.DATABASE_URL;

type Journal = { entries: { idx: number; tag: string }[] };

/** A copy of the migrations folder that stops after the first `count` entries. */
async function migrationsUpTo(count: number): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "taskly-migrations-"));
  await mkdir(join(dir, "meta"));
  const journal = JSON.parse(
    await readFile(join(MIGRATIONS, "meta/_journal.json"), "utf8"),
  ) as Journal;
  journal.entries = journal.entries.slice(0, count);
  await writeFile(join(dir, "meta/_journal.json"), JSON.stringify(journal));
  for (const { tag } of journal.entries) {
    await copyFile(join(MIGRATIONS, `${tag}.sql`), join(dir, `${tag}.sql`));
  }
  return dir;
}

// Needs a fresh database, which only the Testcontainers superuser can create (the dev role has no
// CREATEDB and migrations hard-code "public"), so it skips itself on TEST_DATABASE_URL.
describe.skipIf(!url || process.env.TEST_DATABASE_URL !== undefined)(
  "migration 0001 on a database with 0000 data (Testcontainers only)",
  () => {
    const name = `taskly_upgrade_${randomBytes(6).toString("hex")}`;
    const admin = new Pool({ connectionString: url, max: 1 });
    // A Client, not a Pool: pg-pool resolves `end()` before its sockets close, so a following
    // DROP DATABASE could still see (and, with FORCE, kill) the connection.
    let client: Client;
    let only0000: string;

    const query = async <T extends object>(text: string, values: unknown[] = []) =>
      (await client.query<T>(text, values)).rows;

    beforeAll(async () => {
      await admin.query(`CREATE DATABASE "${name}"`);
      const target = new URL(url!);
      target.pathname = `/${name}`;
      client = new Client({ connectionString: target.toString() });
      await client.connect();
      only0000 = await migrationsUpTo(1);
      await migrate(drizzle(client), { migrationsFolder: only0000 });

      await query(
        `INSERT INTO "user" (id, name, email) VALUES
          ('up-u1', 'Owner', 'up-u1@example.test'), ('up-u2', 'Editor', 'up-u2@example.test')`,
      );
      await query(
        `INSERT INTO lists (id, name, kind) VALUES
          ('00000000-0000-4000-8000-000000000001', 'Bathroom', 'project'),
          ('00000000-0000-4000-8000-000000000002', 'Shopping', 'shopping')`,
      );
      await query(
        `INSERT INTO list_members (list_id, user_id, role) VALUES
          ('00000000-0000-4000-8000-000000000001', 'up-u1', 'owner'),
          ('00000000-0000-4000-8000-000000000001', 'up-u2', 'editor'),
          ('00000000-0000-4000-8000-000000000002', 'up-u1', 'owner')`,
      );
      await query(
        `INSERT INTO tasks
          (id, list_id, parent_id, title, status, position, estimate_min_grosze, estimate_max_grosze, cost_grosze)
        VALUES
          ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', NULL,
            'Plastering', 'todo', 'a0', 100000, 200000, NULL),
          ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', NULL,
            'Painting', 'done', 'a1', NULL, NULL, 12000),
          ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
            '10000000-0000-4000-8000-000000000001', 'Walls', 'todo', 'a0', 30000, 30000, NULL),
          ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001',
            '10000000-0000-4000-8000-000000000001', 'Ceiling', 'done', 'a1', NULL, NULL, NULL)`,
      );
    });

    afterAll(async () => {
      await client?.end();
      await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
      await admin.end();
      if (only0000) await rm(only0000, { recursive: true, force: true });
    });

    it("keeps every row and enforces the new constraints", async () => {
      const snapshot = async () => ({
        users: await query(`SELECT id, name, email FROM "user" ORDER BY id`),
        lists: await query(`SELECT id, name, kind FROM lists ORDER BY id`),
        members: await query(
          `SELECT list_id, user_id, role FROM list_members ORDER BY list_id, user_id`,
        ),
        tasks: await query(
          `SELECT id, list_id, parent_id, title, status, position,
            estimate_min_grosze, estimate_max_grosze, cost_grosze FROM tasks ORDER BY id`,
        ),
      });
      const before = await snapshot();
      expect(before.tasks).toHaveLength(4);

      await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });

      expect(await snapshot()).toEqual(before);
      expect(await query(`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`)).toEqual([
        { n: 2 },
      ]);
      expect(await query(`SELECT DISTINCT description FROM tasks`)).toEqual([
        { description: null },
      ]);
      expect(await query(`SELECT DISTINCT default_for_user_id FROM lists`)).toEqual([
        { default_for_user_id: null },
      ]);

      const list = "00000000-0000-4000-8000-000000000001";
      const insertTask = (columns: string, values: unknown[]) =>
        query(
          `INSERT INTO tasks (list_id, title, ${columns}) VALUES ($1, 'x', ${values
            .map((_, i) => `$${i + 2}`)
            .join(", ")})`,
          [list, ...values],
        );

      await expect(
        insertTask("position, estimate_min_grosze, estimate_max_grosze", ["b0", 2, 1]),
      ).rejects.toMatchObject({ code: "23514", constraint: "tasks_estimate_range_chk" });
      await expect(insertTask("position, estimate_min_grosze", ["b0", 1])).rejects.toMatchObject({
        code: "23514",
        constraint: "tasks_estimate_pair_chk",
      });
      await expect(insertTask("position", ["a0"])).rejects.toMatchObject({
        code: "23505",
        constraint: "tasks_sibling_position_uq",
      });
      await expect(
        query(
          `INSERT INTO tasks (list_id, parent_id, title, position) VALUES ($1, $2, 'x', 'b0')`,
          ["00000000-0000-4000-8000-000000000002", "10000000-0000-4000-8000-000000000001"],
        ),
      ).rejects.toMatchObject({ code: "23503", constraint: "tasks_list_id_parent_id_fk" });

      await query(`UPDATE lists SET default_for_user_id = 'up-u1' WHERE id = $1`, [list]);
      await expect(
        query(`INSERT INTO lists (name, default_for_user_id) VALUES ('Second', 'up-u1')`),
      ).rejects.toMatchObject({ code: "23505", constraint: "lists_default_for_user_kind_uq" });

      // Subtasks written before 0001 now cascade with their parent.
      await query(`DELETE FROM tasks WHERE id = '10000000-0000-4000-8000-000000000001'`);
      expect(await query(`SELECT title FROM tasks ORDER BY title`)).toEqual([
        { title: "Painting" },
      ]);
    });
  },
);
