# REORDER-001 — A keyboard move on the handle is shown at once and kept after a reload

| Field | Value |
| --- | --- |
| Implementation | [`test/reorder-browser.integration.test.ts`](../../../test/reorder-browser.integration.test.ts) › `reordering tasks in the browser (#17, sign-up closed)` › `moves a task with the keyboard on its handle and keeps the order after a reload` |
| Category | REORDER |
| Priority | High |
| Type | UI |
| Source requirement | #17 AC1, AC2, AC7 (keyboard); `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` — UI/UX Reorder, API Contracts `PUT /api/tasks/[taskId]/position` |
| Prerequisites | A signed-in owner with tasks A (subtasks s1, s2), B, C in that order, created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the list shows A, B, C
- **When** they focus the handle “Move “A”” and press Space, ArrowDown, Space
- **Then** the list shows B, A, C at once and the stored order is B, A, C
- **When** they reload
- **Then** the list still shows B, A, C

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/` | A, B, C |
| 2 | Focus the handle of A; Space | A is picked up (lifted) |
| 3 | ArrowDown; Space | B, A, C; one `PUT …/position` with `{ afterId: B, beforeId: C }` |
| 4 | Reload | B, A, C |

## Edge cases

- A click elsewhere while a keyboard move is in progress cancels it (the row goes back, nothing is saved); afterwards a mouse drag and every row menu work as usual (found in manual QA, 2026-11-13).
- `packages/core/src/tasks.integration.test.ts` › `moveTask (#17)` — first, middle and last places, completed siblings, two racing moves (C-1)
- `use-tasks.test.tsx` › `useMoveTask with useTaskViews (#17)` — two quick moves with the first answer late
