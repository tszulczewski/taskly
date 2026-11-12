# PLACES-005 — The places' load failure shows in the picker with Try again; the list keeps working

| Field | Value |
| --- | --- |
| Implementation | [`test/places-browser.integration.test.ts`](../../../test/places-browser.integration.test.ts) › `assigning tasks to places in the browser (#19, sign-up closed)` › `shows the places' load failure with Try again in the picker, while the list keeps working` |
| Category | PLACES |
| Priority | High |
| Type | UI |
| Source requirement | `.ai/specs/2026-11-03-order-markers-and-spaces.md` — UI/UX Places "Loading and failure (F2)", acceptance P-1 |
| Prerequisites | A signed-in owner with task B; `**/api/places` aborted in the browser before `/` opens |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** every places request fails
- **When** the owner opens "Places…" on B
- **Then** the picker shows "Could not load your places." with "Try again", not "No places yet." and no New place
- **When** requests work again and they press "Try again"
- **Then** the eight places show and ticking Biuro puts it on B

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Route `**/api/places` → abort; open `/`; "…" on B → "Places…" | Load-failed state; no New place |
| 2 | Unroute; Try again | The eight places |
| 3 | Tick Biuro | Tag on B |

## Edge cases

- `packages/ui/src/product/places/places.test.tsx` — loading and error states, focus after retry
- `task-list-screen.test.tsx` › P-1 (loading → error → retry)
