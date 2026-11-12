# E02 Phase 1: markers (#18)

- **Date:** 2026-11-12
- **Spec:** .ai/specs/2026-11-03-order-markers-and-spaces.md (Phase 1, Implementation Plan steps 1–5)
- **Outcome:** in progress
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

## Files changed

## Verification (commands run and results)

## Problems / open questions

## Lessons recorded (links into .ai/lessons.md)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: markers

- [x] 1.1 Migration 0002 task_markers — 321573c
- [x] 1.2 Views and PATCH — 0821b72
- [x] 1.3 List queue and marker replay — aa54213
- [x] 1.4 App wiring — fb4de48
- [ ] 1.5 Browser test and wrap-up
