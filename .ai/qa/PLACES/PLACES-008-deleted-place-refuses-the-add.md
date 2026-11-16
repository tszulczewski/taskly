# PLACES-008 — A chosen place deleted meanwhile refuses the add; the corrected retry adds one task

| Field | Value |
| --- | --- |
| Implementation | [`test/places-browser.integration.test.ts`](../../../test/places-browser.integration.test.ts) › `assigning tasks to places in the browser (#19, sign-up closed)` › `refuses an add whose chosen place was deleted meanwhile, keeps the draft, and adds one task after the correction` |
| Category | PLACES |
| Priority | High |
| Type | UI |
| Source requirement | #83 AC14, AC16, AC18; `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` — API "Creating a task with places", UI/UX "Places during quick add" |
| Prerequisites | A signed-in owner with tasks A (with s1) and B |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the owner chose Salon and Garaż in the quick add and typed "Shelf" with 500 zł
- **When** Garaż is deleted elsewhere and they press Add
- **Then** the form says "A place you chose no longer exists. Check the places, then add again.", keeps the title, and shows "Deleted place" with Remove; nothing is stored
- **When** they remove the deleted place and press Add again
- **Then** exactly one Shelf exists, with Salon, and the future expenses total counts its 500 zł once

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | "Places…": tick Salon, Garaż → Escape; title "Shelf", Amount 500 | Draft ready |
| 2 | Delete Garaż through the core service; Add | Refusal message; "Deleted place"; no task, no assignment |
| 3 | "Remove the deleted place"; Add | One Shelf with Salon; total 500 zł |

## Edge cases

- `packages/core/src/places.integration.test.ts` — a create that waits for a delete (404) and a delete that waits for a create
- `test/places-http.integration.test.ts` — 400/403/404 over HTTP with nothing written
