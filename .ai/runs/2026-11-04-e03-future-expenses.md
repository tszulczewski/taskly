# E03 Phase 2: future expenses (#21)

- **Date:** 2026-11-04
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md (Phase 2, steps 7–10)
- **Outcome:** success (Phase 2; Phase 3 not started)

Source doc: .ai/specs/2026-11-03-completion-and-future-expenses.md

## Goal

The owner sees one "Future expenses" min–max range under the list's name: the sum of the effective estimates (`rollUpEstimate`) of open main tasks, computed on the server in integer grosze (#21 AC1–AC7). The total follows every add, edit, delete, completion and reopen.

## Scope

- `packages/core`: pure `futureExpenses(views)` (`futureExpenses.ts`, `@taskly/core`, `total` only in this phase) and `futureExpensesResponseSchema`; `futureExpensesService` (`futureExpensesService.ts`, `server-only`, `@taskly/core/server`, `read` role, through `listTasks`). Delete `summary.ts`, `summaryService.ts`, their tests and exports (no consumers).
- `packages/app`: `GET /api/lists/[listId]/future-expenses`; `queryKeys.summary` → `queryKeys.futureExpenses(listId)`; `useFutureExpenses`; invalidation of the total when any task mutation settles (not skipped while others run); `FutureExpenses` above quick add (decision I1) with loading, error and "Try again".
- Tests: unit (100% coverage), core integration (AC1–AC5, AC7, 404, viewer reads), HTTP integration, a browser test (the total follows add, edit, delete, complete, reopen; #21 AC1–AC7, #20 AC7).
- Design-system docs: E03 status words for #21.

## Non-goals

- Phase 3 (#47): `unestimated` in the response, the unestimated line and "Add estimate". `FutureExpenses` gets `unestimated={[]}`.
- No change to `@taskly/ui` components; no migration; E02.

## Decisions for this run

- **One PR per phase** (spec Phasing, Q1); this run ships Phase 2 only.
- **No automated review pass.** The owner reviews PRs personally (AGENTS.md: never launch a review agent without asking), as in Phase 1. The PR stays in `review` for the owner.
- **Response in this phase is `{ total }` only.** Spec step 7 says "`total` only in this phase" and API Contracts says `unestimated` is added in Phase 3 (additive). The app passes `unestimated={[]}`.
- **`validate` / `onAddEstimate` of `FutureExpenses`:** both are required props, but with `unestimated={[]}` no form can open. The app passes a small tested placeholder pair, replaced in Phase 3 (step 12).

## Risks

- Money (risk-high): a wrong total misleads planning. One pure rule over the same views the rows use, integer grosze, formatting only at the edge; unit and integration tests for R10, R12–R18.
- A stale total after a change: the query is invalidated on every task mutation settle, and `invalidateQueries` cancels an older in-flight refetch.

## Steps taken

1. Confirmed with the owner that Phase 1 (#20, PR #56) is merged and #21 is next (implementation-order analysis of #57: #20 → #21 → #47, then E02). Checked the slot: no branch, plan or PR for it. Worktree at `/var/www/taskly-worktrees/e03-future-expenses`; draft PR #58 opened after the plan commit.
2. 1.1–1.2: `futureExpensesResponseSchema` (`{ total }`), pure `futureExpenses(views)` over the views' effective estimates (open main tasks only; `null` when nothing counts), `futureExpensesService` (`server-only`, `listTasks` → rule). `summary.ts` and `summaryService.ts` deleted with their tests, exports and stub cases. Unit tests for #21 AC1–AC5, AC7, 0 zł and sums above the input cap; integration tests through the real services (completion, reopen, edit, delete, viewer, 404 for non-member, unknown and malformed ids).
3. 2.1: `GET /api/lists/[listId]/future-expenses` with route unit tests; HTTP integration cases (total in grosze follows completion and reopen; viewer reads the owner's total; 401; 404).
4. 3.1: `queryKeys.summary` → `queryKeys.futureExpenses(listId)` (outside `tasks`, so the "skip while others run" rule never applies to it); `useFutureExpenses` formats at the edge (`totalText` → `formatPlnRange`); `settle()` invalidates the total on every settle, success or failure, also while other task mutations are queued.
5. 3.2: `FutureExpenses` above quick add (decision I1): loading only before the first answer, the error with "Try again" (local `retrying` flag, lesson 2026-10-29), and the last total kept while a change is pending (S2). `NO_UNESTIMATED` fills the unestimated props until Phase 3.
6. 4.1: `test/future-expenses-browser.integration.test.ts` (#21 AC1–AC7, #20 AC7, R14, D18 wording, placement), passed 3 runs in a row.
7. 4.2: design-system status words for #21 (`E03CompletionAndExpenses.mdx`, `WhatIsMissing.mdx`, `Screens.mdx`) and the core entry-point wording in `engineering-standards.md` (§1, §10).
8. 4.3: full gate. The first integration run failed one E01 browser test (session renewal); fixed in the test, lesson recorded, full suite rerun green. Manual check of the production build with screenshots.

## Files changed

- `packages/core/src/futureExpenses.ts`, `futureExpensesService.ts` (new, + unit and integration tests); `schemas.ts`, `index.ts`, `server.ts` (+ `schemas.test.ts`, `barrels.test.ts`, `core.test.ts`, `stubs.test.ts`); `summary.ts`, `summaryService.ts` deleted.
- `packages/app/app/api/lists/[listId]/future-expenses/route.ts` (new, + test); `packages/app/components/tasks/use-tasks.ts`, `task-items.ts`, `task-list-screen.tsx` (+ tests); `packages/app/lib/query-keys.ts` (+ test).
- `test/future-expenses-browser.integration.test.ts` (new), `test/tasks-http.integration.test.ts`, `test/tasks-browser.integration.test.ts`.
- `packages/ui/.storybook/docs/…` (three MDX status lines), `.ai/docs/engineering-standards.md`, `.ai/lessons.md`, this log.

## Verification (commands run and results)

- `npm run format:check`, `lint` (0 errors; 1 warning in `.agents/skills/om-share-this-session/scripts/prepare-share-bundle.mjs`, as on `main`), `check:agents`, `typecheck`: pass.
- `npm test`: 76 files, 1033 tests, coverage 100% statements/branches/functions/lines.
- `npm run build`: pass. `npm run audit`: exit 0 (4 moderate advisories, as on `main`; no dependency changed).
- `npm run test:integration` (Testcontainers): first run 191/192: `tasks-browser` "renews a session due for renewal through the screen's GET, not the page render" failed because the new `GET …/future-expenses` also renews a due session. After the test fix: 18 files, 192 tests passed. The new browser file passed 3 runs in a row; the hook tests 3 runs in a row.
- Manual check (production build, seeded data, agent-browser): desktop total "1 800–2 900 zł" for a task with subtasks (own figure ignored, 800–900 zł), an open 1 000–2 000 zł task, an unestimated task and a completed 500 zł task; completing "Tiles" → "800–900 zł", reopening → back; 390 px and 320 px (no horizontal scroll); load failure with "Try again" recovering; empty list "No estimates yet". Screenshots are local only (private repo): `/var/www/taskly-worktrees/evidence-pr-58/`.
- No automated code review (owner reviews; see Decisions).

## Problems / open questions

- The root `AGENTS.md` intro still describes "a summary of spent vs. upcoming expenses", superseded by D18/D19 (future expenses only). Not changed here: the root instructions are the owner's file; worth a one-line fix.
- In the design system, `FutureExpenses`'s error state is about 10 px taller than the ready state (the `TextAction` line), so the content below shifts on a failure. It comes from `@taskly/ui`, not this change; noted for the owner.
- Phase 3 (#47) remains: its own PR after the owner's manual test of this phase. It replaces `NO_UNESTIMATED` and adds `unestimated` to the response.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-04: a new client GET on a screen also renews a due session, and a second "Try again" makes role clicks ambiguous; check browser tests that abort the screen's requests.

## Progress

PR: #58

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: core rule and service

- [x] 1.1 Pure futureExpenses rule and response schema — 695f104
- [x] 1.2 futureExpensesService, summary modules removed — 695f104

### Phase 2: route

- [x] 2.1 GET future-expenses route — 6ca36f4

### Phase 3: app wiring

- [x] 3.1 useFutureExpenses and invalidation from every task mutation — 3709bdb
- [x] 3.2 FutureExpenses on the task screen — 807cc6c

### Phase 4: browser test and wrap-up

- [x] 4.1 Browser test of the total — 6df5364
- [x] 4.2 Design-system status words for #21 — 09f9f0e
- [x] 4.3 Full gate and manual check — bb6a23a
