# E02 Phase 1: markers (#18)

- **Date:** 2026-11-12
- **Spec:** .ai/specs/2026-11-03-order-markers-and-spaces.md (Phase 1, Implementation Plan steps 1–5)
- **Outcome:** success (gate green; review and QA follow on the PR)
- **Source doc:** .ai/specs/2026-11-03-order-markers-and-spaces.md
- **Branch:** `cez/dd734265` (cezar worktree), pushed as `feat/e02-markers`
- **Engine:** om-auto-create-pr (steps: 5, --loop: no)

## Goal

The owner can mark a task or a subtask important and/or urgent, independently, with no inheritance between a task and its subtasks (#18 AC1–AC4, D07, D21). Markers show at once and go back with "Could not save “…”. It is back as it was." when refused.

## Scope

- `packages/db`: migration `0002` (`tasks.important`, `tasks.urgent`, `boolean NOT NULL DEFAULT false`).
- `packages/core`: views gain `important`, `urgent`; `taskFields` and `updateTask` write them (only the keys sent).
- `packages/app`: `useToggleMarker` in the existing list queue (`scope: tasks:<listId>`, already shared by E01 add/edit/delete and E03 completion); a `marker` kind in the existing `replayChanges` / `useTaskViews`; `onToggleMarker` on `TaskList`; `toTaskItem` maps the markers; the row message on failure.
- Browser test `test/markers-browser.integration.test.ts`; design-system status words for #18.

**Non-goals:** places (#19, Phase 2), reorder (#17, Phase 3), moving the spec to `implemented/` (Phase 3), filtering or sorting by marker. No new design-system component (the UI already ships `Markers` and the menu items).

## Implementation Plan

### Phase 1: markers

1. Migration `0002` (`task_markers`), schema and migration tests, down SQL below.
2. Views and `PATCH`: `viewColumns`, `subtaskView`, `subtaskViewSchema`, `taskFields`, `updateTask`. Unit + integration (AC1–AC4, viewer 403, non-member 404).
3. List queue and replay: the queue already exists (E03 Phase 1, `listQueue`); add the `marker` kind to `PendingChange` / `replayChanges` and `queryKeys.taskChange`. Unit tests with a real `QueryClient` and held responses.
4. App wiring: `useToggleMarker` (hook-level callbacks), `onToggleMarker` on `TaskList`, `toTaskItem` markers, row message.
5. Browser test and wrap-up; design-system status words; full gate; manual check.

## Risks

- Schema change (risk-high): additive only. Rollback = revert the PR + the down SQL; markers set meanwhile are lost.
- Quick adds and every other task change already share one queue (E03); nothing changes there, but E01/E03 browser tests are rerun.

## Down SQL (0002)

```sql
ALTER TABLE "tasks" DROP COLUMN "important";
ALTER TABLE "tasks" DROP COLUMN "urgent";
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "hash" = 'bd9fcd6b0cd1c2b45eeaa788c54bb5a68e073c82f834fd9517efaac00210b900'; -- sha256 of 0002_task_markers.sql
```

## Steps taken

1. Schema: `tasks.important`, `tasks.urgent` (`boolean NOT NULL DEFAULT false`); `npm run generate -w @taskly/db -- --name=task_markers`. The generated SQL is two `ADD COLUMN`s and needs no hand edit.
2. Core: the views gain the markers; `taskFields` takes them, `createTaskInput` does not (new tasks start unmarked); `updateTask` writes only the keys it is sent, completed rows included.
3. App: E03 had already shipped the list queue (`listQueue`, `scope: tasks:<listId>`) for add, edit, delete and completion, and the generic `replayChanges` / `useTaskViews`. I extended them with a `marker` kind (`applyMarker`, `queryKeys.taskChange(…, "marker")`) and duplicated neither. `settle` is split: markers refetch the list but not the future expenses (spec, Invalidation).
4. Screen: `onToggleMarker` on `TaskList`; a failure gets the row message "Could not save “…”. It is back as it was." and a 404 the deleted notice. The screen and completion share one `onError` handler.
5. Browser test `test/markers-browser.integration.test.ts` (MARKERS-001…004, scenarios in `.ai/qa/MARKERS/`), an HTTP case in `tasks-http`, and design-system status words for #18 (E02 epic, What is missing, Screens).
6. Down SQL tried by hand on a throwaway `postgres:16-alpine` (drop → re-migrate), and automated in `migrations.integration.test.ts`.

## Files changed

- `packages/db`: `src/schema.ts`, `migrations/0002_task_markers.sql`, `migrations/meta/*`, schema and migration tests.
- `packages/core`: `src/schemas.ts`, `src/tasks.ts`, unit and integration tests, fixtures of `futureExpenses*` tests.
- `packages/app`: `lib/query-keys.ts`, `components/tasks/{task-items,use-tasks,task-list-screen}.ts(x)` and tests, fixtures in route and api tests.
- `test/markers-browser.integration.test.ts` (new), `test/tasks-http.integration.test.ts`.
- `.ai/qa/MARKERS/` (4 scenarios), `packages/ui/.storybook/docs/**` (status words only).

## Verification (commands run and results)

All run in this worktree on 2026-11-12:

- `npm run format:check`: passed. `npm run lint`: passed. `npm run check:agents`: passed (29 routed paths).
- `npm run test:env-scripts`: all checks passed. `npm run typecheck`: passed (all workspaces).
- `npm test`: 76 files, 1094 tests passed; coverage 100% statements (1750/1750), branches (1127/1127), functions (596/596), lines (1543/1543).
- `npm run build`: passed. `npm run audit`: passed (4 moderate advisories; the gate fails only on high).
- `npm run test:integration` (Testcontainers, `TMPDIR=/tmp/claude-1000/t`, `AGENT_BROWSER_SOCKET_DIR=/tmp/claude-1000/ab`): 20 files, 233 tests passed, exit 0. This includes E01's `tasks-browser` and `subtasks-browser` and E03's `completion-browser`, rerun because quick adds share the queue. The down-migration test was added afterwards and run alone: 3/3 passed.
- `npm run build-storybook -w @taskly/ui`: built (MDX status words).

## Problems / open questions

- agent-browser cannot answer a route with a status code, so MARKERS-003 aborts the request to simulate the failure; a 500 is covered by the screen unit test.
- `markTask` has no `hasTask` guard, unlike completion: a marker comes from a menu that is mounted only for a row in the current views, so the guard could never run (no dead code).

## Lessons recorded (links into .ai/lessons.md)

- None new; lessons 2026-11-04 (list queue timing), 2026-10-29 (`generate --name=`), 2026-11-05 (short `TMPDIR`, `npm ci` in the worktree) were applied.

## Progress

PR: #69

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: markers

- [x] 1.1 Migration 0002 task_markers — 321573c
- [x] 1.2 Views and PATCH — 0821b72
- [x] 1.3 List queue and marker replay — aa54213
- [x] 1.4 App wiring — fb4de48
- [x] 1.5 Browser test and wrap-up — ee8dc03, 1a5c5bf
