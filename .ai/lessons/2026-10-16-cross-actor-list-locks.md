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
