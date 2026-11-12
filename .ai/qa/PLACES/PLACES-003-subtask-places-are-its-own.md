# PLACES-003 — A subtask's places are its own, never its task's

| Field | Value |
| --- | --- |
| Implementation | [`test/places-browser.integration.test.ts`](../../../test/places-browser.integration.test.ts) › `assigning tasks to places in the browser (#19, sign-up closed)` › `gives a subtask its own places, never its task's, also after a reload` |
| Category | PLACES |
| Priority | Medium |
| Type | UI |
| Source requirement | #19 AC9; D21; `.ai/specs/2026-11-03-order-markers-and-spaces.md` — API Contracts "Nothing is copied to or from subtasks" |
| Prerequisites | A signed-in owner; task A with subtask s1, and B |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** A expanded, showing s1
- **When** the owner ticks Łazienka on s1, then Strych on A
- **Then** s1 shows only Łazienka and A only Strych, also after a reload

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Expand A; "…" on s1 → "Places…" → Łazienka | s1: Łazienka; A: none |
| 2 | "…" on A → "Places…" → Strych | A: Strych; s1 unchanged; DB matches |
| 3 | Reload, expand A | Same tags |

## Edge cases

- `packages/core/src/places.integration.test.ts` › AC9
