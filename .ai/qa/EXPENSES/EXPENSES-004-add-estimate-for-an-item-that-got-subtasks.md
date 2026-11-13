# EXPENSES-004 — Add estimate saved for an item that got subtasks in another tab lists its subtasks instead and stores no figure

| Field | Value |
| --- | --- |
| Implementation | [`test/unestimated-browser.integration.test.ts`](../../../test/unestimated-browser.integration.test.ts) › `what has no estimate, in the browser (#47, sign-up closed)` › `lists the subtasks instead of an item that got subtasks in another tab, and stores no figure on it` |
| Category | EXPENSES |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-11-03-completion-and-future-expenses.md` — Edge Cases "An unestimated item was … given subtasks in another tab" (409, the server's message, refetch, and its subtasks are listed instead); UI/UX "Add estimate" (on a 409/404 the form shows the server's message and both queries refetch); API Contracts "Add estimate" |
| Prerequisites | A new signed-in owner with "Door" and "Lamp", both without an estimate; the subtask "Handle" created under "Door" through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the "Add estimate" form of "Door" is open and "Door" got the subtask "Handle" in another tab
- **When** the owner saves 100 zł
- **Then** the form closes and "Handle · Door" is listed in place of "Door", then "Lamp"
- **And** the line reads "1 task and 1 subtask without an estimate" and the total "No estimates yet"
- **And** "Door" stores no figure
- **And** the server's message "A task with subtasks takes its estimate from them" is shown in an alert that survives the refetch and goes away with the next change

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`, open "2 tasks without an estimate" | Door, Lamp listed |
| 2 | "Add estimate for “Door”" | The form opens |
| 3 | Create "Handle" under "Door" (the other tab) | — |
| 4 | Type 100, submit | The form closes; "Handle · Door", "Lamp" listed; the line and total as above; the message is shown in an alert |
| 5 | Read the DB | "Door" min and max null |

## Edge cases

- EXPENSES-003 — the item was deleted instead (404)
- SUBTASKS-002 — the same 409 in the task's edit form, where the message is shown

## Finding

Fixed in #66: after the 409 the refetch removed "Door" and its form, and the form's `formError` with it. `addEstimate` now also keeps the server's message in a screen-level alert (`estimateRefused`, `packages/app/components/tasks/task-list-screen.tsx`) until the next change.
