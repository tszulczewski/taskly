# TASKS-005 — Malformed or too large amounts are refused under the field that holds them, and nothing is sent

| Field | Value |
| --- | --- |
| Implementation | [`test/tasks-browser.integration.test.ts`](../../../test/tasks-browser.integration.test.ts) › `tasks in the browser (#15, sign-up closed)` › `refuses malformed or too large amounts with a message under the field that holds them, and sends nothing` |
| Category | TASKS |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-10-16-tasks-and-subtasks.md` — Edge Cases (`-5`, `1e3`, `12.345` get "Enter an amount like 1 500,50" under the field that holds them; an amount over 10 000 000 PLN is a field error); UI/UX "Validation" |
| Prerequisites | A new signed-in owner with an empty list |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** quick add with the title "Tiles"
- **When** the owner submits Amount `-5`, `1e3`, `12.345`, then `10 000 000,01`, then Amount 100 with up to `1e3`
- **Then** each of the first three shows "Enter an amount like 1 500,50" under Amount (marked invalid), none under up to
- **And** the amount over the cap shows a field error under Amount (the spec sets no wording)
- **And** `1e3` in up to shows the message under up to, none under Amount
- **And** no POST is sent and nothing is stored
- **And** corrected to 100–150 zł, one POST saves 10 000–15 000 grosze

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`, type the title | — |
| 2 | Retype Amount `-5`, `1e3`, `12.345`, pressing Add each time | The format message under Amount each time |
| 3 | Retype Amount `10 000 000,01`, press Add | A different message under Amount (observed: "Enter at most 10 000 000 zł") |
| 4 | Retype Amount 100, type up to `1e3`, press Add | The format message under up to only |
| 5 | Read the request log and the DB | No POST; nothing stored |
| 6 | Retype up to 150, press Add | One POST; "Tiles" stored at 10 000–15 000 grosze |

## Edge cases

- `tasks-browser` AC4 — Amount above up to
- `tasks-browser` AC2 — `12,50` accepted
