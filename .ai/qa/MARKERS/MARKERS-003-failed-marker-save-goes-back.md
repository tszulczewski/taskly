# MARKERS-003 — A marker whose save fails goes back with a message in its row

| Field | Value |
| --- | --- |
| Implementation | [`test/markers-browser.integration.test.ts`](../../../test/markers-browser.integration.test.ts) › `marking tasks important and urgent in the browser (#18, sign-up closed)` › `puts a marker whose save fails back as it was, with the message in its row` |
| Category | MARKERS |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` — UI/UX "Pending changes" › "Refused or failed" (markers: "Could not save “…”. It is back as it was."); Edge cases "A move request fails (network, 5xx)" applied to markers |
| Prerequisites | A new signed-in owner; tasks A (with s1, s2) and B created through the core service |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** every `/api/tasks/…` request fails (aborted in the browser; agent-browser cannot answer with a status code, so a network failure stands in for the 500, which the screen unit tests cover)
- **When** the owner marks B urgent
- **Then** B's row shows "Could not save “B”. It is back as it was." and no marker word
- **And** nothing is stored for B
- **When** requests work again and the owner marks A important
- **Then** B's message is gone and A is stored important

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open `/`; route `**/api/tasks/**` → abort | — |
| 2 | "…" on B → Urgent | Row message on B; no "Urgent" |
| 3 | Unroute; read the DB | B [false, false] |
| 4 | "…" on A → Important | "Important" on A; B's message cleared; DB A [true, false] |

## Edge cases

- MARKERS-001 — the saved path
- `packages/app/components/tasks/task-list-screen.test.tsx` › `TaskListScreen markers (#18)` — a 500 and a 404 (deleted elsewhere)
