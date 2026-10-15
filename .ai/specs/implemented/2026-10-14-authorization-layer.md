# Authorization layer (`requireRole`) and lists service

- **Date:** 2026-10-14
- **Status:** implemented
- **Issue:** #6

## 📝 TLDR

Every Taskly feature needs to know who may do what on a list, but `getRole` / `requireRole` in `packages/core/src/access.ts` and the whole lists service are stubs that throw `NotImplementedError`. This spec (proposed, not yet built) implements the authorization layer — role lookup from `list_members`, a fail-closed `requireRole`, and the `owner`/`editor`/`viewer` action matrix — and the first service that uses it, `lists`, so later services (tasks, shopping, invitations) can copy a proven pattern.

## 📝 Problem Statement

- Today `access.ts` throws on every call, so no route can authorize anything. `authorization.ts` already holds the pure `can(role, action)` matrix, but nothing resolves a user's role for a list.
- `stubs.test.ts` asserts the throws, so the 100% coverage gate is green while no authorization behavior is covered.
- Authorization and data scoping are `risk-high` (see `SDLC.md`): a mistake here exposes one household's renovation plan to another user. Getting the pattern right once, with a denied-path integration test, is cheaper than retrofitting it into each service.

## 📝 Proposed Solution

Two small units in `@taskly/core`, following `.ai/docs/engineering-standards.md` §3:

1. **`getRole(db, userId, listId)`** — one indexed query on `list_members` (unique index `list_members_list_user_idx`), returning `Role | null`.
2. **`requireRole(db, userId, listId, action)`** — calls `getRole`, then `can`. No row → `NotFoundError` (never leaks that the list exists). Row but `!can(role, action)` → `ForbiddenError`. Any unexpected error propagates as an error, never as "allowed" (fail closed). Returns the `Role` for callers that need it.
3. **Lists service** (`lists.ts`): `listsForUser`, `createList`, `renameList`, `deleteList`, each Zod-parse → `requireRole` → work, run in `db.transaction` where they check-then-write.

Alternatives rejected: per-record ACLs (standards: no per-task ACL; tasks inherit from the list); Postgres row-level security (adds a second authorization model and runtime role plumbing for a single small app); a policy class hierarchy (standards: plain functions).

## 📝 Architecture

- **Reused:** `can` / `Action` in `authorization.ts`; error classes in `errors.ts`; `Db` type; schema `lists`, `list_members`; `roleSchema`, `createListInput` in `schemas.ts`.
- **New/changed:** `access.ts` (real implementations), `lists.ts` (real implementations), tests replacing the matching assertions in `stubs.test.ts`.
- **Dependency direction:** `access.ts` and `lists.ts` use `@taskly/db` only (`app → core → db`). No `next`/`react` imports. Routes are out of scope; when added they stay `parse → requireUser → core → envelope`.
- **Planned (not in this spec):** tasks/shopping resolve their parent list id and call the same `requireRole`; invitations and `removeMember` use `manage`.

Takeaway: all list-scoped access control funnels through one function, so a single test suite proves the denied path for every service that adopts it.

## 📝 Data Model

No schema change and no migration. Existing `list_members(list_id, user_id, role)` with the unique `(list_id, user_id)` index is sufficient.

- `createList` inserts the `lists` row and an `owner` `list_members` row in one transaction.
- `deleteList` relies on existing `ON DELETE CASCADE` for members, tasks, shopping items and invitations.

## 📝 API Contracts

No HTTP routes in this spec. Core function contracts:

| Function | Input (Zod-parsed) | Authorization | Result |
| --- | --- | --- | --- |
| `getRole(db, userId, listId)` | ids | none (primitive) | `Role \| null` |
| `requireRole(db, userId, listId, action)` | ids, `Action` | itself | `Role`; throws `NotFoundError` / `ForbiddenError` |
| `listsForUser(db, userId)` | — | membership | `ListSummaryRow[]` (only lists the user belongs to, with their role) |
| `createList(db, userId, input)` | `createListInput` | authenticated user | `{ id }` |
| `renameList(db, userId, listId, input)` | `createListInput` | `manage` | `void` |
| `deleteList(db, userId, listId)` | — | `manage` | `void` |

Action matrix (existing in `can`): `read` → viewer+, `write` → editor+, `manage` → owner. Rename and delete are `manage`.

## 📝 UI/UX

None. Surfaces appear with the routes/UI specs.

## 📝 Edge Cases & Failure Scenarios

- **Non-member, unknown list id, malformed uuid:** all `NotFoundError` (same outcome, no existence leak). Malformed ids fail Zod parsing first.
- **Viewer attempts write/manage:** `ForbiddenError` (the viewer already knows the list exists).
- **Membership removed concurrently:** `requireRole` runs inside the same transaction as the write and reads the membership row `FOR SHARE`, so a concurrent removal waits for the write to commit and the write cannot happen after the role is gone.
- **Last owner:** the `owner` row is only created by `createList`; this spec adds no way to remove or demote an owner. Owner removal/transfer is handled by the invitations/members spec.
- **DB error during check:** error propagates; nothing is written, nothing is allowed.
- **Delete list with data:** cascades; no soft delete.

## 📝 Risks & Impact Review

- `risk-high` (authorization, data scoping). Required evidence: unit tests for success/forbidden/not-found, a concurrency test, and a real-PostgreSQL integration test proving user B cannot read, rename or delete user A's list and sees only their own lists (wrong-scope read). A second person must review.
- No contract surface in `BACKWARD_COMPATIBILITY.md` changes: no schema/migration, no HTTP shape. The error-to-status mapping (`NotFoundError` → 404, `ForbiddenError` → 403 in `mapError`) is the contract routes will rely on and must not change.
- Replacing stub assertions in `stubs.test.ts` must not lower coverage thresholds.

## 📋 Phasing

- **Phase 1 — Access primitives:** `getRole`, `requireRole`.
- **Phase 2 — Lists service:** `listsForUser`, `createList`, `renameList`, `deleteList`.
- Deferred: `ensureShoppingList`, tasks, shopping, invitations, `publishListEvent` (separate specs).

## 📋 Implementation Plan

### Phase 1 — Access primitives
1. Implement `getRole` in `packages/core/src/access.ts` with a Drizzle query on `schema.listMembers`; unit-test with a mocked `Db` (unit tests must not touch a database) for member / non-member.
2. Implement `requireRole`: NotFound for null, Forbidden when `!can`, return role; unit tests for all three outcomes and a DB error (propagates).
3. Add `access.integration.test.ts` against real PostgreSQL: owner/editor/viewer across all actions, non-member, unknown list, `FOR SHARE` concurrency (removal during a write transaction).

### Phase 2 — Lists service
4. Implement `createList` (list + owner row in one transaction) with `createListInput` parsing; unit + integration tests.
5. Implement `listsForUser` (join `list_members` → `lists`, ordered by `lists.created_at`, filtered to the actor); integration test: user B never sees user A's lists.
6. Implement `renameList` and `deleteList` using `requireRole(..., "manage")` inside a transaction; success/forbidden/not-found tests for each, including an editor and a viewer.
7. Remove the replaced assertions from `stubs.test.ts`; run the full gate (`npm run format:check`, `lint`, `typecheck`, `test`, `build`, `audit`, `test:integration`); update `.ai/lessons.md` if anything non-obvious surfaced.

## Resolved assumptions (autonomous defaults)

| # | Question | Applied default | Why | Confirm? |
| --- | --- | --- | --- | --- |
| Q1 | Who may rename/delete a list, and may editors rename? | Matrix as in `can`: rename and delete are owner-only (`manage`); editors write tasks, viewers read | Smallest permission surface; relaxing later is non-breaking, tightening is not | ⚠ NEEDS HUMAN CONFIRMATION (permission semantics) |
| Q2 | Include `ensureShoppingList`, tasks, shopping, invitations? | No; lists and access only | One independently deployable capability per spec | reversible |
| Q3 | Should a viewer be told the list exists on forbidden writes? | Yes (`ForbiddenError`); non-members get `NotFoundError` | Matches engineering standards §3 | reversible |
| Q4 | How is membership revocation racing a write handled? | Role read inside the write transaction with `FOR SHARE` | Closes check-then-write race without new schema | reversible |
| Q5 | Protect the last owner? | No removal/demotion path exists in this scope; revisit in the members spec | Avoids new surface | reversible |
| Q6 | Row-level security or app-level checks? | App-level in `core` | Matches the binding architecture (authorization lives in `core`) | reversible |
