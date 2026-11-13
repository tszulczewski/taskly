# REORDER-003 — A completed row has no handle and no move items

| Field | Value |
| --- | --- |
| Implementation | [`test/reorder-browser.integration.test.ts`](../../../test/reorder-browser.integration.test.ts) › `reordering tasks in the browser (#17, sign-up closed)` › `shows no handle and no move items on a completed row` |
| Category | REORDER |
| Priority | Medium |
| Type | UI |
| Source requirement | #17 AC8; `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` — UI/UX Reorder (s04.29) |
| Prerequisites | As REORDER-001, with B completed through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** B is completed
- **When** the list loads
- **Then** it shows A, C, B; A and C have handles, B has none
- **When** they open “…” on B
- **Then** there is no “Move up” or “Move down”

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/` | A, C, B; two handles |
| 2 | “…” on B | No Move items |

## Edge cases

- `packages/core/src/tasks.integration.test.ts` › `moveTask (#17)` — a move of a completed row is refused with 409
