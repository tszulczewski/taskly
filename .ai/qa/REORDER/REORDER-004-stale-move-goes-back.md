# REORDER-004 — A move picked on a stale order is refused and put back with the row's message

| Field | Value |
| --- | --- |
| Implementation | [`test/reorder-browser.integration.test.ts`](../../../test/reorder-browser.integration.test.ts) › `reordering tasks in the browser (#17, sign-up closed)` › `puts a stale move back with the row's message when the order changed elsewhere` |
| Category | REORDER |
| Priority | High |
| Type | UI |
| Source requirement | #17 AC3; `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` — acceptance M-1, UI/UX Pending changes (s04.24) |
| Prerequisites | As REORDER-001; after the page loads, C is moved between A and B through the core service (another tab) |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the page shows A, B, C while the server holds A, C, B
- **When** they choose “…” → “Move down” on A
- **Then** the server refuses it (409), A's row says “Could not move “A”. It is back where it was.” and the list shows the server's A, C, B

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`; move C between A and B elsewhere | Page still shows A, B, C |
| 2 | “…” on A → Move down | Message in A's row; list A, C, B; stored A, C, B |

## Edge cases

- `task-list-screen.test.tsx` › `TaskListScreen reorder (#17)` — a 404 move (deleted elsewhere), and no reordering while a quick add is saving (M-3)
