# EXPENSES-002 — An exact price of 0 zł is counted as 0 zł and not listed as without an estimate

| Field | Value |
| --- | --- |
| Implementation | [`test/future-expenses-browser.integration.test.ts`](../../../test/future-expenses-browser.integration.test.ts) › `future expenses in the browser (#21, sign-up closed)` › `counts an exact price of 0 zł as 0 zł and does not list it as without an estimate` |
| Category | EXPENSES |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-11-03-completion-and-future-expenses.md` — Edge Cases "An exact price of 0 zł" (counted as 0 and not listed; shown as "0 zł"); #21 AC7 (R18, an exact price shows as one amount) |
| Prerequisites | A new signed-in owner with an empty list |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** an empty list whose summary reads "No estimates yet"
- **When** the owner adds "Leftover paint" with Amount 0, then "Tiles" at 1 000–2 000 zł
- **Then** the total reads "0 zł" and no "without an estimate" line is shown
- **And** the row shows "0 zł"
- **And** with "Tiles" the total reads "1 000–2 000 zł"
- **And** "Leftover paint" is stored as 0–0 grosze

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/` | "No estimates yet" |
| 2 | Add "Leftover paint", Amount 0 | Total "0 zł"; no line; row "0 zł" |
| 3 | Add "Tiles" 1000–2000 | Total "1 000–2 000 zł" |
| 4 | Read the DB | min 0, max 0 |

## Edge cases

- `unestimated-browser` AC8 — the line hidden when nothing lacks an estimate
- `future-expenses-browser` AC1, AC3–AC7 — the total following changes
