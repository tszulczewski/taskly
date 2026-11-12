# TASKS-002 — An add that cannot reach the server removes the temporary row and keeps the typed task

| Field | Value |
| --- | --- |
| Implementation | [`test/tasks-browser.integration.test.ts`](../../../test/tasks-browser.integration.test.ts) › `tasks in the browser (#15, sign-up closed)` › `removes the temporary row and keeps the typed task when an add cannot reach the server` |
| Category | TASKS |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-10-16-tasks-and-subtasks.md` — UI/UX "Optimistic updates" (add refused: the temporary row goes and "Could not add the task. Try again." appears above the form; typed text is kept); Edge Cases "Network failure on an optimistic action" |
| Prerequisites | A new signed-in owner with the task "Fix the door"; the list's task route is aborted at the network for the failing part |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the list holds "Fix the door" and the network drops requests to the list's tasks
- **When** the owner adds "Hang the shelf" at 120 zł
- **Then** "Could not add the task. Try again." is shown
- **And** the temporary row is gone and the list shows only "Fix the door"
- **And** the title and amount stay in quick add
- **And** nothing is stored
- **And** once the network is back, Add saves the kept text once, as 120 zł

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/` | "Fix the door" is listed |
| 2 | Abort `**/api/lists/*/tasks`; type "Hang the shelf", Amount 120, press Add | The add error is shown; no "Hang the shelf" row |
| 3 | Read quick add and the DB | "Hang the shelf" / "120" kept; only "Fix the door" stored |
| 4 | Unroute, press Add again | The row is saved; the error is gone; stored as 12 000–12 000 grosze |

## Edge cases

- TASKS-003 — an edit refused
- TASKS-004 — a delete refused
- TASKS-005 — an add refused by validation before any request
