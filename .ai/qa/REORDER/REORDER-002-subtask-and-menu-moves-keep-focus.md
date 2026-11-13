# REORDER-002 — A subtask moves within its task; “Move up” keeps focus on the moved row

| Field | Value |
| --- | --- |
| Implementation | [`test/reorder-browser.integration.test.ts`](../../../test/reorder-browser.integration.test.ts) › `reordering tasks in the browser (#17, sign-up closed)` › `moves a subtask within its task and a task from the menu, focus staying on the row` |
| Category | REORDER |
| Priority | High |
| Type | UI |
| Source requirement | #17 AC4, AC6; `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` — UI/UX Reorder (s04.23) |
| Prerequisites | As REORDER-001 |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** A is expanded with s1, s2
- **When** they choose “…” → “Move up” on s2
- **Then** A's subtasks show s2, s1, and the tasks keep A, B, C
- **When** they choose “…” → “Move up” on C
- **Then** the list shows A, C, B and focus is on C's “…”
- **When** they reload
- **Then** both orders are kept

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Expand A | s1, s2 |
| 2 | “…” on s2 → Move up | s2, s1; stored the same; tasks unchanged |
| 3 | “…” on C → Move up | A, C, B; focus on “More actions for “C”” |
| 4 | Reload, expand A | A, C, B; s2, s1 |

## Edge cases

- `tasks.test.tsx` › `moves a subtask only among the subtasks of its task`
