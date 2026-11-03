# E03 spec writing (completion and future expenses)

- **Date:** 2026-11-03
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md
- **Outcome:** success (spec drafted; the scope-cohesion review by a fresh subagent was not run, pending the owner's go-ahead)

## Goal

Write the E03 spec (#13: #20, #21, #47) with `om-spec-writing`, skeleton first, carrying the decisions of 2026-10-21 and 2026-11-03.

## Steps taken

1. Read `.ai/lessons.md`, the memory notes on E02/E03 inputs, `.ai/agentic.config.json`, `backlog.md`, the brief's rules (R08–R18, D18–D20, D25–D27), both decision records and issues #13, #20, #21, #47.
2. Checked the code: `tasks.status` exists (enum `todo | done`) and is unused; `listTasks` sorts by position only; `summary.ts` / `summaryService.ts` are pre-D18 stubs; `rollUpEstimate` ignores status.
3. Checked the design system: `TaskList`/`TaskRow` completion, `CompleteTaskDialog`, `FutureExpenses`, `UnestimatedTasks` (D27 wording) are built. Completed rows hide "Add subtask" but keep subtask checkboxes, which leaves Q2 and Q3 open.
4. Wrote the skeleton with Q1 (split), Q2 (reopening a subtask of a completed task), Q3 (adding a subtask to a completed task). Stopped at the gate.
5. Owner answered: Q1 one spec, three phases; Q2 (a) subtask opens, task stays completed; Q3 server refuses with 409.
6. Read `tasks.ts` (locks, `requireTaskRole`, `createTask`), the routes, `query-keys.ts`, `use-tasks.ts`, `BACKWARD_COMPATIBILITY.md`, standards §6–7 and the design system's optimistic-change docs. Wrote the full spec: architecture, contracts, UI, edge cases, risks, 3 phases / 13 steps.
7. Design findings while writing: (1) reopen must lock list → task (the `createTask` order), or it deadlocks against a concurrent subtask add; (2) optimistic display of completed rows in plan order needs `position` in the views (additive field); (3) the total stays a separate route, because putting it in the tasks response would be a breaking change.
8. Self-review against the skill checklist. The skill's fresh-subagent scope-cohesion check was **not** run: `AGENTS.md` forbids launching a review agent without asking.

## Files changed

- `.ai/specs/2026-11-03-completion-and-future-expenses.md` (new, full draft)
- `.ai/runs/2026-11-03-e03-spec-writing.md` (this log)

## Verification (commands run and results)

`npx prettier --check` on both files: pass. `npm run check:agents`: pass. No code changed.

## Problems / open questions

- Q1–Q3 answered by the owner (in the spec). Open: whether to run the fresh-context scope-cohesion review.

## Lessons recorded (links into .ai/lessons.md)

None: no correction or pitfall came up that is not already recorded.

## Revision after the spec review (2026-11-03)

- Input: `.ai/runs/2026-11-03-e03-spec-review.md` (request changes; two major findings) and its lesson in `.ai/lessons.md` (mutation `scope` queues requests, not `onMutate`).
- R1 applied: `futureExpenses.ts` (isomorphic, `@taskly/core`) and `futureExpensesService.ts` (`server-only`, `@taskly/core/server`) are separate modules; Phase 2 checks the build with the real barrels.
- R2 applied: the tasks cache holds server data only. The screen replays the pending completion mutations (`useMutationState`, submission order) over it. There is one `scope` per top-level task. Rollback is a failed mutation dropping out of the replay. Verified in `node_modules/@tanstack/query-core/src/mutation.ts` that the hook-level `onSuccess`/`onError` run before the mutation leaves `pending` (no gap on screen). The reviewer's regression cases were added to steps 5 and 6.
- Verification: `npx prettier --check` on the spec passes. No code changed.
