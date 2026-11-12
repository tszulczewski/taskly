# MARKERS-002 — A subtask's markers and its task's markers are independent, also after a reload

| Field | Value |
| --- | --- |
| Implementation | [`test/markers-browser.integration.test.ts`](../../../test/markers-browser.integration.test.ts) › `marking tasks important and urgent in the browser (#18, sign-up closed)` › `marks a subtask without marking its task, and a task without marking its subtasks, also after a reload` |
| Category | MARKERS |
| Priority | High |
| Type | UI |
| Source requirement | Issue #18 AC4; D21; decision record `2026-11-03-e02-e03-epic-alignment.md` decision 7 (no inheritance); `.ai/specs/2026-11-03-order-markers-and-spaces.md` — UI/UX "Markers (#18)" ("A subtask's markers are its own") |
| Prerequisites | A new signed-in owner; tasks A (with s1, s2) and B created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** task A with subtasks s1 and s2, none marked
- **When** the owner marks s1 important
- **Then** only s1 shows "Important"; A and s2 show nothing
- **When** the owner marks A urgent
- **Then** A shows "Urgent", s1 still shows only "Important", s2 nothing
- **And** the stored markers are A urgent, s1 important, s2 and B none, also after a reload

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`, open A | s1, s2 shown; no marker words |
| 2 | "…" on s1 → Important | "Important" on s1 only |
| 3 | "…" on A → Urgent | "Urgent" on A; s1 "Important"; s2 none |
| 4 | Read the DB | A [false, true], s1 [true, false], s2 and B [false, false] |
| 5 | Reload, open A | The same words |

## Edge cases

- MARKERS-001 — a task's two markers are independent
- `packages/core/src/tasks.integration.test.ts` › `markers (#18)` › AC4 at the service level
