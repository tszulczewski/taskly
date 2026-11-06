# Integration tests for the uncovered E01 and E03 scenarios

- **Date:** 2026-11-06
- **Spec:** .ai/specs/implemented/2026-10-16-tasks-and-subtasks.md, .ai/specs/implemented/2026-11-03-completion-and-future-expenses.md
- **Outcome:** success (12 scenarios covered; one product finding, EXPENSES-004)

## Goal

Run `om-integration-tests` (with the repo-local override `.ai/skills/om-integration-tests/SKILL.md`) over epics E01 (#11: #15, #16) and E03 (#13: #20, #21, #47). Find spec scenarios that no integration test covers, and add executable tests plus linked QA scenarios (`.ai/qa/{AREA}/`) for them.

## Steps taken

1. Coverage analysis. All issue acceptance criteria (#15 AC1–AC7, #16 AC1–AC5, #20 AC1–AC13, #21 AC1–AC7, #47 AC1–AC9) and the spec criteria Q2-1, Q3-1 and C-1 are covered by `test/*-browser`, `test/tasks-http` or `packages/core/src/*.integration.test.ts`. Not covered are the spec's UI/UX failure paths and edge cases. These 12 were agreed with the owner (all 12):

   | ID | Scenario | Source |
   | --- | --- | --- |
   | TASKS-001 | Edit save of a task deleted elsewhere → deleted message, row gone | E01 UI/UX "Task deleted elsewhere", Edge Cases |
   | TASKS-002 | Add refused (network) → "Could not add the task. Try again.", temporary row gone, text kept | E01 UI/UX Optimistic updates |
   | TASKS-003 | Edit refused (network) → "Could not save the task. Try again.", form stays | E01 UI/UX Optimistic updates |
   | TASKS-004 | Delete refused (network) → dialog stays with "Could not delete the task. Try again." | E01 UI/UX Optimistic updates |
   | TASKS-005 | Malformed or too large amount → "Enter an amount like 1 500,50", nothing sent | E01 Edge Cases |
   | SUBTASKS-001 | Subtask add to a task deleted elsewhere → deleted message | E01 Edge Cases |
   | SUBTASKS-002 | Edit save 409 after the task got a subtask elsewhere → server message, sum, retry saves title | E01 UI/UX "409 on an edit save" |
   | COMPLETION-001 | Subtask add to a task completed elsewhere → row notice, no row written | E03 UI/UX, Q3 |
   | EXPENSES-001 | Future expenses fail to load → message and "Try again"; the list works | E03 UI/UX, Edge Cases |
   | EXPENSES-002 | Exact price 0 zł → counted as "0 zł", not listed | E03 Edge Cases |
   | EXPENSES-003 | "Add estimate" on an item deleted elsewhere → 404 message, item gone | E03 Edge Cases |
   | EXPENSES-004 | "Add estimate" on an item that got subtasks elsewhere → 409 message, its subtasks listed | E03 Edge Cases |

2. Started the shared test environment (`.ai/scripts/test-env-up.sh`, descriptor was `stopped`; now running at http://127.0.0.1:3300, demo user). Explored each flow with agent-browser as the demo user. The other tab was simulated with in-page `fetch` calls: messages, focus, selectors and the 409/404 behaviour were confirmed before writing.
3. Wrote one `it(...)` per scenario in the existing suites, mirroring their helpers. Data comes from the core services (`createTask`, `deleteTask`, `setTaskCompleted`) or quick add. The "other tab" is a service call while a form is open. Network failures use `abortRequests` with `unroute` in `finally` (also in `beforeEach`).
4. Wrote the 12 scenario files under `.ai/qa/{TASKS,SUBTASKS,COMPLETION,EXPENSES}/` and checked every link (file exists, describe and test name found with a substring match).
5. Two fixes while iterating on EXPENSES-001: my expected total was wrong (1 000–2 000 + 500 = 1 500–2 500 zł), and the summary goes back to loading after the add's invalidation, so the test now waits for the error to return. That is a test issue, not a product one; recorded in the lesson below.

## Files changed

- `test/tasks-browser.integration.test.ts`: TASKS-001…005 and their helpers (`fieldError`, `posts`, `formClosed`, `focusedSlot`, `TASK_API` unrouted in `beforeEach`)
- `test/subtasks-browser.integration.test.ts`: SUBTASKS-001, SUBTASKS-002
- `test/completion-browser.integration.test.ts`: COMPLETION-001
- `test/future-expenses-browser.integration.test.ts`: EXPENSES-001, EXPENSES-002
- `test/unestimated-browser.integration.test.ts`: EXPENSES-003, EXPENSES-004
- `.ai/qa/TASKS/TASKS-001…005-*.md`, `.ai/qa/SUBTASKS/SUBTASKS-001…002-*.md`, `.ai/qa/COMPLETION/COMPLETION-001-*.md`, `.ai/qa/EXPENSES/EXPENSES-001…004-*.md`
- `.ai/lessons.md`: extended the 2026-10-29 TanStack "refetch of a never-loaded query" lesson

## Verification (commands run and results)

- New tests alone, `--retry=0`: 12/12 pass (after the two EXPENSES-001 fixes above).
- The five changed suites in full, `--retry=0`: 5 files, 33/33 pass.
- `npm run lint`, `check:agents`, `test:env-scripts`, `typecheck`, `test` (unit, 100% coverage), `build`, `audit`: pass.
- `npm run test:integration` (full): 19 files, 211/211 pass, exit 0, no unhandled errors.
- `npm run format:check`: fails only on `.ai/cezar/runs.json`. That file was untracked before this run and is not part of this change, so it is left as it is.

## Problems / open questions

- **Product finding (EXPENSES-004, owner: product):** spec E03 asks "Add estimate" to show the server's 409 message ("A task with subtasks takes its estimate from them") when the item got subtasks in another tab. The refetch removes the item, which unmounts its form together with the message, so nothing is shown. The test asserts only the agreed part. The scenario is marked `needs human review`. Filed as #66.
- `.gitignore` has an uncommitted `/.ai/qa/test-env.lock/` line written by the test-env tooling, not by this run's edits.
- All 12 scenario files are AI-written drafts awaiting human review.

## Lessons recorded (links into .ai/lessons.md)

- 2026-10-29 TanStack Query lesson extended: an aborted, never-loaded query goes back to loading after another mutation's invalidation; browser tests wait for the error to return.
