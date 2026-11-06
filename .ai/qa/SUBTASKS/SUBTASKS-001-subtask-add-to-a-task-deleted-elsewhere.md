# SUBTASKS-001 — A subtask added to a task deleted in another tab shows the deleted notice and drops the task

| Field | Value |
| --- | --- |
| Implementation | [`test/subtasks-browser.integration.test.ts`](../../../test/subtasks-browser.integration.test.ts) › `subtasks and the roll-up in the browser (#16, sign-up closed)` › `drops the task with the deleted notice when a subtask is added to a task deleted in another tab` |
| Category | SUBTASKS |
| Priority | High |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-10-16-tasks-and-subtasks.md` — Edge Cases "Parent deleted while a subtask is being added (two tabs)" (the add gets 404: "This task was deleted. The list has been refreshed."); UI/UX "Task deleted elsewhere" |
| Prerequisites | A new signed-in owner; tasks "Fix the door" and "Walls" added through quick add |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the "New subtask" form of "Walls" is open and "Walls" was deleted in another tab
- **When** the owner adds the subtask "Plaster" at 200 zł
- **Then** "Walls" disappears with its form
- **And** "This task was deleted. The list has been refreshed." is shown
- **And** focus moves to the task list
- **And** only "Fix the door" is stored

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`, add the two tasks | Both rows are listed |
| 2 | "…" → Add subtask on "Walls" | The "New subtask" form opens |
| 3 | Delete "Walls" through `deleteTask` (the other tab) | — |
| 4 | Fill "Plaster", 200, submit | "Walls" and its form are gone; the notice is shown; focus is on the task list |
| 5 | Read the DB | Only "Fix the door" |

## Edge cases

- TASKS-001 — the same 404 on an edit save
- COMPLETION-001 — the task was completed instead (409)
