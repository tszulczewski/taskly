# Implement authorization layer (requireRole) and lists service

- **Date:** 2026-10-15
- **Spec:** .ai/specs/2026-10-14-authorization-layer.md
- **Outcome:** success

Source doc: .ai/specs/2026-10-14-authorization-layer.md

## Goal
Replace the `getRole`/`requireRole` and lists-service stubs with real, fail-closed authorization (issue #6). Q1 confirmed by the user: rename/delete owner-only (`manage`), editors write, viewers read.

## Scope
`packages/core/src/access.ts`, `lists.ts`, their unit and integration tests, `stubs.test.ts` cleanup. No schema/migration, routes, UI.

Non-goals: tasks, shopping, invitations, `ensureShoppingList`, events.

## Risks
`risk-high` (authorization). Needs denied-path integration test and a second reviewer. No Docker here: integration tests run via `TEST_DATABASE_URL` against the local dev PostgreSQL, so tests must clean up their own rows.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Access primitives

- [x] 1.1 Implement getRole with unit tests — 7f9ff93
- [x] 1.2 Implement requireRole with unit tests — 7f9ff93
- [x] 1.3 Add access integration test against real PostgreSQL — 7f9ff93

### Phase 2: Lists service

- [x] 2.1 Implement createList — 7f9ff93
- [x] 2.2 Implement listsForUser — 7f9ff93
- [x] 2.3 Implement renameList and deleteList — 7f9ff93
- [x] 2.4 Remove replaced stub assertions and run the full gate

## Files changed
`packages/core/src/{access,lists,types}.ts`, `access.test.ts`, `lists.test.ts`, `access.integration.test.ts`, `lists.integration.test.ts`, `stubs.test.ts`; spec moved to `.ai/specs/implemented/`; lesson added.

## Verification
Run with `TEST_DATABASE_URL` on the local dev PostgreSQL (no Docker available):
`format:check`, `lint`, `typecheck`, `build`, `audit` (exit 0, 4 moderate advisories below the high threshold), `test` (84 tests, 100% statements/branches/functions/lines), `test:integration` (22 tests incl. denied path, wrong scope, `FOR SHARE` concurrency).

## Decisions / problems
- A malformed list id returns `null` from `getRole` (so `NotFoundError`) instead of a Zod error or a Postgres uuid syntax error, matching the spec's edge case "all NotFoundError".
- `getRole` always reads `FOR SHARE`; outside a transaction the lock ends with the statement.
- `createList`/`renameList` take `unknown` input and parse it with `createListInput`.
- `.ai/tmp/` (worktrees) is not git-ignored in this repo; not changed here.

## Lessons recorded
.ai/lessons/2026-10-15-integration-tests-without-docker.md

## Review follow-up (om-code-review of PR #10)
- Minor fixed: `renameList`/`deleteList` now refuse the global `shopping` list with `ConflictError` (409).
- Minor fixed: `requireRole(..., "manage")` locks the membership row `FOR UPDATE`; two `FOR SHARE` holders upgrading to the cascade delete could deadlock (40P01). Regression test: a second manage check blocks until the first transaction ends (fails with `FOR SHARE`, verified).
- Gate re-run: all 7 commands pass; 88 unit tests at 100%, 25 integration tests.
