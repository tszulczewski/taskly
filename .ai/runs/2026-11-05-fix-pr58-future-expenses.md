# Drive PR #58 (future expenses) to merge-ready

- **Date:** 2026-11-05
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md
- **Outcome:** success (merge-ready pending manual QA and a second person's review)

## Goal
Resolve the review blockers on PR #58 (`om-auto-fix-pr 58` → `om-auto-review-pr 58 --autofix`): the conflict with `main` and the stale total after a failed refresh.

## Steps taken
1. Merged `origin/main` (#59, #60); the conflict in `.ai/lessons.md` kept both entries.
2. Applied the earlier review's recovery patch: in `TaskListScreen`, the `FutureExpenses` status checks the error before the cached data. Added a regression test where the refetch fails and then a retry succeeds. Updated the comment above the component.
3. Re-reviewed the production diff (core `futureExpenses` / service / schema, route, hooks, screen). No new findings.
4. Ran the full gate in this environment, where `next build` works. The earlier run had failed only because its sandbox could not bind ports.

## Files changed
- `.ai/lessons.md` (merge + new lesson)
- `packages/app/components/tasks/task-list-screen.tsx`, `task-list-screen.test.tsx`

## Verification (commands run and results)
format:check, lint, check:agents, typecheck: pass. `npm test`: 1034 passed, 100% coverage. build: pass. audit: exit 0. `test:integration`: 18 files, 192 tests passed.

## Problems / open questions
Money + `risk-high`: manual QA (`needs-qa`) and a second person's review are still required before merge; no self-QA.

## Lessons recorded (links into .ai/lessons.md)
- 2026-11-05 — status order: error before cached data.
