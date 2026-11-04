# E03 Phase 1: complete and reopen tasks (#20)

- **Date:** 2026-11-04
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md (Phase 1, steps 1–6)
- **Outcome:** success (Phase 1; Phases 2–3 not started)

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

1. Resolved the spec and checked the slot (no branch, plan or PR for it). Worktree at `/var/www/taskly-worktrees/e03-completion` (first created under `.ai/tmp/`, moved out; see Problems). Draft PR #56 opened after the plan commit.
2. 1.1 (Sonnet subagent): `completed` and `position` in `subtaskViewSchema`; `listTasks`/`topLevelView` order `(status = 'done'), position COLLATE "C", id`; `toTaskItem` maps `completed`. Fixed the R14 integration expectation (a done subtask now reads `completed: true`).
3. 1.2–1.3: `completionInput`, `TASK_COMPLETED_MESSAGE`, `setTaskCompleted` (membership → list `FOR NO KEY UPDATE` → task `FOR UPDATE`, through `requireTaskRole(…, { withListLock: true })`; no write on same state; one-statement cascade; reopen keyed `positionBetween(null, first other sibling)`), and the Q3 409 in `createTask`. One commit for both steps.
4. 1.4 (Sonnet subagent): `PUT /api/tasks/[taskId]/completion`, route unit test, HTTP integration cases. Its reopen expectation was wrong (the subtask stays completed, the key changes) and was fixed at the gate.
5. 1.5: E01's add, edit and delete join one list queue (`scope: tasks:<listId>`); `useSetCompleted` (server answers only in the cache, hook-level `onError`); `useTaskViews` replays pending changes (`queryKeys.taskChanges`, kind from the key's last part) over the cache in read order; pure `sortTasks`, `applyCompletion`, `replayChanges`, `titleOf` in `task-items.ts`. `isPendingTaskId` moved to `task-items.ts` so `use-tasks.ts` can import the replay without an import cycle (the spec puts the replay there). Three E01 hook tests that assumed concurrent requests were rewritten for the queue.
6. 1.6: the screen uses `useTaskViews`, passes `onToggleComplete`, shows the s04.28 row message (tasks and subtasks), the gone message on 404, and the Q3 notice in the task's row.
7. 1.7: `test/completion-browser.integration.test.ts` (AC8–AC12, Q2-1, refused completion, complete → reopen with the first answer held back by a list lock). E01 browser tests updated for the progress meta line.
8. 1.8: full gate; manual check of the production build with screenshots.

## Files changed

- `packages/core/src/schemas.ts`, `tasks.ts` (+ `tasks.test.ts`, `tasks.integration.test.ts`, `schemas.test.ts`).
- `packages/app/app/api/tasks/[taskId]/completion/route.ts` (+ test); `packages/app/components/tasks/use-tasks.ts`, `task-items.ts`, `task-list-screen.tsx` (+ tests); `packages/app/lib/query-keys.ts` (+ test); fixtures in other app tests.
- `test/completion-browser.integration.test.ts` (new), `test/tasks-http.integration.test.ts`, `test/subtasks-browser.integration.test.ts`.
- `.ai/lessons.md`, this log.

## Verification (commands run and results)

- `npm run format:check`, `lint` (0 errors; 1 warning in `.agents/skills/om-share-this-session/scripts/prepare-share-bundle.mjs`, as on `main`), `check:agents`, `typecheck`: pass.
- `npm test`: 73 files, 1006 tests, coverage 100% statements/branches/functions/lines.
- `npm run build`: pass. `npm run audit`: exit 0 (4 moderate advisories reported, no dependency changed in this run).
- `npm run test:integration` (Testcontainers): first run 180/181 (the HTTP reopen expectation above); after the fix 16 files, 181 tests passed. The completion browser file passed 3 runs in a row; the hook tests 3 runs in a row.
- Manual check: production build with seeded tasks, desktop and 390 px. Complete, the open-subtasks question, completed rows last, subtask reopened first under a completed task, refused toggle back with "Could not save “Tile the wall”. It is back as it was.". Screenshots are local only (private repo), listed on the PR.

## Problems / open questions

- The first `npm ci` ran in the owner's main checkout because the shell's cwd had changed (same lockfile, so `node_modules` came back the same). The worktree was first created under `.ai/tmp/`, which is not git-ignored, and was moved out to `/var/www/taskly-worktrees/`. Lesson recorded.
- **Not done, deliberately:** the design-system docs status words for #20 (spec step 6). On `main` those lines still say "no spec yet"; the owner's uncommitted metadata cleanup on `docs/e02-spec-review-fixes` rewrites the same lines in `E03CompletionAndExpenses.mdx`, `WhatIsMissing.mdx` and `Screens.mdx`. Update them for #20 after that cleanup lands, to avoid conflicting edits.
- No automated review pass (owner reviews; AGENTS.md). The spec header on `main` still says `Status: draft` (cleanup pending, see above).
- Phases 2 (#21) and 3 (#47) remain; each gets its own PR after the owner's manual test of this phase.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-04: list queue changes mutation timing in tests; `onToggleComplete` switches the meta line to progress and rows keep their open state; delaying an answer with a list lock in browser tests; Bash cwd and worktree location.

## Progress

PR: #56

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: completion (#20)

- [x] 1.1 Views expose completion and order — e6254c6
- [x] 1.2 setTaskCompleted service — 1e31ec2
- [x] 1.3 Refuse a subtask under a completed task — 1e31ec2
- [x] 1.4 Completion route — 1797141, 69f4264
- [x] 1.5 List queue and generic replay of pending changes — dde5805
- [x] 1.6 Completion in the task screen — df282a9
- [x] 1.7 Browser test and design-system status words — 4d06e6a (status words deferred, see Problems)
- [x] 1.8 Full gate and manual check — 69f4264
