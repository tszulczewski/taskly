# PLACES-004 — At 20 places the picker shows the limit instead of New place

| Field | Value |
| --- | --- |
| Implementation | [`test/places-browser.integration.test.ts`](../../../test/places-browser.integration.test.ts) › `assigning tasks to places in the browser (#19, sign-up closed)` › `shows the limit instead of New place at 20 places` |
| Category | PLACES |
| Priority | Medium |
| Type | UI |
| Source requirement | #19 AC10; D26; `.ai/specs/2026-11-03-order-markers-and-spaces.md` — API Contracts `POST /api/places` (409 at 20) |
| Prerequisites | A signed-in owner with the eight places plus twelve more created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** an owner with 20 places
- **When** they open "Places…" on B
- **Then** the picker lists 20 places, shows "You can have up to 20 places. Delete one to add another." and no New place field

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | "…" on B → "Places…" | 20 places; the limit message; no New place |

## Edge cases

- `packages/core/src/places.integration.test.ts` — two creates racing at 19 (C-1)
