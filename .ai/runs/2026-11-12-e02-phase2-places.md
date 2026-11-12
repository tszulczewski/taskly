# E02 Phase 2: places (#19)

- **Date:** 2026-11-12
- **Spec:** .ai/specs/2026-11-03-order-markers-and-spaces.md (Phase 2, Implementation Plan steps 6–13)
- **Outcome:** complete (Phase 2 implemented; gate green; PR #70 ready for review)
- **Source doc:** .ai/specs/2026-11-03-order-markers-and-spaces.md
- **Branch:** `cez/dcece926` (cezar worktree), pushed as `feat/e02-places`; stacked on `feat/e02-markers` (#69)
- **Engine:** om-auto-create-pr (steps: 8, --loop: no)

## Goal

The owner assigns a task or a subtask to several of their own places (#19 AC1–AC10, D09, D21, D26). Each user starts with eight Polish-named places, created once on first use; they can create, rename, recolour and delete places (at most 20, names unique ignoring case). Only places of the list's owner can be assigned (Q3). Ticks show at once (the list queue and the replay from Phase 1); the picker has loading and error states (P-1).

## Scope

- `packages/db`: migration `0003` (`places`, `task_places`, `place_owners`), no data step, no backfill.
- `packages/core`: `place-rules.ts` (isomorphic: name and colour rules, `PLACE_LIMIT`, `PREDEFINED_PLACES`, messages, `placeViewSchema`); `places.ts` (server-only: `ensurePlaces`, `listPlaces`, `createPlace`, `updatePlace`, `deletePlace`); `setTaskPlace` and `places` on the task views in `tasks.ts`.
- `packages/app`: six route handlers (three files); `use-places.ts`; `useTogglePlace` in the existing list queue with a `place` kind in the existing replay; the pure patch of cached task views after rename/recolour/delete; `places` on `TaskList`.
- `packages/ui`: `PlaceOptions` / `PlacePicker` gain `status` and `onRetry` (skeleton, `ErrorState`), stories and MDX.
- Browser test `test/places-browser.integration.test.ts`, HTTP test `test/places-http.integration.test.ts`; `E02OrderMarkersPlaces.mdx` corrected (limit 20, Q3); status words for #19.

**Non-goals:** reorder (#17, Phase 3), moving the spec to `implemented/` (Phase 3), filtering by place, reordering places, SSE.

## Implementation Plan

### Phase 2: places

1. Migration `0003` (`places`): schema, generate, review; schema and migration integration tests; down SQL below.
2. Rules (isomorphic): `place-rules.ts`, exported from `@taskly/core`; unit tests.
3. Places service: `places.ts` with `ensurePlaces`, the owner-row lock, limit, append key, colour, 23505 → 409; unit (fake pg client) and integration tests (AC1, AC4–AC6, AC8, AC10, S-1, S-2, C-1, 404s).
4. Task places: `setTaskPlace`, views gain `places`; integration (AC2, AC3, AC7, AC9, Q3-1, two owners, viewer 403, idempotency, delete vs assign).
5. Routes: `api/places`, `api/places/[placeId]`, `api/tasks/[taskId]/places/[placeId]`; route unit tests; `test/places-http.integration.test.ts`.
6. Picker loading and error (design system): `status`, `onRetry`, stories, MDX, component tests.
7. App wiring: `use-places.ts`, `useTogglePlace` + `place` replay kind, `places` on `TaskList`, create-and-tick, 409 → name field, patch of cached views, `toTaskItem` places; unit tests at 100%.
8. Browser test and wrap-up: `test/places-browser.integration.test.ts`, epic MDX corrections, status words, full gate, manual check.

## Risks

- Schema change (risk-high): additive only (three new tables). Rollback = revert the PR + the down SQL; places and assignments entered meanwhile are lost.
- First entity owned by a user rather than a list: the assign rule (place of the list's owner, `EXISTS`) lives in one service function and is tested on its denied paths.
- The replay and the list queue are Phase 1's; the `place` kind extends them (no second queue).

## Down SQL (0003)

```sql
BEGIN;
DROP TABLE "task_places";
DROP TABLE "places";
DROP TABLE "place_owners";
DELETE FROM "drizzle"."__drizzle_migrations" WHERE "hash" = 'd9ee75d374d0d418c2e0c7a50c80a5498fd1923cacdfb377bb0c45c8c13325dd'; -- sha256 of 0003_places.sql
COMMIT;
```

Tried once (automated, Testcontainers, `migrations.integration.test.ts`, "migration 0003 … rolls back with the down SQL"): every task row survives, the three tables are gone, and the migrator applies `0003` again. The 0002 down-SQL test now migrates only up to `0002`: the migrator applies only entries newer than the last one recorded, so a recorded `0003` would keep a rolled-back `0002` from being applied again (roll back in reverse order).

## Steps taken

- 2.1–2.6 by task dcece926 (cezar child), interrupted twice by the provider usage limit; a second child (8aa409be) redid 2.4 in parallel and stood down unpushed (its commits are not used).
- 2.7–2.8 finished by the root task (bb2b5b6b) from dcece926's unpushed WIP `7f9938b`: unit tests for the place replay, the cache patches, the places hooks and the screen wiring; the tick's place-404 now reads the places cache at error time (a render closure lagged a delete in the same tab, found by the P9 screen test).
- Browser test `test/places-browser.integration.test.ts` (5 cases, QA PLACES-001..005); two older browser tests adjusted for the new places GET and the "Places…" menu item.
- Design-system status words for #19 (E02 epic page, Screens, What is missing). The limit of 20 and the Q3 answer were already in the epic page.

## Files changed

`packages/db` (schema, migration 0003, tests); `packages/core` (`place-rules.ts`, `places.ts`, `setTaskPlace` and `places` on the views in `tasks.ts`, schemas, tests); `packages/app` (three route files with tests, `use-places.ts`, `use-tasks.ts`, `task-items.ts`, `task-list-screen.tsx`, `query-keys.ts`, tests); `packages/ui` (`PlacePicker` status/onRetry, stories, MDX); `test/` (places HTTP and browser tests, two adjusted); `.ai/qa/PLACES/`.

## Verification (commands run and results)

Root worktree, 2026-11-12, HEAD before the last two test fixes and rerun after them:

- `npm run format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`: pass.
- `npm test`: 82 files, 1201 tests passed; coverage 100% (2007/2007 statements, 1236/1236 branches, 695/695 functions, 1763/1763 lines).
- `npm run build`: pass. `npm run audit`: pass (4 moderate, the existing esbuild-kit chain).
- `npm run test:integration` (Testcontainers, `TMPDIR=/tmp/bb2b`): 271 passed, 2 failed (`tasks-browser` renewal: the new places GET renewed the session; `subtasks-browser` AC4: the menu now has "Places…"). Both fixed; the two files rerun: 20/20 passed. Places browser test 5/5.
- Down SQL tried once by the automated migration test (above).

## Problems / open questions

- Two cezar children hit the provider usage limit; the root took Phase 2 over to avoid two writers on `feat/e02-places`.
- agent-browser's Chrome fails to start when `TMPDIR` is long (the cezar per-task temp dir): "Socket path too long". Run integration tests with a short `TMPDIR`.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-12 — Chrome socket path and `TMPDIR`.
- 2026-11-12 — Hook-level `onError` reading another query's data from a render closure.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 2: places

- [x] 2.1 Migration 0003 places
- [x] 2.2 Place rules
- [x] 2.3 Places service
- [x] 2.4 Task places
- [x] 2.5 Routes
- [x] 2.6 Picker loading and error
- [x] 2.7 App wiring
- [x] 2.8 Browser test and wrap-up
