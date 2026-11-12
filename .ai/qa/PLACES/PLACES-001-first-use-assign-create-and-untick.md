# PLACES-001 — The eight places on first use; ticking, a new place and unticking are kept

| Field | Value |
| --- | --- |
| Implementation | [`test/places-browser.integration.test.ts`](../../../test/places-browser.integration.test.ts) › `assigning tasks to places in the browser (#19, sign-up closed)` › `shows the eight places on first use, ticks one and a new place, unticks one, and keeps them after a reload` |
| Category | PLACES |
| Priority | High |
| Type | UI |
| Source requirement | #19 AC1–AC4; `.ai/specs/2026-11-03-order-markers-and-spaces.md` — Data Model "Initialization", UI/UX Places "Create", acceptance S-2 |
| Prerequisites | A new signed-in owner who never opened places; tasks A (with s1) and B created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** an owner who never loaded their places
- **When** they open "…" → "Places…" on A
- **Then** the picker lists Salon, Sypialnia, Łazienka, Kuchnia, Garaż, Ogródek, Strych, Biuro in that order
- **When** they tick Kuchnia and Garaż, then create "Jadalnia"
- **Then** A shows Kuchnia, Garaż, Jadalnia at once; Jadalnia is stored ninth with colour 9 and ticked on A
- **When** they untick Garaż and reload
- **Then** A shows Kuchnia and Jadalnia, B shows none

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`; "…" on A → "Places…" | The eight predefined places in order |
| 2 | Tick Kuchnia, Garaż | Both tags on A; stored |
| 3 | Type "Jadalnia" in New place → Create | Tag on A; DB place Jadalnia colour 9, ticked |
| 4 | Untick Garaż | Garaż gone from A; DB A = Jadalnia, Kuchnia |
| 5 | Reload | A: Kuchnia, Jadalnia; B: none |

## Edge cases

- `packages/core/src/places.integration.test.ts` — seeding once, races, S-1
- `task-list-screen.test.tsx` › `TaskListScreen places (#19)` — refused and 404 ticks
