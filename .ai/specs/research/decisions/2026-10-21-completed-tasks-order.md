# Order of completed tasks, reopening and drag (input for the E02/E03 specs)

- Date, owner: 2026-10-21, product owner.
- Context: design references session (`.ai/design/reference.md`, row R02.2 and Luki pkt 10). The owner decided how completed tasks behave in the list. No E02 or E03 spec exists yet; the owner will write them soon. Apply these decisions there and copy the acceptance criteria below into the spec (and issue #20 / #17 if they are updated).
- Decisions:
  1. A completed task stays in the list, muted (`color-text-muted`) and struck through, and is shown at the end of the list.
  2. A completed subtask is shown at the end of its own task's subtasks.
  3. A reopened task is shown first in the list; a reopened subtask first among its task's subtasks (the subtask half is the agent's reading, not contradicted).
  4. "At the end" is display order only, not a change of the stored order: the list sorts open before completed, then by `position COLLATE "C"`, then `id`. Completing changes only the status, so the R09 cascade writes no `position`. Reopening is one `UPDATE` of one row: status and a new `position` before its first sibling. Agent's recommendation, accepted by the owner. Consequence: completed tasks appear in plan order, not completion order.
  5. Completed tasks and subtasks cannot be dragged.
  6. The server rejects moving a completed task or subtask: the `core` move service returns an error, not only the UI (fail closed; business rules live in `core`). Accepted by the owner.
- Alternative rejected: writing a new `position` after the last sibling on completion (needs the list lock used by appends and an extra write per completion).
- Proposed acceptance criteria (agent's draft, for the spec):
  1. Given open tasks A, B, C in this order, when the owner completes A, then the list shows B, C, A, with A muted and struck through, and A's stored `position` is unchanged.
  2. Given a task with subtasks s1, s2, s3, when the owner completes s1, then s1 is shown after s2 and s3 within its task.
  3. Given a completed task, when the owner reopens it, then it is shown first in the list; only that row is updated (status and a `position` before its first sibling).
  4. Given a completed subtask, when the owner reopens it, then it is shown first among its task's subtasks.
  5. Completed tasks and subtasks cannot be dragged in the UI.
  6. Given a completed task, when a move request for it reaches the server, then it is rejected and no `position` changes.
  7. Completing a task that has subtasks (R09) changes no row's `position`.
- Affects: E03-S01 (#20, completion and reopening), E02-S01 (#17, reorder and `moveTask`), and `listTasks` (sorted today by `position` only, per `.ai/specs/2026-10-16-tasks-and-subtasks.md`).
- Open: the error code and message for rejecting a move of a completed task (decide in the E02-S01 spec; the existing pattern is `ConflictError`).
- Source: conversation of 2026-10-21; `.ai/design/reference.md` (R02.2, Luki pkt 10).
- Status: active (owner accepted on 2026-10-21).
