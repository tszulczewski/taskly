# Tasks and subtasks (E01) implementation

- **Date:** 2026-10-29
- **Spec:** .ai/specs/2026-10-16-tasks-and-subtasks.md
- **Outcome:** in progress

## Goal

Implement the E01 spec task by task (tracker: `track.md`), one subagent and one commit per task, stopping after each phase for the owner's manual test.

## Steps taken

- Read `.ai/lessons.md` and the spec. Broke the spec's 11 steps into 17 tasks in three phases that match its PRs A/B/C (`track.md`). Branch `feat/e01-tasks-and-subtasks` off `main` at `9f99bbd`.
- Preconditions checked: sign-in Phase A is merged (#40); `engineering-standards.md` §6 already has the roll-up rule (Q3); issue #15 carries the rewritten AC1–AC7; Docker works in this session, so Testcontainers runs locally.
- Spec vs. code: step 8 asks for `npx shadcn@latest init` and new primitives in `packages/ui`. The design system (#30) has since added them, plus the task components in `packages/ui/src/product/tasks/`, so the screen reuses those.
- **Task 1.1 (migration `0001`, spec step 1).** `schema.ts`: `tasks.description`, `unique("tasks_list_id_id_idx")` on `(list_id, id)`, FK `tasks_list_id_parent_id_fk (list_id, parent_id) → tasks(list_id, id) ON DELETE CASCADE`, `tasks_sibling_position_uq` with `nullsNotDistinct`, the two estimate checks as in the spec, `lists.default_for_user_id → "user"(id) ON DELETE CASCADE` and the partial unique `lists_default_for_user_kind_uq`. Generated `0001_tasks_and_default_lists.sql` with `npm run generate -w @taskly/db -- --name=tasks_and_default_lists` (the root `npm run db:generate -- --name …` does not pass `--name` through). drizzle-kit put `tasks_list_id_id_idx` after the FK, as the spec predicted; moved it in front of the FK by hand, with a one-line SQL comment (snapshot and journal unaffected; a second `generate` reports no schema changes, `drizzle-kit check` is fine). drizzle-kit writes the check and index predicates with table-qualified columns (`"tasks"."estimate_min_grosze"`); PostgreSQL accepts this.
  - `schema.integration.test.ts`: new `migration 0001 constraints` block with its own uniquely named users/lists (deleted in `afterAll`): description stored; no estimate, min = max, 0–0 and a range accepted; min > max, a single bound (either side) and a negative amount (min or max) rejected with the named check; a cross-list or missing parent rejected by `tasks_list_id_parent_id_fk`; deleting a parent deletes its subtasks only; duplicate top-level (NULL parent) and duplicate subtask positions rejected, same position for non-siblings allowed; a second default project list for one user rejected, a default shopping list and another user's default allowed, non-default lists unlimited; a user's default list is deleted with the user. Errors are asserted by SQLSTATE and constraint name.
  - New `migrations.integration.test.ts` (upgrade test): skips when `TEST_DATABASE_URL` is set. Under Testcontainers it creates a fresh database as the container superuser, migrates it with a temporary copy of the migrations folder whose journal stops after `0000`, inserts two users, a project and a shopping list, three memberships and four tasks (two top-level, two with `parent_id`, with and without estimates, one with `cost_grosze`, `status` todo/done) with raw SQL, then runs the real migrator over the full folder. It asserts that all 0000 columns of every row are unchanged, two migrations are recorded, the new columns are NULL, the checks/unique/parent FK/default-list index reject violations, and the pre-0001 subtasks now cascade with their parent. It drops the database afterwards.
  - `schema.test.ts`: `lists` added to the FK-resolution test (the new `default_for_user_id` reference callback was the only uncovered function).
  - Rollback SQL written and tested by hand on a disposable `postgres:16` container (see Verification). Pre-deploy violation query run on the dev DB (clean), then `0001` applied there with `npm run db:migrate`.
- **Task 1.2 (money, estimates and schemas, spec step 2).** All isomorphic, exported from `@taskly/core`.
  - `money.ts`: `MAX_ESTIMATE_GROSZE = 1_000_000_000` and `parsePlnToGrosze`. Rules decided here (the spec gives only the examples): leading/trailing whitespace (any Unicode whitespace, `trim()`) is ignored; whole złoty are either plain digits (leading zeros allowed, "007") or grouped by exactly three with a space, NBSP or narrow NBSP (U+202F; mixed separators allowed); a grouped amount must not start with 0 ("0 500" rejected); then an optional `,` or `.` with 1–2 digits. A comma is always decimal, so "1,500" (three decimals) and "1.500,50" are rejected rather than guessed. Rejected too: signs, exponents, "12,", ",5", ".5", "zł" suffixes, double/tab/underscore/apostrophe separators, non-ASCII digits. Grosze are built by string concatenation then `Number()` of an integer string; a result above `Number.MAX_SAFE_INTEGER` returns null (an inexact value must never pass as money). `formatPlnRange` untouched (task 2.3).
  - `schemas.ts`: `estimateMessages` (`amount` "Enter an amount like 1 500,50", `upToBelowAmount` "“Up to” must not be less than the amount.", `overCap` "Enter at most 10 000 000 zł"; same wording as the design system's `taskMessages` in `packages/ui/.storybook/blocks/task-data.ts`, which core does not import); `estimateGroszeSchema` (int, 0…cap; int/negative → the amount message, over cap → `overCap`); `estimateSchema` now uses it with the refine on path `["maxGrosze"]`; `estimateViewSchema` (uncapped `groszeSchema`); `groszeSchema` unchanged. `taskFields` (no defaults): title trimmed 1–200 ("Enter a title." / "Enter at most 200 characters."), description trimmed ≤ 2000 ("Enter at most 2 000 characters."), "" → null, nullable; estimate `estimateSchema | null`. `createTaskInput` = `{ title, description = null, estimate = null }` (old `listId`/`parentId` removed; unknown keys are stripped; there were no callers besides the stub). `updateTaskInput` = `taskFields.partial()` refined to at least one key whose value is not `undefined` ("Change at least one field.", root path), because a `.partial()` object keeps a key sent as `undefined`. `subtaskViewSchema`, `taskViewSchema` (+ `unestimatedSubtasks`, `subtasks`), `taskListResponseSchema`, `deleteTaskResponseSchema`: no defaults, plain `z.object` (unknown fields stripped, not rejected). Types: `Estimate`, `CreateTaskInput`, `UpdateTaskInput`, `SubtaskView`, `TaskView`.
  - New `estimate.ts`: `estimateFromAmounts` (blank fields count as empty; each field is parsed and checked against `estimateGroszeSchema` first, so bad text or over-cap goes on the field holding it and both fields are reported together; only when both are valid is the range checked with `estimateSchema`, error on `upTo`) and `rollUpEstimate` (per spec; a zero subtask estimate counts as an estimate). Exported from `index.ts`. Types `AmountField`, `EstimateFromAmounts`.
  - `aiEstimateResponse` is still `estimateSchema`; it is now capped and its range error sits on `maxGrosze` (spec: harmless). Tested.
  - Tests: new `money.test.ts` (all Edge Cases amount rows, contract examples, 0 / max / max + 1 grosz, NBSP and U+202F, whitespace, malformed grouping, safe-integer limit), new `estimate.test.ts` (every `estimateFromAmounts` and `rollUpEstimate` case of step 2, incl. #16 AC2 numbers and a sum above the cap passing `estimateViewSchema`), `schemas.test.ts` (cap boundaries, `groszeSchema` above the cap, messages and paths, `createTaskInput` defaults/trim/blank description/length limits, the `updateTaskInput.parse({ title: "x" })` → exactly `{ title: "x" }` regression and `{}` / `{ description: undefined }` rejected, valid and malformed response shapes: every missing field of a task and of a subtask incl. `unestimatedSubtasks`, invalid ranges, wrong types, empty subtask arrays, sum above the cap, additive unknown fields), `barrels.test.ts` pins the new isomorphic exports.
  - Mutation check in a separate worktree (removed afterwards): allowing a grouped leading zero, dropping the safe-integer check, dropping the refine path, `Object.keys`-style refine, removing the defaults, exact price from "Amount" only, removing the no-subtasks branch, a partial view schema, and building `updateTaskInput` from `createTaskInput` each failed at least one test.
- **Task 1.3 (`ensureDefaultList`, spec step 3).** `lists.ts`: `ensureDefaultList(db, userId): Promise<string>`, exported through `@taskly/core/server` (the barrel already re-exports `lists`). A private `findDefaultListId(dbOrTx, userId)` selects `lists.id` where `default_for_user_id = userId AND kind = 'project'`; a hit returns at once, outside any transaction. On a miss, one transaction inserts `{ name: "My renovation", kind: "project", defaultForUserId: userId }` with `onConflictDoNothing({ target: [lists.defaultForUserId, lists.kind], where: isNotNull(lists.defaultForUserId) })` (drizzle 0.45 renders `where` in `onConflictDoNothing` as the conflict-target index predicate) `RETURNING id`; when a row comes back it adds the `owner` membership, otherwise it re-selects the id inside the transaction (READ COMMITTED: the conflicting row is committed, so the new statement sees it). Generated SQL, checked with `drizzle.mock().toSQL()`: `insert into "lists" ("id", "name", "kind", "default_for_user_id", "created_at") values (default, $1, $2, $3, default) on conflict ("default_for_user_id","kind") where "lists"."default_for_user_id" is not null do nothing returning "id"`; PostgreSQL infers `lists_default_for_user_kind_uq` from it (the table-qualified predicate is accepted). No `requireRole`: the session user is the authorization and `userId` is the only input. `deleteList`, tasks, routes and UI untouched.
  - `lists.test.ts`: mocked `Db` whose outer handle has only `select` and `transaction` (a write outside the transaction would throw); the `where` conditions and the conflict predicate are rendered with `PgDialect.sqlToQuery` and compared as SQL + params. Cases: hit (one select, no transaction), miss (list insert with the exact values and conflict target/predicate, then owner member, one transaction), conflict (insert returns nothing → re-select inside the transaction, no member insert). `barrels.test.ts` pins `server.ensureDefaultList`.
  - `lists.integration.test.ts` (new `ensureDefaultList` block, fresh uniquely named users per test, deleted in `afterAll` with their default lists by the FK cascade): two sequential calls → same id, one "My renovation" `project` list, one `owner` row, visible in `listsForUser`; two concurrent first calls (`Promise.all`) → same id, one list, one owner row; a deterministic ON CONFLICT test — another transaction inserts the user's default row and holds it, the call is started and the test waits (via `pg_stat_activity`, `wait_event_type = 'Lock'`) until its insert blocks, then commits the blocker → the call returns the blocker's id and adds no member; two users at once → separate lists; a user's own project list and a default *shopping* list are ignored (a new default project list is created).
- **Task 1.4 (`deleteList` changes, spec step 4).** `lists.ts`: `requireManagedProjectList` now also selects `default_for_user_id` (still an unlocked read: the locked membership row guarantees the list exists, and locking the list row before the memberships would invert the writers' order) and returns it. `deleteList` then throws `ConflictError("The default list cannot be deleted")` for a default list before taking any further lock; otherwise it locks every membership row of the list (`SELECT user_id FROM list_members WHERE list_id = $1 ORDER BY user_id FOR UPDATE`; PostgreSQL locks rows after the sort, so in `user_id` order) and only then runs `DELETE FROM lists`. `renameList` is unchanged and still renames the default list.
  - `lists.test.ts`: the fake `tx` now answers both selects (the list read returns `kind` + `defaultForUserId`; the `list_members` select records fields, table, rendered `where`/`orderBy` and the `for` mode). New: the delete's call order is `requireRole` → list read → `lock members update` → `delete`, the lock query is `"list_members"."list_id" = $1` ordered by `"list_members"."user_id" asc`; the default list → 409 with the exact message and nothing locked or deleted; `renameList` renames the default list. Existing cases kept.
  - `lists.integration.test.ts` (new `deleteList: the default list and concurrent writers` block): default list → `ConflictError` with the message, list/member/task kept, `renameList` works and `ensureDefaultList` returns the same id. Concurrency on a non-default list from `createList` with `ed` as editor, owner and editor on their own single-connection pools (`idleTimeoutMillis: 0`) so `pg_backend_pid()` names each actor; barriers poll `pg_blocking_pids(waiter)` for the other actor's pid (no sleeps), and every held transaction is released in `finally`. *Editor first:* the editor runs `requireRole(… "write")` (membership `FOR SHARE`) and pauses; the owner's `deleteList` starts and the test waits until it is blocked by the editor; the editor then locks the list row `FOR NO KEY UPDATE`, inserts a task with drizzle and pauses again; the delete is checked to be still blocked; the editor commits → both succeed, no list, members or tasks left. *Delete first:* a third transaction holds the list's existing task `FOR UPDATE`, so the delete stops in its cascade after locking every membership; the editor's write starts and the test waits until it is blocked by the owner; the holder is released → the delete succeeds, the editor's transaction fails with `NotFoundError` from `requireRole` (its membership row was deleted under it), nothing left. `createTask` does not exist yet, so the editor's append is the lock protocol written out by hand; **task 1.5 re-runs both orderings with the complete `createTask` service, and task 3.1 with subtask creation (spec step 4).**
  - Mutation check in a separate worktree (root and `packages/*/node_modules` linked, removed afterwards): removing the all-members lock (the old code) → the editor-first test fails with `40P01 deadlock detected` (and 1 unit test); locking the list row `FOR UPDATE` in the list read → `40P01` in the same test; dropping the `ORDER BY` → 1 unit test fails (integration tests pass: the order only matters between two transactions that both lock all memberships); dropping the default guard → 1 unit + 1 integration test; refusing to rename the default list → 1 unit + 1 integration test. The delete-first test passes against the old code too: there the delete's cascade reaches the editor's membership before the editor locks the list row, so that ordering never forms the cycle; it pins the clean 404 outcome, not the fix.

## Files changed

- Task 1.1: `packages/db/src/schema.ts`, `packages/db/migrations/0001_tasks_and_default_lists.sql` (new), `packages/db/migrations/meta/0001_snapshot.json` (new), `packages/db/migrations/meta/_journal.json`, `packages/db/src/schema.integration.test.ts`, `packages/db/src/migrations.integration.test.ts` (new), `packages/db/src/schema.test.ts`, `track.md`, this run log, `.ai/lessons.md`.
- Task 1.2: `packages/core/src/money.ts`, `packages/core/src/money.test.ts` (new), `packages/core/src/estimate.ts` (new), `packages/core/src/estimate.test.ts` (new), `packages/core/src/schemas.ts`, `packages/core/src/schemas.test.ts`, `packages/core/src/index.ts`, `packages/core/src/barrels.test.ts`, `track.md`, this run log, `.ai/lessons.md`.
- Task 1.3: `packages/core/src/lists.ts`, `packages/core/src/lists.test.ts`, `packages/core/src/lists.integration.test.ts`, `packages/core/src/barrels.test.ts`, `track.md`, this run log, `.ai/lessons.md`.
- Task 1.4: `packages/core/src/lists.ts`, `packages/core/src/lists.test.ts`, `packages/core/src/lists.integration.test.ts`, `track.md`, this run log, `.ai/lessons.md`, `.ai/lessons/2026-10-16-cross-actor-list-locks.md`.

## Verification (commands run and results)

### Task 1.1

- `npm run format:check`: pass. `npm run lint`: 0 errors, 1 pre-existing warning (`.agents/skills/om-share-this-session/scripts/prepare-share-bundle.mjs`, unused `tmpdir`; not touched). `npm run typecheck`: pass.
- `npm test`: 62 files, 461 tests passed; coverage 100% statements (1079/1079), branches (708/708), functions (399/399), lines (966/966). The first run was at 99.74% functions until `lists` was added to the FK test in `schema.test.ts`.
- `npm run build`: pass.
- `npm run test:integration` (Testcontainers, `TEST_DATABASE_URL` unset): 11 files, 74 tests passed, exit 0, in one run with `AGENT_BROWSER_SOCKET_DIR=/tmp/claude-1000/ab`. Without that variable the three browser files fail in this session's sandbox with `Failed to create socket directory: Permission denied` (8 of 74 failed; environment only, see Problems). The upgrade test ran, not skipped: `✓ migration 0001 on a database with 0000 data (Testcontainers only) > keeps every row and enforces the new constraints`.
- `TEST_DATABASE_URL=<dev DB> vitest run --config vitest.integration.config.mts packages/db`: 14 passed, 1 skipped (the upgrade test skips itself as intended). Afterwards the dev DB still had 3 tasks and 6 lists, and no `schema-test-%` users or lists were left.

**Rollback SQL for `0001`** (no down migration is generated; never run it against the dev or production DB without a decision to roll back):

```sql
BEGIN;
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_estimate_range_chk";
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_estimate_pair_chk";
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_sibling_position_uq";
DROP INDEX "lists_default_for_user_kind_uq";
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_list_id_parent_id_fk";
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_list_id_id_idx";
ALTER TABLE "lists" DROP CONSTRAINT "lists_default_for_user_id_user_id_fk";
ALTER TABLE "tasks" DROP COLUMN "description";
ALTER TABLE "lists" DROP COLUMN "default_for_user_id";
-- Forget 0001 so drizzle applies it again on the next migrate (created_at = journal "when").
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1793274682175;
COMMIT;
```

Dropping the columns loses task descriptions and the default-list marker, not tasks. The FK must go before `tasks_list_id_id_idx`, which it depends on.

**Manual rollback test** (disposable container, 2026-10-29):

1. `docker run --rm -d --name taskly-rollback-check -p 55432:5432 -e POSTGRES_PASSWORD=x postgres:16` (PostgreSQL 16.15).
2. Applied `0000` with `psql`, recorded it in `drizzle.__drizzle_migrations` (sha256 of the file, `created_at` 1791989532143), inserted a user, a list, a member, a top-level task with 100000–200000 and a subtask without an estimate.
3. `DATABASE_URL=postgres://postgres:…@127.0.0.1:55432/postgres npm run db:migrate` → "migrations applied successfully"; the 6 constraints and `lists_default_for_user_kind_uq` present, 2 migration rows. Set a description and a default-list marker.
4. Ran the rollback SQL → committed. Afterwards `tasks`/`lists` had only `lists_pkey`, `tasks_pkey`, `tasks_list_id_lists_id_fk`, `tasks_list_parent_idx` and the 0000 columns; 1 migration row; both task rows intact (estimate and `parent_id` kept).
5. Re-apply check (not required): `npm run db:migrate` again → applied, 6 constraints, 2 migration rows.
6. Rolled back again, created `fresh0000` with only `0000`, and diffed `pg_dump -s -n public` of both: identical apart from pg_dump's random `\restrict` tokens.
7. `docker stop taskly-rollback-check` (removed by `--rm`). The rollback was never run against the dev DB.

**Dev DB, pre-deploy violation query** (run before `0001`, against `DATABASE_URL` from `.env`):

```sql
SELECT 'tasks_estimate_pair_chk' AS rule, count(*)::int AS rows FROM tasks
  WHERE (estimate_min_grosze IS NULL) <> (estimate_max_grosze IS NULL)
UNION ALL SELECT 'tasks_estimate_range_chk', count(*)::int FROM tasks
  WHERE estimate_min_grosze IS NOT NULL
    AND NOT (estimate_min_grosze >= 0 AND estimate_min_grosze <= estimate_max_grosze)
UNION ALL SELECT 'tasks_sibling_position_uq (duplicate groups)', count(*)::int FROM (
  SELECT 1 FROM tasks GROUP BY list_id, parent_id, position HAVING count(*) > 1) d
UNION ALL SELECT 'tasks_list_id_parent_id_fk (missing or cross-list parent)', count(*)::int FROM tasks c
  WHERE c.parent_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM tasks p WHERE p.id = c.parent_id AND p.list_id = c.list_id)
UNION ALL SELECT 'tasks (total rows)', count(*)::int FROM tasks
UNION ALL SELECT 'lists (total rows)', count(*)::int FROM lists
UNION ALL SELECT 'drizzle migrations applied', count(*)::int FROM drizzle.__drizzle_migrations;
```

(`GROUP BY` treats NULL parents as equal, matching `NULLS NOT DISTINCT`; the range query skips a NULL max as the CHECK does, and the pair query catches it.) Output:

| rule | rows |
| --- | --- |
| tasks_estimate_pair_chk | 0 |
| tasks_estimate_range_chk | 0 |
| tasks_sibling_position_uq (duplicate groups) | 0 |
| tasks_list_id_parent_id_fk (missing or cross-list parent) | 0 |
| tasks (total rows) | 3 |
| lists (total rows) | 6 |
| drizzle migrations applied | 1 |

**`0001` on the dev DB:** `npm run db:migrate` (with `DATABASE_URL` taken from `.env`) → "migrations applied successfully". After: `drizzle.__drizzle_migrations` has rows 1 (`1791989532143`) and 2 (`1793274682175`); all 7 new constraints/indexes exist; `tasks.description` and `lists.default_for_user_id` exist; still 3 tasks and 6 lists.

### Task 1.2

- `npm run format:check`: pass. `npm run lint`: 0 errors, the same 1 pre-existing warning. `npm run typecheck`: pass.
- `npm test`: 64 files, 588 tests passed; coverage 100% statements (1135/1135), branches (745/745), functions (407/407), lines (1015/1015).
- Not run: `npm run build` and `npm run test:integration` (no DB, route or UI change in this task; they run at the Phase 1 gate).

### Task 1.3

- `npm run format:check`: pass. `npm run lint`: 0 errors, the same 1 pre-existing warning. `npm run typecheck`: pass (exit 0).
- `npm test`: 64 files, 591 tests passed; coverage 100% statements (1147/1147), branches (749/749), functions (410/410), lines (1026/1026).
- `npx vitest run --config vitest.integration.config.mts packages/core` (Testcontainers, `TEST_DATABASE_URL` unset): 3 files, 34 tests passed (`lists.integration.test.ts`: 11, of which 5 new).
- Mutation check in a separate worktree (removed afterwards): dropping the conflict predicate (`where`) failed 5 integration tests (PostgreSQL cannot infer the partial index without it, so every miss errors) and 3 unit tests; inserting the owner member also on the conflict path failed 2 integration tests (concurrent and ON CONFLICT) and 1 unit test; dropping the `kind = 'project'` filter failed the default-shopping-list integration test and 2 unit tests.
- Not run: `npm run build` and the full `npm run test:integration` (no route or UI change; they run at the Phase 1 gate).
### Task 1.4

- `npm run format:check`: pass. `npm run lint`: 0 errors, the same 1 pre-existing warning. `npm run typecheck`: pass (exit 0).
- `npm test`: 64 files, 593 tests passed; coverage 100% statements (1151/1151), branches (751/751), functions (410/410), lines (1030/1030).
- `npx vitest run --config vitest.integration.config.mts packages/core` (Testcontainers, `TEST_DATABASE_URL` unset): 3 files, 37 tests passed (`lists.integration.test.ts`: 14, of which 3 new).
- `lists.integration.test.ts` alone, 5 consecutive runs: 14/14 passed each time (5.1–5.3 s per run).
- Not run: `npm run build` and the full `npm run test:integration` (no route or UI change; they run at the Phase 1 gate).

## Problems / open questions

- Task 1.1: in this session's sandbox agent-browser cannot create its socket directory under `XDG_RUNTIME_DIR` (`Permission denied (os error 13)`), so the browser integration tests fail until `AGENT_BROWSER_SOCKET_DIR` points at a short writable path. Running outside the sandbox was refused. Not a code problem; CI is unaffected.
- Task 1.1: `npx drizzle-kit check --config packages/db/drizzle.config.ts` from the repo root created a stray untracked `migrations/meta/_journal.json` at the root (the config's `out` resolves against the cwd), which `format:check` flagged; deleted it.
- Task 1.1: no deviation from the spec. The rollback SQL also deletes the `0001` row from `drizzle.__drizzle_migrations` so a later `db:migrate` can re-apply it (the spec's rollback plan lists only the schema objects).
- Task 1.2: the spec's Architecture list says `taskFieldsInput`, its API Contracts say `taskFields`; used `taskFields` (the contract). The spec gives no title/description messages; took "Enter a title." and "Enter at most 2 000 characters." from the design system's `taskMessages` and added "Enter at most 200 characters." in the same style. The over-cap message is "Enter at most 10 000 000 zł" (also from `taskMessages.overCap`). An amount too large to be an exact integer (≥ ~90 trillion zł) gets "Enter an amount like 1 500,50", not the over-cap message, because `parsePlnToGrosze` returns null for it. The Storybook simulation `toGrosze` still accepts a grouped leading zero ("0 500"); it is a story helper and was left unchanged.
- Task 1.3: the first version of the ON CONFLICT integration test hung during the mutation check: with the predicate removed the call failed at once, `waitForLockWait` threw, and the blocker transaction was never released, so `afterAll`'s user delete waited on its locks until the hook timeout. The test now settles the call immediately and releases the blocker in a `finally`. No deviation from the spec; "My renovation" stays a module constant in `lists.ts` (no other caller yet; the page's "did not open" heading in task 2.4 may need an isomorphic copy).
- Task 1.4: no deviation from the spec. Open point, not a regression: two *different* managers of one list deleting it at the same moment can still deadlock (each holds its own membership `FOR UPDATE` from `requireRole`, then waits for the other's in the all-members lock); the old code had the same cycle. It cannot happen today, since only `createList` and `ensureDefaultList` create owners and invitations never grant `owner`, so a list has one owner. If co-owners ever arrive, `deleteList` could skip `requireRole`'s lock and take all memberships in one ordered statement after an unlocked role check, or retry on `40P01`.

## Lessons recorded (links into .ai/lessons.md)

- Task 1.1: drizzle-kit generation and cwd pitfalls (2026-10-29 entry); agent-browser socket directory in a sandbox (2026-10-29 entry); updated the 2026-10-16 fresh-database entry with the upgrade-test pattern.
- Task 1.2: Zod 4 object refine / `.partial()` `undefined` keys, and `\u` escapes turning into literal characters in tool input (2026-10-29 entry).
- Task 1.3: ON CONFLICT on a partial unique index needs the index predicate, and a test that holds a blocking transaction must release it in `finally` (2026-10-29 entry).
- Task 1.4: updated the 2026-10-16 cross-actor lock lesson (index line and detail file) with the barrier pattern (one-connection pools, `pg_blocking_pids`) and the note that only the ordering where the writer holds just its membership when the delete starts reproduces the old deadlock.
