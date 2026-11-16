# PLACES-009 — Quick add shows the places failing to load and still adds a task without places

| Field | Value |
| --- | --- |
| Implementation | [`test/places-browser.integration.test.ts`](../../../test/places-browser.integration.test.ts) › `assigning tasks to places in the browser (#19, sign-up closed)` › `shows the places failing to load in the quick add picker and still adds a task without places` |
| Category | PLACES |
| Priority | Medium |
| Type | UI |
| Source requirement | #83 AC15; `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` — API "Creating a task with places", UI/UX "Places during quick add" |
| Prerequisites | A signed-in owner; `**/api/places` aborted in the browser before `/` opens |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** every places request fails
- **When** the owner opens "Places…" in the quick add
- **Then** it shows "Could not load your places.", not "No places yet." and no New place
- **When** they close it, type "Lamp" and press Add
- **Then** Lamp is added without places

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Route `**/api/places` → abort; open `/`; quick add "Places…" | Load-failed state |
| 2 | Escape; title "Lamp" → Add | Row Lamp, no places |

## Edge cases

- `packages/ui/.storybook/docs/product/tasks/QuickAdd.stories.tsx` › Places Loading, Places Load Failed
