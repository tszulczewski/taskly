# TASKS-004 — A delete that cannot reach the server keeps the dialog open with its error and the task listed

| Field | Value |
| --- | --- |
| Implementation | [`test/tasks-browser.integration.test.ts`](../../../test/tasks-browser.integration.test.ts) › `tasks in the browser (#15, sign-up closed)` › `keeps the delete dialog open with its error and the task listed when a delete cannot reach the server` |
| Category | TASKS |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-10-16-tasks-and-subtasks.md` — UI/UX "Optimistic updates" (delete waits for the server; delete refused: the dialog stays open with "Could not delete the task. Try again.") |
| Prerequisites | A new signed-in owner with the task "Fix the door"; the task's own routes are aborted for the failing part |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the delete dialog for "Fix the door" is open and the network drops requests to the task
- **When** the owner presses "Delete task"
- **Then** the dialog stays open with "Could not delete the task. Try again."
- **And** the row is still listed and still stored
- **And** once the network is back, "Delete task" removes it

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`, "…" → Delete on "Fix the door" | "Delete “Fix the door”?" is shown |
| 2 | Abort `**/api/tasks/*`; press "Delete task" | The dialog shows the delete error |
| 3 | Read the list and the DB | "Fix the door" listed and stored |
| 4 | Unroute, press "Delete task" | The dialog closes; the list and the DB are empty |

## Edge cases

- TASKS-002, TASKS-003 — add and edit refused
