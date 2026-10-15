# Implement authorization layer (requireRole) and lists service

- **Date:** 2026-10-15
- **Spec:** .ai/specs/2026-10-14-authorization-layer.md
- **Outcome:** in-progress

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

- [ ] 1.1 Implement getRole with unit tests
- [ ] 1.2 Implement requireRole with unit tests
- [ ] 1.3 Add access integration test against real PostgreSQL

### Phase 2: Lists service

- [ ] 2.1 Implement createList
- [ ] 2.2 Implement listsForUser
- [ ] 2.3 Implement renameList and deleteList
- [ ] 2.4 Remove replaced stub assertions and run the full gate
