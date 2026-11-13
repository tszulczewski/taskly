# PLACES-002 — A duplicate name is refused; rename, recolour and delete show on every row

| Field | Value |
| --- | --- |
| Implementation | [`test/places-browser.integration.test.ts`](../../../test/places-browser.integration.test.ts) › `assigning tasks to places in the browser (#19, sign-up closed)` › `refuses a duplicate name, and shows a rename, a recolour and a delete on every row` |
| Category | PLACES |
| Priority | High |
| Type | UI |
| Source requirement | #19 AC5–AC8; `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` — UI/UX Places "Rename, recolour, delete" (patched views, no refetch) |
| Prerequisites | A signed-in owner with the eight places; A and B both assigned Salon and Kuchnia in the DB |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** A and B both in Salon and Kuchnia
- **When** the owner creates "łazienka"
- **Then** the name field says "A place with this name already exists." and nothing is created
- **When** they rename Kuchnia to "Aneks" and choose Teal
- **Then** A and B show Aneks at once; the DB holds Aneks with colour 9
- **When** they delete Salon and confirm "Delete “Salon”? It is removed from every task."
- **Then** A and B keep only Aneks; Salon is gone from the DB

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | "…" on A → "Places…"; New place "łazienka" → Create | Duplicate message under the field |
| 2 | Edit places → Edit Kuchnia; name "Aneks", colour Teal → Save | A, B show Aneks; DB colour 9 |
| 3 | Edit Salon → Delete place → Delete place | The question shows; A, B lose Salon; DB has no Salon |

## Edge cases

- `use-places.test.tsx` — the cache patch keeps a quick add still saving (P2)
- `test/places-http.integration.test.ts` — 409 and 404 over HTTP
