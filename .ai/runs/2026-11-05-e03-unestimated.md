# E03 Phase 3: what has no estimate (#47)

- **Date:** 2026-11-05
- **Spec:** .ai/specs/implemented/2026-11-03-completion-and-future-expenses.md (Phase 3, steps 11–13)
- **Outcome:** success (Phase 3; E03 complete)

Source doc: .ai/specs/implemented/2026-11-03-completion-and-future-expenses.md

## Goal

Under the future-expenses total, a collapsed line names what still has no estimate (open tasks without subtasks, open subtasks of open tasks) and lets the owner add an estimate in place; the item then leaves the list and the total includes it (#47 AC1–AC9).

## Scope

- `packages/core`: `futureExpenses(views)` also returns `unestimated` (display order); `futureExpensesResponseSchema` gains `unestimated` (additive); `estimateMessages.required` for an empty "Add estimate".
- `packages/app`: `useFutureExpenses` passes `total` and `unestimated`; `validateEstimate` (wraps `estimateFromAmounts`, amount required); `onAddEstimate` through `useUpdateTask` (`PATCH` with `{ estimate }`), then waits for the future-expenses refetch; 409/404 show the server's message (or the deleted notice) and both queries refetch. `NO_UNESTIMATED` is removed.
- Tests: unit (100% coverage), core and HTTP integration, a browser test (#47 AC4, AC6, AC8, AC9, focus to the total after the last item).
- Wrap-up: design-system docs status words for #47, `backlog.md` notes, spec moved to `specs/implemented/`.

## Non-goals

- No change to `@taskly/ui` components (the DS already ships `UnestimatedTasks` with D27 wording); no migration; no new write route; E02; AI estimates (D11).

## Decisions for this run

- **Empty "Add estimate" is a field error** "Enter an amount." under Amount (DS `UnestimatedTasks` docs: "the amount is required here"; DS story fixture uses the same text). Added to `estimateMessages` in core so the app does not invent copy.
- **Waiting for the refetch:** `onAddEstimate` resolves `{ ok: true }` only after the update's answer and the `future-expenses` refetch that follows, so the form stays busy until the item leaves `items` (spec UI/UX). It joins the refetch the settle started (`refetchQueries` with `cancelRefetch: false`) instead of sending a second request.
- **A 404 on "Add estimate"** also sets the screen's deleted notice (as an edit's 404 does): the refetch removes the item and its form, so the form's own message would vanish with it.

## Risks

- Money (risk-high): the list and the total come from one pure function over the same views; "Add estimate" reuses the existing PATCH path and its validation.
- A stale list after an add: the total query is invalidated on every settle; `onAddEstimate` awaits a refetch of it.

## Steps taken

1. Resolved the spec (on `main`); Phases 1 (#56) and 2 (#58) merged, no open implementation PR. Slot free; branch `feat/e03-unestimated`, plan committed, draft PR #62 opened.
2. 1.1: `futureExpenses(views)` returns `unestimated` in display order (an open task without subtasks and without an estimate; the open unpriced subtasks of an open task, with `taskTitle`); `unestimatedItemSchema` and the response field; `estimateMessages.required`. Unit tests for #47 AC1–3, AC5, AC7, Q2-1, a task whose subtasks are all completed, 0 zł, display order; schema and route tests.
3. 1.2: core integration (real PostgreSQL) for the list, its order, AC4 (an added estimate leaves the list and joins the total, viewer included) and Q2-1; HTTP integration for the response, `PATCH { estimate }`, and the existing 409 when the item gained subtasks.
4. 2.1–2.2: `validateEstimate`, `toEstimate`, `toExpensesView`, `addEstimateError` (`task-items.ts`); `useAddEstimate` (`use-tasks.ts`); `FutureExpenses` gets `unestimated`, `validate` and `onAddEstimate`; `NO_UNESTIMATED` removed. Hook and screen tests (save, range for a subtask, required amount, 409, 404, focus to the total after the last item).
5. 3.1: `test/unestimated-browser.integration.test.ts` (#47 AC4, AC6, AC8, AC9; AC5 through completing the task), green 3 runs in a row.
6. 3.2: spec moved to `specs/implemented/` and every reference updated (design-system docs, E02 spec, backlog notes); `WhatIsMissing.mdx` also gets #21's status, left as "pending" by Phase 2.
7. 3.3: full gate and a manual check of the production build.

## Files changed

- `packages/core/src/futureExpenses.ts`, `schemas.ts` (+ `futureExpenses.test.ts`, `schemas.test.ts`, `futureExpensesService.test.ts`, `futureExpensesService.integration.test.ts`).
- `packages/app/components/tasks/task-items.ts`, `use-tasks.ts`, `task-list-screen.tsx` (+ tests); `packages/app/app/api/lists/[listId]/future-expenses/route.test.ts`.
- `test/unestimated-browser.integration.test.ts` (new), `test/tasks-http.integration.test.ts`.
- `.ai/specs/implemented/2026-11-03-completion-and-future-expenses.md` (moved, status line), `.ai/specs/2026-11-03-order-markers-and-spaces.md` (path), `.ai/specs/backlog.md`, three design-system MDX files, `.ai/lessons.md`, this log.

## Verification (commands run and results)

- `npm run format:check`, `lint` (0 errors), `check:agents`, `typecheck`: pass.
- `npm test`: 76 files, 1060 tests; coverage 100% statements (1692), branches (1096), functions (576), lines (1495).
- `npm run build`: pass. `npm run audit`: exit 0 (4 moderate advisories, as on `main`; no dependency changed).
- `npm run test:integration` (Testcontainers): 19 files, 198 tests passed. The new browser file passed 3 runs in a row before the full run.
- Manual check (production build, throwaway PostgreSQL container, data seeded through the API, agent-browser): collapsed "2 tasks and 1 subtask without an estimate"; opened, the rule and "Tiles · Bathroom tiles"; "Add estimate" for Hooks (300) → the item leaves, the count drops, the total 3 400–4 900 → 3 700–5 200 zł, focus on the next "Add estimate"; an empty save shows "Enter an amount." (390 px); a range (100–200) and the last item (500) → the line goes, total 4 300–5 900 zł, focus on the total; no horizontal scroll at 390 and 320 px. Screenshots are local only (private repo): `/tmp/cz-ab/evidence/`.

## Problems / open questions

- The worktree's `node_modules` was stale (`better-auth` missing): `npm ci` in the worktree fixed it.
- agent-browser's Chrome failed with "Socket path too long" under the cockpit's long `TMPDIR`; runs used `TMPDIR=/tmp/cz-ab` (lesson recorded).
- `FutureExpenses.mdx` says the range "updates at once with the list (Optimistic change)", while the spec (S2) and the app keep the last server value until the refetch. Pre-existing design-system wording from before Phase 2; not changed here, worth a one-line fix by the owner.
- After a 409 on "Add estimate" (the item gained subtasks elsewhere), the refetch replaces the item with its subtasks, so the form, with the server's message, closes and focus falls to the page. The spec asks only that the form shows the message and both queries refetch; noted for the owner.
- Issue #47's body links the spec at its old path; the issue closes with this PR.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-05: `renderHook` with TanStack Query's tracked result props: a hook test that never read `data` before a change sees no re-render for it.
- 2026-11-05: `Collapsible` and `TextAction` overwrite a passed `data-slot` (added to the 2026-10-23 lesson).
- 2026-11-05: Chrome "Socket path too long" under a long `TMPDIR` (added to the 2026-10-29 agent-browser lesson).

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: core

- [x] 1.1 Unestimated items in the pure rule and response schema — bbb5c83
- [x] 1.2 Core and HTTP integration cases for unestimated — 7f062b4

### Phase 2: app wiring

- [x] 2.1 validateEstimate and the unestimated mapping — c614c7f
- [x] 2.2 Add estimate through the update mutation on the screen — 22836c2

### Phase 3: browser test and wrap-up

- [x] 3.1 Browser test of the unestimated line — 06e8d3a
- [x] 3.2 Design-system status words, backlog notes, spec to implemented — 5f8cd04
- [ ] 3.3 Full gate and manual check
