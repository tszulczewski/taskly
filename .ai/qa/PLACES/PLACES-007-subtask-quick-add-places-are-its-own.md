# PLACES-007 — A subtask added with a place gets only its own place

| Field | Value |
| --- | --- |
| Implementation | [`test/places-browser.integration.test.ts`](../../../test/places-browser.integration.test.ts) › `assigning tasks to places in the browser (#19, sign-up closed)` › `adds a subtask with its own place, copying nothing from or to its task` |
| Category | PLACES |
| Priority | Medium |
| Type | UI |
| Source requirement | #83 AC11, AC13; `.ai/specs/2026-11-03-order-markers-and-spaces.md` — API "Creating a task with places", UI/UX "Places during quick add" |
| Prerequisites | A signed-in owner with tasks A (with s1, A in Salon) and B |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** A belongs to Salon
- **When** the owner opens "Add subtask" under A and then its "Places…"
- **Then** no place is ticked (Salon is not copied from A)
- **When** they tick Biuro, type "s2" and press Add
- **Then** s2 shows Biuro, A still only Salon, s1 none; the same after a reload

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Expand A → Add subtask → "Places…" | Nothing ticked |
| 2 | Tick Biuro → Escape; title "s2" → Add | s2: Biuro; A: Salon; s1: none |
| 3 | Reload; expand A | Same places |

## Edge cases

- `packages/core/src/places.integration.test.ts` › AC13 (nothing copied either way)
- `task-list-screen.test.tsx` › `TaskListScreen places while adding (#83)` — subtask 404 Place
