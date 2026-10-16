# Tasks and subtasks specification review

- **Date:** 2026-10-16
- **Spec:** .ai/specs/2026-10-16-tasks-and-subtasks.md
- **Outcome:** success (review completed with findings; production build blocked by environment)

## Goal
Review the tasks and subtasks specification for actionable architectural, contract, product-rule, and testability problems without changing its requirements or implementation.

## Steps taken
- Read the spec-review skill, project standards, lessons, and product decisions.
- Plan: review the complete spec, compare current contracts and schema, obtain an independent scope-cohesion review, and report ranked findings.
- Read the complete 313-line spec and the sign-in prerequisite; compared authorization, list services, schemas, HTTP helpers, migrations, compatibility rules, and integration-test setup.
- Independent scope review found a cohesive task-capture feature; separating subtasks is an optional delivery choice, not a blocking direction decision.
- Reproduced the proposed append lock order racing with the existing list-deletion sequence on local PostgreSQL using distinct owner/editor actors. Used unique fixture users and a list, rolled back both racing transactions, and removed fixtures afterward.

## Files changed
- This run log (created).
- `.ai/lessons.md` (added a lock-order lesson without altering existing entries).
- `.ai/lessons/2026-10-16-cross-actor-list-locks.md` (created).
- Spec and application source unchanged; no commits.

## Verification (commands run and results)
- SQL lock-order reproduction: confirmed deadlock, results `completed` / `40P01`. The initial sandboxed attempt could not connect (`EPERM`); the approved local-only retry succeeded and cleaned up fixtures. Temporary reproduction script: `/tmp/taskly-spec-review-locks.mjs`.
- `npm run lint`: passed.
- `npm run build`: failed fetching Geist/Geist Mono from Google Fonts in the sandbox. An approved retry reached a Turbopack panic while processing CSS: worker-process port binding returned `Operation not permitted`. No application source changed to work around these environment restrictions.
- `npx prettier --check .ai/runs/2026-10-16-tasks-and-subtasks-review.md .ai/lessons/2026-10-16-cross-actor-list-locks.md .ai/lessons.md`: passed.
- Unit and browser integration suites not run: no implementation changes. The SQL experiment tests the proposed lock sequence, not an implemented task service.

## Architectural review

**Verdict: revise before implementation.** Product direction and scope are coherent; three concrete design/verification gaps need correction.

1. **High: append locking can deadlock with list deletion by another actor.** Spec lines 166–180 take the actor's membership lock, then (for a subtask) its parent lock, then the list `FOR NO KEY UPDATE`. Existing `deleteList` (`packages/core/src/lists.ts:62`) takes the owner's membership lock and deletes the list, cascading to memberships. An editor holding their own membership share lock does not block the owner's initial membership lock. The delete can therefore hold the list while waiting for the editor's membership, as the editor waits for the list. The SQL reproduction confirmed `40P01`. The spec's error table (lines 188–192) has no deadlock recovery, so an implementation following it can return 500. Define a consistent lock protocol covering list mutations and their cascades, or bounded whole-transaction deadlock retries. Add a deterministic editor-create/owner-delete concurrency test; the same-actor delete-task test at line 299 does not exercise this cycle. PostgreSQL documents the underlying conflict rules and consistent-order defense in [Explicit Locking, sections 13.3.2 and 13.3.4](https://www.postgresql.org/docs/16/explicit-locking.html).

2. **Medium: task responses have a TypeScript type but no runtime Zod contract.** Lines 151–155 define `TaskView`, and lines 198–205 promise this shape, but the implementation plan adds no task response schemas or output validation. AGENTS.md requires Zod validation of all API inputs and outputs. The reused helper (`packages/app/lib/api-client.ts:42`) only casts `json.data as T`; it does not validate task data. Define response schemas for a subtask, a task with subtasks, the task array, and mutation results; specify the output-validation boundary and add malformed-output tests. Infer `TaskView` from the schema so the runtime and compile-time contracts agree.

3. **Medium: browser-test user creation conflicts with the prerequisite's closed sign-up default.** Step 7 (line 303) creates its test user through Better Auth's sign-up HTTP API. The prerequisite spec disables sign-up unless explicitly enabled (`2026-10-16-sign-in-pages.md:34`), and step 7's app startup does not specify an override. The prescribed browser tests therefore fail before task capture is exercised under default configuration. Reuse the prerequisite's server-side `createUser` test helper (line 212), then sign in over HTTP, or explicitly enable sign-up only for that test server. Keep the test setup compatible with the default production policy.

## Review limits
- Examined local documents and current source; tracker issue acceptance criteria were not independently fetched.
- No competitor research or browser UI review; this is a design review, and task UI/services are still stubs.
- PostgreSQL documentation was checked for locking semantics; the deadlock finding also has a real local reproduction.
- No scope approval is required to report these findings. Requirements remain unchanged.

## Problems / open questions
- The three findings above remain for the specification author. Production build verification was attempted but could not complete under the environment restrictions described above.

## Lessons recorded (links into .ai/lessons.md)
- [Cross-actor list locks](../lessons/2026-10-16-cross-actor-list-locks.md).
