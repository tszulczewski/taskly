# Code review PR #43

- **Date:** 2026-10-30
- **Spec:** .ai/specs/implemented/2026-10-16-tasks-and-subtasks.md
- **Outcome:** success (review complete; verdict request changes)

## Goal
Review PR #43 at `34296ba6f03dd2b3bcdde7f0cd74e7759bfb4438` against the repository rules and full configured validation gate.

## Steps taken
- Read skill, tracker descriptor, configuration, lessons and repository review/compatibility rules.
- Confirmed local HEAD equals PR head and initial worktree was clean.
- Delegated independent core/database and client reviews as required by AGENTS.md.
- Core/database review found no proven defect in role checks, same-list parents, roll-up, default-list creation or lock order. Migration scope matches the spec; manual rollback evidence is recorded in the implementation log.
- Confirmed a client defect with a temporary jsdom test: invalid amount text survives the transition to a summed estimate, blocks Save and has no rendered error. Probe passed (1 test); removed the temporary file afterwards.
- Direct `om-code-review` is the read-only engine under `references/rules.md`: no tracker claim, labels or review submission. Report will remain local for the caller/user.

## Files changed
- This review log and a lesson in `.ai/lessons.md`; implementation remains unchanged.

## Verification (commands run and results)
- `npm run format:check`: PASS.
- `npm run lint`: PASS, 0 errors / 1 existing unused-variable warning in `prepare-share-bundle.mjs`.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 72 files / 944 tests; statements, branches, functions and lines all 100%.
- `npm run build`: PASS after rerunning outside the sandbox (initial network restriction).
- `npm run audit`: PASS after rerunning with registry access; 4 moderate findings, no high findings.
- `npm run test:integration`: FAIL (exit 1). Outside sandbox, all 15 files / 163 tests passed, but Vitest reported one unhandled PostgreSQL error `57P01`, "terminating connection due to administrator command", originating in `migrations.integration.test.ts` and targeting its temporary upgrade database. Initial sandbox run failed during setup; `docker info` reports server 29.8.2.
- Isolated migration rerun: PASS, 1 test. The teardown failure is intermittent; this does not replace the failed full gate. Installed `pg-pool` removes clients from its collection before their end callbacks complete and may resolve `pool.end()` before physical closure; `DROP DATABASE ... WITH (FORCE)` immediately afterwards races with that closure.
- Diagnostic test: PASS, 1 test proves blocked submission and invisible amount error after rerender with summed estimate. Log: `/tmp/taskly-pr43-probe.log`.

## Problems / open questions
- Session restart interrupted initial preparation; state checked before resuming.
- Blocker: `packages/db/src/migrations.integration.test.ts:82–83`, full integration command exits 1 due to unhandled teardown error. Ensure actual connections are closed before dropping the temporary database (for example explicitly await a dedicated client's closure), then rerun the full gate. Do not suppress the error globally.
- Major: `packages/ui/src/product/tasks/task-row.tsx:398–401` and `packages/app/components/tasks/task-items.ts:147–152`, hidden invalid amounts prevent saving title/description after the first subtask arrives during an open edit. Exclude hidden amounts from both form validation and update parsing, with a regression covering invalid text and reversed range before the transition.
- Final remote PR head remains `34296ba6f03dd2b3bcdde7f0cd74e7759bfb4438`.

## Follow-up: publish comment (user requested)
- The user explicitly requested a PR comment after the local review was complete.
- Rechecked remote head: unchanged at `34296ba6f03dd2b3bcdde7f0cd74e7759bfb4438`.
- Published the findings and complete validation table as one comment using the `om-code-review` report and GitHub tracker `comment-pr` operation: https://github.com/tszulczewski/taskly/pull/43#issuecomment-6521523826.
- No formal review, labels, commits or implementation changes.

## Lessons recorded (links into .ai/lessons.md)
- `.ai/lessons.md`: hidden fields retain state and must be excluded from validation/parsing after a refetch changes the form mode.
- `.ai/lessons.md`: pool shutdown can resolve before physical connection closure; forced database removal can cause an intermittent unhandled error despite all assertions passing.
