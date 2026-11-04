# E03 Phase 1: complete and reopen tasks (#20)

- **Date:** 2026-11-04
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md (Phase 1, steps 1–6)
- **Outcome:** in progress

Source doc: .ai/specs/2026-11-03-completion-and-future-expenses.md

## Goal

The owner completes and reopens tasks and subtasks on the task screen (#20 AC1–AC13, Q2-1, Q3-1, C-1). Completion is optimistic: the tasks cache holds server data only, and the screen replays pending completions over it. Every task mutation of a list runs in one queue (`scope: tasks:<listId>`).

## Scope

- `packages/core`: `completed` and `position` in the views; open-before-completed read order; `setTaskCompleted` (list lock → task lock, no-op on same state, cascade, reopen position); `createTask` refuses a subtask under a completed task (409).
- `packages/app`: `PUT /api/tasks/[taskId]/completion`; E01's add, edit and delete move into the list queue (E02 Phase 1 has not shipped, so this phase builds the queue); a generic replay of pending changes with a `completion` kind (`useTaskViews`); `useSetCompleted`; `onToggleComplete` on `TaskList`; the s04.28 row message and the Q3 row notice.
- Tests: unit (100% coverage), core integration (AC, Q2-1, Q3-1, C-1 in both orders, two concurrent reopens), HTTP integration, a new browser test (`test/completion-browser.integration.test.ts`); E01 browser tests rerun.
- Design-system docs: E03 status words for #20.

## Non-goals

- Phase 2 (future expenses, #21) and Phase 3 (unestimated items, #47): their own PRs, after the owner's manual test of this phase. `summary.ts` / `summaryService.ts` stay until Phase 2.
- No change to `@taskly/ui` components; no migration; E02 (markers, places, move).

## Decisions for this run

- **One PR per phase** (spec Phasing, owner answer Q1), so this run ships Phase 1 only and stops for the owner's manual test, as in E01.
- **No automated review pass.** The skill chain runs `om-auto-review-pr`; the owner reviews PRs personally and AGENTS.md says never to launch a review agent without asking. The PR stays in `review` for the owner.
- **Subagents:** mechanical steps (1.1, 1.4) go to Sonnet, as the owner asked; the concurrency, queue and replay steps stay with the main agent.
- The spec on `main` still reads `Status: draft` and "PR against `auto`": the owner's readiness cleanup (status ready, target `main`) is uncommitted on `docs/e02-spec-review-fixes` and is not part of this PR. Requirements are identical in both copies.

## Risks

- The list queue changes E01's behaviour: quick adds now send one after another. E01's browser tests are rerun.
- Replay correctness under quick toggles (review R2); covered by the regression cases in spec step 5.
- Lock order list → task in `setTaskCompleted`; the C-1 race test checks both orders.

## Steps taken

## Files changed

## Verification (commands run and results)

## Problems / open questions

## Lessons recorded (links into .ai/lessons.md)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: completion (#20)

- [ ] 1.1 Views expose completion and order
- [ ] 1.2 setTaskCompleted service
- [ ] 1.3 Refuse a subtask under a completed task
- [ ] 1.4 Completion route
- [ ] 1.5 List queue and generic replay of pending changes
- [ ] 1.6 Completion in the task screen
- [ ] 1.7 Browser test and design-system status words
- [ ] 1.8 Full gate and manual check
