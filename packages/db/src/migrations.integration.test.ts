import { createHash, randomBytes } from "node:crypto";
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

const journal = async () =>
  JSON.parse(await readFile(join(MIGRATIONS, "meta/_journal.json"), "utf8")) as Journal;

/** A copy of the migrations folder that stops after the first `count` entries. */
async function migrationsUpTo(count: number): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "taskly-migrations-"));
  await mkdir(join(dir, "meta"));
  const upTo = await journal();
  upTo.entries = upTo.entries.slice(0, count);
  await writeFile(join(dir, "meta/_journal.json"), JSON.stringify(upTo));
  for (const { tag } of upTo.entries) {
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
        { n: (await journal()).entries.length },
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

describe.skipIf(!url || process.env.TEST_DATABASE_URL !== undefined)(
  "migration 0002 on a database with 0001 data (Testcontainers only)",
  () => {
    const name = `taskly_upgrade_${randomBytes(6).toString("hex")}`;
    const admin = new Pool({ connectionString: url, max: 1 });
    let client: Client;
    let upTo0001: string;
    // Stops at 0002: the migrator applies only entries newer than the last applied one, so after
    // the 0002 down SQL a recorded 0003 would keep 0002 from being applied again.
    let upTo0002: string;

    const query = async <T extends object>(text: string, values: unknown[] = []) =>
      (await client.query<T>(text, values)).rows;

    beforeAll(async () => {
      await admin.query(`CREATE DATABASE "${name}"`);
      const target = new URL(url!);
      target.pathname = `/${name}`;
      client = new Client({ connectionString: target.toString() });
      await client.connect();
      upTo0001 = await migrationsUpTo(2);
      upTo0002 = await migrationsUpTo(3);
      await migrate(drizzle(client), { migrationsFolder: upTo0001 });

      await query(
        `INSERT INTO "user" (id, name, email) VALUES ('m2-u1', 'Owner', 'm2@example.test')`,
      );
      await query(
        `INSERT INTO lists (id, name, default_for_user_id) VALUES
          ('20000000-0000-4000-8000-000000000001', 'My renovation', 'm2-u1')`,
      );
      await query(
        `INSERT INTO list_members (list_id, user_id, role) VALUES
          ('20000000-0000-4000-8000-000000000001', 'm2-u1', 'owner')`,
      );
      await query(
        `INSERT INTO tasks (id, list_id, parent_id, title, description, status, position,
          estimate_min_grosze, estimate_max_grosze)
        VALUES
          ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', NULL,
            'Tiles', 'White', 'todo', 'a0', 100000, 150000),
          ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
            '30000000-0000-4000-8000-000000000001', 'Grout', NULL, 'done', 'a0', NULL, NULL)`,
      );
    });

    afterAll(async () => {
      await client?.end();
      await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
      await admin.end();
      if (upTo0001) await rm(upTo0001, { recursive: true, force: true });
      if (upTo0002) await rm(upTo0002, { recursive: true, force: true });
    });

    it("keeps every task and leaves them unmarked", async () => {
      const columns = `id, list_id, parent_id, title, description, status, position,
        estimate_min_grosze, estimate_max_grosze, cost_grosze, created_at`;
      const before = await query(`SELECT ${columns} FROM tasks ORDER BY id`);
      expect(before).toHaveLength(2);

      await migrate(drizzle(client), { migrationsFolder: upTo0002 });

      expect(await query(`SELECT ${columns} FROM tasks ORDER BY id`)).toEqual(before);
      expect(await query(`SELECT important, urgent FROM tasks ORDER BY id`)).toEqual([
        { important: false, urgent: false },
        { important: false, urgent: false },
      ]);
      await expect(
        query(`UPDATE tasks SET urgent = NULL WHERE id = '30000000-0000-4000-8000-000000000001'`),
      ).rejects.toMatchObject({ code: "23502", column: "urgent" });
    });

    it("rolls back with the down SQL of the run log, keeping every task, and applies again", async () => {
      const columns = `id, title, status, position, estimate_min_grosze, estimate_max_grosze`;
      await migrate(drizzle(client), { migrationsFolder: upTo0002 });
      await query(
        `UPDATE tasks SET important = true WHERE id = '30000000-0000-4000-8000-000000000001'`,
      );
      const before = await query(`SELECT ${columns} FROM tasks ORDER BY id`);
      const hash = createHash("sha256")
        .update(await readFile(join(MIGRATIONS, "0002_task_markers.sql")))
        .digest("hex");

      // The down SQL in `.ai/runs/2026-11-12-e02-phase1-markers.md`.
      await query(`BEGIN`);
      await query(`ALTER TABLE "tasks" DROP COLUMN "important"`);
      await query(`ALTER TABLE "tasks" DROP COLUMN "urgent"`);
      await query(`DELETE FROM "drizzle"."__drizzle_migrations" WHERE "hash" = $1`, [hash]);
      await query(`COMMIT`);

      expect(await query(`SELECT ${columns} FROM tasks ORDER BY id`)).toEqual(before);
      expect(
        await query(
          `SELECT column_name FROM information_schema.columns
            WHERE table_name = 'tasks' AND column_name IN ('important', 'urgent')`,
        ),
      ).toEqual([]);

      // Markers set before the rollback are lost: the accepted cost of the down migration.
      await migrate(drizzle(client), { migrationsFolder: upTo0002 });
      expect(await query(`SELECT important, urgent FROM tasks ORDER BY id`)).toEqual([
        { important: false, urgent: false },
        { important: false, urgent: false },
      ]);
    });
  },
);

describe.skipIf(!url || process.env.TEST_DATABASE_URL !== undefined)(
  "migration 0003 on a database with 0002 data (Testcontainers only)",
  () => {
    const name = `taskly_upgrade_${randomBytes(6).toString("hex")}`;
    const admin = new Pool({ connectionString: url, max: 1 });
    let client: Client;
    let upTo0002: string;

    const query = async <T extends object>(text: string, values: unknown[] = []) =>
      (await client.query<T>(text, values)).rows;

    beforeAll(async () => {
      await admin.query(`CREATE DATABASE "${name}"`);
      const target = new URL(url!);
      target.pathname = `/${name}`;
      client = new Client({ connectionString: target.toString() });
      await client.connect();
      upTo0002 = await migrationsUpTo(3);
      await migrate(drizzle(client), { migrationsFolder: upTo0002 });

      await query(
        `INSERT INTO "user" (id, name, email) VALUES ('m3-u1', 'Owner', 'm3@example.test')`,
      );
      await query(
        `INSERT INTO lists (id, name, default_for_user_id) VALUES
          ('20000000-0000-4000-8000-000000000003', 'My renovation', 'm3-u1')`,
      );
      await query(
        `INSERT INTO list_members (list_id, user_id, role) VALUES
          ('20000000-0000-4000-8000-000000000003', 'm3-u1', 'owner')`,
      );
      await query(
        `INSERT INTO tasks (id, list_id, parent_id, title, status, position, important, urgent)
        VALUES
          ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', NULL,
            'Curtain rod', 'todo', 'a0', true, false),
          ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000003',
            '30000000-0000-4000-8000-000000000003', 'Drill', 'done', 'a0', false, true)`,
      );
    });

    afterAll(async () => {
      await client?.end();
      await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
      await admin.end();
      if (upTo0002) await rm(upTo0002, { recursive: true, force: true });
    });

    const columns = `id, list_id, parent_id, title, status, position, important, urgent, created_at`;

    it("keeps every task and seeds no places: a user from before has none until first use", async () => {
      const before = await query(`SELECT ${columns} FROM tasks ORDER BY id`);
      expect(before).toHaveLength(2);

      await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });

      expect(await query(`SELECT ${columns} FROM tasks ORDER BY id`)).toEqual(before);
      expect(await query(`SELECT * FROM place_owners`)).toEqual([]);
      expect(await query(`SELECT * FROM places`)).toEqual([]);
      expect(await query(`SELECT * FROM task_places`)).toEqual([]);
    });

    it("rolls back with the down SQL of the run log, keeping every task, and applies again", async () => {
      await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });
      await query(`INSERT INTO place_owners (user_id) VALUES ('m3-u1')`);
      const [place] = await query<{ id: string }>(
        `INSERT INTO places (user_id, name, name_key, color, position)
          VALUES ('m3-u1', 'Salon', 'salon', 1, 'a0') RETURNING id`,
      );
      await query(
        `INSERT INTO task_places (task_id, place_id)
          VALUES ('30000000-0000-4000-8000-000000000003', $1)`,
        [place!.id],
      );
      const before = await query(`SELECT ${columns} FROM tasks ORDER BY id`);
      const hash = createHash("sha256")
        .update(await readFile(join(MIGRATIONS, "0003_places.sql")))
        .digest("hex");

      // The down SQL in `.ai/runs/2026-11-12-e02-phase2-places.md`.
      await query(`BEGIN`);
      await query(`DROP TABLE "task_places"`);
      await query(`DROP TABLE "places"`);
      await query(`DROP TABLE "place_owners"`);
      await query(`DELETE FROM "drizzle"."__drizzle_migrations" WHERE "hash" = $1`, [hash]);
      await query(`COMMIT`);

      expect(await query(`SELECT ${columns} FROM tasks ORDER BY id`)).toEqual(before);
      expect(
        await query(
          `SELECT table_name FROM information_schema.tables
            WHERE table_name IN ('places', 'task_places', 'place_owners')`,
        ),
      ).toEqual([]);

      // Places entered before the rollback are lost: the accepted cost of the down migration.
      await migrate(drizzle(client), { migrationsFolder: MIGRATIONS });
      expect(await query(`SELECT ${columns} FROM tasks ORDER BY id`)).toEqual(before);
      expect(await query(`SELECT * FROM places`)).toEqual([]);
    });
  },
);
