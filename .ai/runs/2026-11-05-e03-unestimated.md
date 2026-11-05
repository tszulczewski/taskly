# E03 Phase 3: what has no estimate (#47)

- **Date:** 2026-11-05
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md (Phase 3, steps 11–13)
- **Outcome:** in progress

Source doc: .ai/specs/2026-11-03-completion-and-future-expenses.md

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
- **Waiting for the refetch:** `onAddEstimate` resolves `{ ok: true }` only after the update's answer and the `future-expenses` refetch that follows, so the form stays busy until the item leaves `items` (spec UI/UX).

## Risks

- Money (risk-high): the list and the total come from one pure function over the same views; "Add estimate" reuses the existing PATCH path and its validation.
- A stale list after an add: the total query is invalidated on every settle; `onAddEstimate` awaits a refetch of it.

## Steps taken

## Files changed

## Verification (commands run and results)

## Problems / open questions

## Lessons recorded (links into .ai/lessons.md)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: core

- [x] 1.1 Unestimated items in the pure rule and response schema — bbb5c83
- [x] 1.2 Core and HTTP integration cases for unestimated — 7f062b4

### Phase 2: app wiring

- [x] 2.1 validateEstimate and the unestimated mapping — c614c7f
- [x] 2.2 Add estimate through the update mutation on the screen — 22836c2

### Phase 3: browser test and wrap-up

- [ ] 3.1 Browser test of the unestimated line
- [ ] 3.2 Design-system status words, backlog notes, spec to implemented
- [ ] 3.3 Full gate and manual check
