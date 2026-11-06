# EXPENSES-003 — Add estimate saved for an item deleted in another tab drops it with the deleted notice

| Field | Value |
| --- | --- |
| Implementation | [`test/unestimated-browser.integration.test.ts`](../../../test/unestimated-browser.integration.test.ts) › `what has no estimate, in the browser (#47, sign-up closed)` › `drops an item deleted in another tab with the deleted notice when its estimate is saved` |
| Category | EXPENSES |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-11-03-completion-and-future-expenses.md` — Edge Cases "An unestimated item was … deleted … in another tab" (404, message, refetch); UI/UX "Add estimate"; the message is spec E01's for a 404 on a save (UI/UX "Task deleted elsewhere") |
| Prerequisites | A new signed-in owner with "Door" and "Lamp", both without an estimate, created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the "Add estimate" form of "Lamp" is open and "Lamp" was deleted in another tab
- **When** the owner saves 100 zł
- **Then** the form and "Lamp" leave the list; only "Door" is listed
- **And** "This task was deleted. The list has been refreshed." is shown
- **And** the line reads "1 task without an estimate" and the total "No estimates yet"
- **And** only "Door" is stored

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`, open "2 tasks without an estimate" | Door, Lamp listed |
| 2 | "Add estimate for “Lamp”" | The form opens |
| 3 | Delete "Lamp" through `deleteTask` (the other tab) | — |
| 4 | Type 100, submit | The item and form are gone; the notice; the line and total as above |
| 5 | Read the DB | Only "Door" |

## Edge cases

- EXPENSES-004 — the item got subtasks instead (409)
- `unestimated-browser` AC4 — the happy path
