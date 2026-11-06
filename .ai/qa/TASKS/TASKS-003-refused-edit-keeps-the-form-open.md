# TASKS-003 — A save that cannot reach the server keeps the edit form open and the row unchanged

| Field | Value |
| --- | --- |
| Implementation | [`test/tasks-browser.integration.test.ts`](../../../test/tasks-browser.integration.test.ts) › `tasks in the browser (#15, sign-up closed)` › `keeps the edit form open with the typed text and the row unchanged when a save cannot reach the server` |
| Category | TASKS |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-10-16-tasks-and-subtasks.md` — UI/UX "Optimistic updates" (edit waits for the server; edit refused: the form stays open with "Could not save the task. Try again."; typed text kept) |
| Prerequisites | A new signed-in owner with the task "Fix the door"; the task's own routes are aborted for the failing part |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the owner has "Fix the door" open in its edit form and the network drops requests to the task
- **When** they rename it to "Fix the front door" and press Save
- **Then** "Could not save the task. Try again." is shown
- **And** the form stays open with the typed title
- **And** the stored title is unchanged
- **And** once the network is back, Save renames the task

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`, "…" → Edit on "Fix the door" | The edit form opens |
| 2 | Abort `**/api/tasks/*`; retype the title, press Save | The save error is shown in the open form |
| 3 | Read the form and the DB | Title field "Fix the front door"; stored "Fix the door" |
| 4 | Unroute, press Save | The form closes; the row reads "Fix the front door", also in the DB |

## Edge cases

- TASKS-001 — the save answered 404 instead
- TASKS-002, TASKS-004 — add and delete refused
