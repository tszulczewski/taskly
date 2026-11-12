# E02 Phase 2: places (#19)

- **Date:** 2026-11-12
- **Spec:** .ai/specs/2026-11-03-order-markers-and-spaces.md (Phase 2, Implementation Plan steps 6–13)
- **Outcome:** in progress
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

## Files changed

## Verification (commands run and results)

## Problems / open questions

## Lessons recorded (links into .ai/lessons.md)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 2: places

- [ ] 2.1 Migration 0003 places
- [ ] 2.2 Place rules
- [ ] 2.3 Places service
- [ ] 2.4 Task places
- [ ] 2.5 Routes
- [ ] 2.6 Picker loading and error
- [ ] 2.7 App wiring
- [ ] 2.8 Browser test and wrap-up
