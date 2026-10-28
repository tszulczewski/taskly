# Backlog

## Source: `.ai/specs/product-brief.md`

Filed 2026-10-16 with `om-backlog` through `om-prepare-issue`. Each issue carries `Backlog source:` and `Backlog id:` lines. The tracker is the live authority; this file is the source-to-issue map and the reserved ids.

| Id | Issue | Title | Priority, risk | Depends on |
|---|---|---|---|---|
| E01 | #11 | Tasks and subtasks | medium, high | none |
| E01-S01 | #15 | The owner can add a task with a description and an estimate range and see it in the list | medium, high | none |
| E01-S01-T01 | #22 | Schema migration for tasks (story: #15) | medium, high | none |
| E01-S02 | #16 | The owner can add subtasks with their own estimate, and the task's estimate becomes their sum | medium, high | E01-S01 |
| E02 | #12 | Order, markers and spaces | medium, medium | none |
| E02-S01 | #17 | The owner can reorder tasks and the order persists | medium, medium | E01-S01 |
| E02-S02 | #18 | The owner can mark a task or subtask important and/or urgent, independently | medium, low | E01-S01 |
| E02-S03 | #19 | The owner can assign a task or subtask to several spaces at once | medium, low | E01-S01 |
| E03 | #13 | Completion and future expenses | medium, high | none |
| E03-S01 | #20 | The owner can complete and reopen tasks and subtasks | medium, medium | E01-S02 |
| E03-S02 | #21 | The owner sees future expenses as one min–max range | medium, high | E01-S01, E03-S01 |
| E04 | #14 | Later (parked) | low, low | none |

Open points left in the issue bodies, not decided: how spaces relate to project lists and how they are created; subtask nesting depth; editing and deleting tasks; rejecting min above max.

Decisions made after filing, to apply when writing the E02 and E03 specs: order of completed tasks, reopening, and no drag of completed tasks (server rejects the move) — `research/decisions/2026-10-21-completed-tasks-order.md` (affects E03-S01 #20, E02-S01 #17).

Decisions made after filing (2026-10-27, D22–D24, brief refresh): subtask estimates add up into their task (R12–R15) and an exact price is typed once (R18) — `research/decisions/2026-10-27-subtask-estimate-rollup.md`, `research/decisions/2026-10-27-exact-price-single-amount.md`.

- **E01-S01 #15:** AC6 "both amounts or neither" replaced by the exact price (R18); new AC7, amounts beside the title in quick add (C1). Rewritten 2026-10-28.
- **E01-S02 #16:** retitled; AC2/AC3 (R06, parent unchanged) replaced by roll-up criteria (R12–R15). Rewritten 2026-10-28; covered by spec E01, revision 2026-10-28.
- **E03-S01 #20:** new AC6: completing subtasks does not change the task's estimate (R14). Added 2026-10-28.
- **E03-S02 #21:** the total counts each open main task with its summed estimate (`rollUpEstimate` from spec E01) and never counts subtasks a second time (R17, replacing R08). Its AC2 ("subtask estimates are not counted", R06/R08) must be rewritten; an exact price shows as one amount (R18), and amounts use the "1 500–2 700 zł" format.
