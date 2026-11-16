# PLACES-006 — Quick add saves a task with two places and a new one; the next task starts with none

| Field | Value |
| --- | --- |
| Implementation | [`test/places-browser.integration.test.ts`](../../../test/places-browser.integration.test.ts) › `assigning tasks to places in the browser (#19, sign-up closed)` › `adds a task with two places and a new one from quick add, keeps them after a reload, and starts the next task with none` |
| Category | PLACES |
| Priority | High |
| Type | UI |
| Source requirement | #83 AC11, AC12, AC14, AC17; `.ai/specs/2026-11-03-order-markers-and-spaces.md` — API "Creating a task with places", UI/UX "Places during quick add" |
| Prerequisites | A signed-in owner with tasks A (with s1) and B |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the owner is on `/`
- **When** they open "Places…" in the quick add, tick Kuchnia and Salon, and create "Jadalnia"
- **Then** Jadalnia is chosen in the draft, and closing the picker puts focus back on "Places…"
- **When** they type "Lamp" and press Add
- **Then** Lamp shows Salon, Kuchnia, Jadalnia; the draft has no places and focus is in the title; the database holds the three assignments
- **When** they open "Add subtask" under B, create "Spiżarnia" from its picker, and cancel the subtask form
- **Then** no subtask is added, and Spiżarnia stays in the catalog
- **When** they reload
- **Then** Lamp still shows its three places

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Quick add "Places…"; tick Kuchnia, Salon; New place "Jadalnia" → Create | Three places chosen |
| 2 | Escape | Picker closes; focus on "Places…" |
| 3 | Title "Lamp" → Add | Row with Salon, Kuchnia, Jadalnia; draft cleared; focus in title |
| 4 | Expand B → Add subtask → "Places…" → create "Spiżarnia" → Escape → Escape in the title | Form closed, no subtask; place kept |
| 5 | Reload | Lamp: Salon, Kuchnia, Jadalnia |

## Edge cases

- `packages/core/src/places.integration.test.ts` › `creating a task with places (#83)` — refusals, owners, races
- `packages/ui/src/product/tasks/tasks.test.tsx` › `QuickAdd places (spec E02, #83)` — freeze while creating, portal events
