# MARKERS-004 — Important then urgent in quick succession both show at once and are saved in order

| Field | Value |
| --- | --- |
| Implementation | [`test/markers-browser.integration.test.ts`](../../../test/markers-browser.integration.test.ts) › `marking tasks important and urgent in the browser (#18, sign-up closed)` › `shows important then urgent at once while the first answer is held back, sends the second only after it, and ends with both` |
| Category | MARKERS |
| Priority | Medium |
| Type | UI |
| Source requirement | `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md` — UI/UX "Pending changes" › "One queue per list (F4)"; Edge cases "Toggle important, then urgent, quickly"; acceptance criterion Q-1 (answers in order), as it applies to markers |
| Prerequisites | A new signed-in owner; tasks A (with s1, s2) and B; a test transaction holding B's row `FOR UPDATE` |
| Status | draft (AI-written, awaiting human review) |

## Scenario

- **Given** the first PATCH of B is held back on the server (its row lock is taken by the test)
- **When** the owner marks B important and then urgent
- **Then** B shows "Important" and "Urgent" at once
- **And** only one PATCH has been sent while the first answer is held back
- **When** the hold is released
- **Then** the second PATCH is sent, both markers are stored, and B still shows both

## Steps

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Hold B's row `FOR UPDATE` in a transaction | — |
| 2 | "…" on B → Important | "Important" on B; one PATCH, blocked by the holder |
| 3 | "…" on B → Urgent | "Important Urgent" on B; still one PATCH after 500 ms |
| 4 | Commit the holder | Two PATCHes; DB B [true, true]; both words shown |

## Edge cases

- `packages/app/components/tasks/use-tasks.test.tsx` › `useToggleMarker with useTaskViews` — on → off with the first answer late, a refused first toggle, a slow edit before a toggle, a stale refetch
