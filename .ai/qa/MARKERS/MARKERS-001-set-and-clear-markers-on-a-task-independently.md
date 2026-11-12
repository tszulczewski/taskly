# MARKERS-001 — Important and urgent are set and cleared on a task independently and kept after a reload

| Field | Value |
| --- | --- |
| Implementation | [`test/markers-browser.integration.test.ts`](../../../test/markers-browser.integration.test.ts) › `marking tasks important and urgent in the browser (#18, sign-up closed)` › `sets important alone, then urgent too, clears urgent keeping important, and keeps them after a reload` |
| Category | MARKERS |
| Priority | High |
| Type | UI |
| Source requirement | Issue #18 AC1, AC2, AC3; `.ai/specs/2026-11-03-order-markers-and-spaces.md` — UI/UX "Markers (#18)", API Contracts "PATCH /api/tasks/[taskId]" (only the keys sent are written) |
| Prerequisites | A new signed-in owner; tasks A (with s1, s2) and B created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** task B has no markers
- **When** the owner chooses "…" → Important on B
- **Then** B's meta line shows "Important" and B is stored important, not urgent (AC1)
- **When** the owner then chooses "…" → Urgent on B
- **Then** B shows "Important" and "Urgent" and both are stored (AC2)
- **When** the owner chooses "…" → Urgent again (clears it)
- **Then** B shows only "Important" and important stays stored (AC3)
- **And** after a reload B still shows "Important"; A shows no marker

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/` | A, B; no marker words |
| 2 | "…" on B → Important | "Important" on B at once; one PATCH; DB B = important |
| 3 | "…" on B → Urgent | "Important Urgent" on B; two PATCHes; DB B = both |
| 4 | "…" on B → Urgent | "Important" on B; three PATCHes; DB B = important only |
| 5 | Reload | B shows "Important"; A none |

## Edge cases

- MARKERS-002 — a subtask's markers are its own (AC4)
- MARKERS-003 — a failed save goes back
- MARKERS-004 — two quick toggles with the first answer held back
- `packages/core/src/tasks.integration.test.ts` › `markers (#18)` — viewer 403, non-member and unknown or malformed id 404, a concurrent pair of PATCHes
- `test/tasks-http.integration.test.ts` — a non-boolean marker answers 400
