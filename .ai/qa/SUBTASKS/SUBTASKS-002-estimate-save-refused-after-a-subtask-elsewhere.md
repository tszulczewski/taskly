# SUBTASKS-002 — An estimate save refused because the task got a subtask in another tab keeps the title and saves it on the next try

| Field | Value |
| --- | --- |
| Implementation | [`test/subtasks-browser.integration.test.ts`](../../../test/subtasks-browser.integration.test.ts) › `subtasks and the roll-up in the browser (#16, sign-up closed)` › `refuses an estimate save with the server's message when the task got a subtask in another tab, and saving again saves only the title` |
| Category | SUBTASKS |
| Priority | High |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-10-16-tasks-and-subtasks.md` — UI/UX "409 on an edit save" (the form shows "A task with subtasks takes its estimate from them", keeps the typed text, refetches; the amounts give way to the read-only sum; saving again sends the other fields without the estimate); Edge Cases "Estimate and title changed together while the task got a subtask in another tab" |
| Prerequisites | A new signed-in owner; the task "Shelf" at 200 zł added through quick add; the subtask "Brackets" (300–400 zł) created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the edit form of "Shelf" shows its amount fields and "Shelf" got the subtask "Brackets" in another tab
- **When** the owner renames it to "Wall shelf", changes Amount to 500 and presses Save
- **Then** the server's "A task with subtasks takes its estimate from them" is shown
- **And** the typed title stays; the amount fields are replaced by "Sum of subtasks: 300–400 zł" and "Change the amounts on the subtasks."
- **And** nothing is saved
- **And** Save again closes the form and saves only the title; the stored own figure stays 200 zł, never 500 zł

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`, add "Shelf" at 200 | The row shows 200 zł |
| 2 | "…" → Edit | The form shows Amount and up to |
| 3 | Create "Brackets" under "Shelf" (the other tab) | — |
| 4 | Retype the title and Amount 500, press Save | The 409 message; the read-only sum; the typed title kept; DB unchanged |
| 5 | Press Save | The form closes; "Wall shelf" shows 300–400 zł; stored title "Wall shelf", own figure 20 000 grosze |

## Edge cases

- `subtasks-browser` AC4 — the edit form of a task that already has subtasks
- EXPENSES-004 — the same 409 on "Add estimate"
