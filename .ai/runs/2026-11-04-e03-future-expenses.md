# E03 Phase 2: future expenses (#21)

- **Date:** 2026-11-04
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md (Phase 2, steps 7–10)
- **Outcome:** in progress

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

## Files changed

## Verification (commands run and results)

## Problems / open questions

## Lessons recorded (links into .ai/lessons.md)

## Progress

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
- [ ] 4.3 Full gate and manual check
