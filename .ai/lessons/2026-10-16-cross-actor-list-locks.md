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
