# EXPENSES-001 — Future expenses that fail to load show an error with Try again while the task list keeps working

| Field | Value |
| --- | --- |
| Implementation | [`test/future-expenses-browser.integration.test.ts`](../../../test/future-expenses-browser.integration.test.ts) › `future expenses in the browser (#21, sign-up closed)` › `shows the future-expenses error with Try again while the task list keeps working, and Try again loads the total` |
| Category | EXPENSES |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-11-03-completion-and-future-expenses.md` — UI/UX "Future expenses" (a failed load shows the component's error with "Try again"; the task list is unaffected); Edge Cases "Future-expenses request fails" ("Could not load future expenses." with "Try again"; the list works) |
| Prerequisites | A new signed-in owner with "Tiles" at 1 000–2 000 zł; the future-expenses route is aborted at the network for the failing part |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the future-expenses request fails
- **When** the owner opens `/`, adds "Paint" at 500 zł, then the network is back and they press "Try again"
- **Then** the summary shows "Could not load future expenses." and "Try again" while "Tiles" is listed
- **And** the add works and the summary still shows the error
- **And** "Try again" loads "1 500–2 500 zł" and the error is gone

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Abort `**/api/lists/*/future-expenses`, open `/` | The summary's error; "Tiles" listed |
| 2 | Add "Paint" at 500 | Listed after "Tiles"; the summary goes through loading and shows the error again |
| 3 | Unroute, press "Try again" | The total reads 1 500–2 500 zł |

## Edge cases

- `tasks-browser` renewal test — the task list's own error and Try again
- EXPENSES-002 — the total's boundary at 0 zł
