# COMPLETION-001 — A subtask added to a task completed in another tab is refused with a notice in the task's row

| Field | Value |
| --- | --- |
| Implementation | [`test/completion-browser.integration.test.ts`](../../../test/completion-browser.integration.test.ts) › `completing and reopening tasks in the browser (#20, sign-up closed)` › `refuses a subtask added to a task completed in another tab, closes the form and names the reason in the task's row` |
| Category | COMPLETION |
| Priority | High |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-11-03-completion-and-future-expenses.md` — UI/UX "Subtask add refused by Q3's 409" (the form closes because the refetched task is completed, and the row shows "Could not add “…”. “…” is completed."); Q3-1 |
| Prerequisites | A new signed-in owner; tasks A (with s1–s3), B and C created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the "New subtask" form of B is open and B was completed in another tab
- **When** the owner adds the subtask "Screws"
- **Then** the form closes
- **And** B's row shows "Could not add “Screws”. “B” is completed."
- **And** B is shown completed, last: A, C, B✓
- **And** B has no stored subtask

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/` | A, B, C |
| 2 | "…" → Add subtask on B | The form opens |
| 3 | Complete B through `setTaskCompleted` (the other tab) | — |
| 4 | Type "Screws", submit | The form closes; the row notice; order A, C, B✓ |
| 5 | Read the DB | No subtask under B |

## Edge cases

- SUBTASKS-001 — the task was deleted instead (404)
- `packages/core/src/tasks.integration.test.ts` Q3-1 and C-1 — the service rule and the race
