# E02 Phase 3: reorder tasks and subtasks (#17)

- **Date:** 2026-11-13
- **Spec:** .ai/specs/implemented/2026-11-03-order-markers-and-spaces.md (Phase 3, steps 14–18)
- **Outcome:** success (PR #72 ready; review and maintainer QA pending)

## Goal

Implement #17 (E02-S01) as the third stacked PR of E02, on top of #70 (places), itself on #69 (markers): the `moveTask` service under the list lock, `PUT /api/tasks/[taskId]/position`, the app wiring in the list queue with the `move` kind in the replay, no reordering while a quick add is saving (P1, P10), a browser test, QA scenarios, status words, and the spec moved to `implemented/`.

## Steps taken

1. Step 14–15 (core): `movePosition` (pure, `move.ts`) takes the moved row's new neighbours among its open siblings and gives `conflict`, `stay` or the one new key, keyed between the nearest stored siblings of any status so it never equals a completed sibling's key. `moveTask` parses `moveTaskInput`, takes `requireTaskRole(..., { withListLock: true })`, refuses a completed row (`TASK_COMPLETED_MESSAGE`), reads the siblings, and writes one `UPDATE` (or none for a stay). `LIST_CHANGED_MESSAGE` for stale neighbours. Stub removed from `stubs.test.ts`. Commit 106b5dc.
2. Step 16 (route): `PUT /api/tasks/[taskId]/position` through `apiHandler` with `taskViewSchema`; route tests for 200, 400, 401, 403, 404 and both 409s.
3. Step 17 (app): `applyMove` (the same `movePosition` over the saved rows, then `sortTasks`), the `move` kind in `PendingChange`, `queryKeys.taskChange(listId, "move")`, `useMoveTask` in the list queue (`writeTasks`/`putTask`, `settleTasks`), and in `TaskListScreen` one `onMove` for both levels, left out while any task or subtask has a temporary id (P1, P10). The s04.24 message `moveFailed`, a 404 handled as deleted elsewhere.
4. Design-system fix found by the screen tests: `TaskList` and `TaskRow` rendered `SortableGroup` only with `onMove`, so turning moves off while an add was saving changed the element type and remounted the list, collapsing expanded tasks (a subtask add then lost its own pending row from view). `SortableGroup` now stays mounted with an optional `onMove` (no sensors, no items without it). Regression test in `tasks.test.tsx` (fails on the old code). The spec says the pause "needs no design-system change"; that remark was wrong in practice, the requirement itself is unchanged. Commit b796742.
5. Step 18: `test/reorder-browser.integration.test.ts` (port 3214): AC1/AC2/AC7 by keyboard on the handle plus reload, AC4 and AC6 with focus on the row's "…", AC8, and a stale move (AC3, M-1) refused and put back with the message. `test/helpers.ts` gains `focus` and `press`. QA scenarios `.ai/qa/REORDER/REORDER-001..004`. Status words in `Screens.mdx`, `WhatIsMissing.mdx`, `E02OrderMarkersPlaces.mdx`; backlog note; spec moved to `specs/implemented/` with its path updated in the MARKERS and PLACES QA files.

## Files changed

- `packages/core/src/move.ts`, `move.test.ts`, `schemas.ts`, `tasks.ts`, `tasks.test.ts`, `tasks.integration.test.ts`, `stubs.test.ts`, `barrels.test.ts`, `index.ts`
- `packages/app/app/api/tasks/[taskId]/position/route.ts`, `route.test.ts`
- `packages/app/components/tasks/task-items.ts`, `use-tasks.ts`, `task-list-screen.tsx` and their tests; `packages/app/lib/query-keys.ts`
- `packages/ui/src/product/tasks/sortable.tsx`, `task-list.tsx`, `task-row.tsx`, `tasks.test.tsx`
- `test/reorder-browser.integration.test.ts`, `test/helpers.ts`, `.ai/qa/REORDER/*`, `.ai/qa/MARKERS/*`, `.ai/qa/PLACES/*` (spec path)
- `packages/ui/.storybook/docs/...` (three MDX pages), `.ai/specs/backlog.md`, the spec (moved, status line)

## Verification (commands run and results)

- `npm test`: 84 files, 1243 tests passed, coverage 100% (statements, branches, functions, lines).
- `npm run typecheck`, `npm run lint`, `npm run format:check`: clean.
- `check:agents`, `test:env-scripts`, `build`, `audit` (4 moderate, below high), `packages/ui` `check:tokens`, `test:storybook` (932), `build-storybook`: pass.
- CI run 43387940996 (first integration run, Docker unavailable locally): 286/288 passed, `reorder-browser` all green. Two test bugs fixed: the C-completed key check compared subtask keys with task keys (keys are unique per sibling group only), and `subtasks-browser` AC4's menu list lacked "Move up" / "Move down", which subtasks now have.
- CI run on a2cf7bb: all six jobs green (integration 7m12s, design system, unit 100%, lint/typecheck, build, audit).

## Problems / open questions

- Open: an independent code review (author-account review from a run that did not write the change) and maintainer QA with a manual phone-viewport check of long press and pointer drag (AC7).
- Docker is not available in this session (no `/var/run/docker.sock`) and no local PostgreSQL listens on 5432, so `npm run test:integration` (Testcontainers) could not run here yet.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-13 — conditional wrappers remount their subtree (`.ai/lessons.md`).
