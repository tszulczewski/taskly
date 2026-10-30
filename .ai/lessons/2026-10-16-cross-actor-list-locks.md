# Test list lock protocols across different actors

- **Date:** 2026-10-16
- **Trigger:** review
- **Related:** .ai/specs/2026-10-16-tasks-and-subtasks.md; packages/core/src/access.ts; packages/core/src/lists.ts

## Context
The tasks spec proposes taking the actor's membership lock before the list-row append lock and relies on membership-first ordering to coexist with list deletion.

## Finding
Membership rows differ across actors. An editor can hold their membership `FOR SHARE` while the owner holds their own membership `FOR UPDATE` and deletes the list. The delete locks the list and then waits to cascade-delete the editor's membership. The editor's subsequent list `FOR NO KEY UPDATE` waits for the delete, forming a cycle. An isolated SQL reproduction against local PostgreSQL returned `40P01`; both transactions were rolled back and all uniquely named fixture rows were removed.

## Resolution
Reported as a high-severity specification finding. No implementation or spec requirements changed during the review.

## Rule going forward
Define lock ordering across all participating rows and cascading mutations, rather than assuming per-actor authorization locks provide a common mutex. Concurrency tests must include distinct authorized actors and deliberate barriers. When transaction retries are the chosen recovery, retry the whole transaction and verify its externally visible result.

## Follow-up (2026-10-29, E01 task 1.4)
`deleteList` now locks every membership of the list `FOR UPDATE` (ordered by `user_id`) before `DELETE FROM lists`. How the test proves it (`packages/core/src/lists.integration.test.ts`):
- Give each actor a one-connection pool (`max: 1, idleTimeoutMillis: 0`) and read its `pg_backend_pid()` once; a barrier then polls `SELECT $2 = ANY(pg_blocking_pids($1))` until the waiter is blocked by that specific actor. This is exact where `pg_stat_activity` query-text matching is not, and it needs no sleeps.
- Only one ordering reproduces the old deadlock: the editor holds just its membership `FOR SHARE` when the delete starts, and locks the list row only after the delete is seen waiting. With the old code that gives `40P01`; with the fix the delete waits on the membership and the editor's list lock is free. The "delete first" ordering passed against the old code too (the cascade reached the editor's membership before the editor locked the list row), so it shows the clean 404 outcome, not the fix. Check each ordering against the unfixed code in a separate worktree before claiming it covers the fix.
- To stop a service midway without injecting into it, hold a row its cascade must touch (a task `FOR UPDATE`) in a third transaction.

## Follow-up (2026-10-29, E01 task 1.5)
Re-running both orderings with the real `createTask` needs a third "holder" transaction, because a service cannot be paused from outside: holding the list row `FOR SHARE` stops `createTask` after `requireRole`, at its append lock; holding a task `FOR UPDATE` stops `deleteList` in its cascade. These tests pass against the old `deleteList` too, so they pin the outcomes (no `40P01`, 404 for the loser, nothing left), not the fix; only the hand-written 1.4 test (editor paused between `requireRole` and the list lock while the delete takes the list row) fails on the old code. Also, with the holder in place `pg_blocking_pids(delete)` already listed the editor on the old code: the editor was queued ahead of the delete for the same list row (PostgreSQL's "soft block"). A barrier on `pg_blocking_pids` proves who is ahead in a queue, not who holds the lock; check with `pg_locks` (`granted`) when that difference matters.

## Follow-up (2026-10-29, E01 task 1.6)
`deleteTask` (editor) vs `deleteList` (owner) cannot deadlock even with the old `deleteList`: its cascade blocked on the editor's membership row before it touched `tasks` (observed; not a documented PostgreSQL ordering), and `deleteTask` locks only its own membership and then the task row, never the list row. A probe that paused the editor between `requireRole` and `requireTaskRole` passed 3/3 against the old code. So the cycle needs a writer that locks the list row (an append); tests of writers that touch only task rows pin outcomes (`null` / 404, nothing left), not the all-members lock. Check against the unfixed code before claiming a concurrency test covers the fix.

## Follow-up (2026-10-30, E01 task 3.1)
Pausing services on row locks for the subtask races (`packages/core/src/tasks.integration.test.ts`, "subtasks under concurrency"):
- A `FOR KEY SHARE` request is granted while a `FOR UPDATE` request waits on the same row behind another `FOR KEY SHARE` holder: PostgreSQL does not queue a locker whose mode is compatible with the current (lock-only) holders. So a holder of the parent `FOR KEY SHARE` stops an estimate edit (`requireTaskRole`'s `FOR UPDATE`) while a subtask insert (explicit `FOR KEY SHARE` plus the FK check's implicit one) passes it and commits; the edit then gets the 409. This is the spec's "409 path", and it passes reliably (5 of 5 runs).
- To stop a service right after an explicit row lock, before its insert's FK check, make the insert wait at the unique index: a holder inserts an uncommitted row with the same `(list_id, parent_id, position)` key the service will pick, then rolls back (drizzle `tx.rollback()` inside the held transaction). The service waits for the holder at its insert's unique check, holding only its explicit lock. That is how the "add locks the parent first" ordering is pinned: without the explicit `FOR KEY SHARE`, the parent delete takes the parent once the holder is gone and the add fails with a 404 instead of being cascaded.
- When a row is held by several `FOR KEY SHARE` lockers (a multixact), a `FOR UPDATE` waiter waits on the members one at a time; `pg_blocking_pids` showed the first locker (the holder), not the later one. Barrier on the holder in that case.
