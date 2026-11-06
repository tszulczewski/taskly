# TASKS-001 — An edit saved for a task deleted in another tab shows the deleted notice and drops the row

| Field | Value |
| --- | --- |
| Implementation | [`test/tasks-browser.integration.test.ts`](../../../test/tasks-browser.integration.test.ts) › `tasks in the browser (#15, sign-up closed)` › `drops the row with the deleted notice when an edit is saved for a task deleted in another tab` |
| Category | TASKS |
| Priority | High |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-10-16-tasks-and-subtasks.md` — UI/UX "Task deleted elsewhere (404 on an edit save …)"; Edge Cases "Task deleted in another tab while it is being edited" |
| Prerequisites | A new signed-in owner; tasks "Fix the door" and "Hang the shelf" created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the owner has "Hang the shelf" open in its edit form and the task was deleted in another tab
- **When** they change the title and press Save
- **Then** the form closes and the row disappears after the list is refetched
- **And** "This task was deleted. The list has been refreshed." is shown
- **And** focus moves to the task list
- **And** only "Fix the door" is stored

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/` with the two tasks | Both rows are listed |
| 2 | "…" → Edit on "Hang the shelf" | The edit form opens with the title |
| 3 | Delete "Hang the shelf" through `deleteTask` (the other tab) | — |
| 4 | Type "Hang the long shelf", press Save | The form closes; the row is gone; the deleted notice is shown; focus is on `[data-slot="task-list"]` |
| 5 | Read the stored tasks | Only "Fix the door" |

## Edge cases

- SUBTASKS-001 — the same 404 on a subtask add
- EXPENSES-003 — the same 404 on "Add estimate"
- TASKS-003 — a save that fails at the network instead
