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
| E02-S01 | #17 | The owner can reorder tasks and the order persists | medium, medium | E01-S01, E03-S01 |
| E02-S02 | #18 | The owner can mark a task or subtask important and/or urgent, independently | medium, high | E01-S01 |
| E02-S03 | #19 | The owner can assign a task or subtask to several spaces at once | medium, high | E01-S01 |
| E03 | #13 | Completion and future expenses | medium, high | none |
| E03-S01 | #20 | The owner can complete and reopen tasks and subtasks | medium, medium | E01-S02 |
| E03-S02 | #21 | The owner sees future expenses as one min–max range | medium, high | E01-S01, E03-S01 |
| E03-S03 | #47 | The owner sees what still has no estimate and can add one from future expenses | medium, high | E03-S02 |
| E04 | #14 | Later (parked) | low, low | none |

Open points left in the issue bodies at filing are closed. Subtask nesting depth (one level), editing and deleting tasks, rejecting min above max, and spaces as their own entity rather than lists were settled by spec E01 (`implemented/2026-10-16-tasks-and-subtasks.md`); how spaces are created and whether subtasks reorder were decided on 2026-11-03 (below). E03 (#20, #21, #47) is implemented by spec E03 (`implemented/2026-11-03-completion-and-future-expenses.md`; PRs #56, #58, #62). E02 (#18, #19, #17) is implemented by spec E02 (`implemented/2026-11-03-order-markers-and-spaces.md`; stacked PRs #69 markers, #70 places, then reorder).

Decisions made after filing, to apply when writing the E02 and E03 specs: order of completed tasks, reopening, and no drag of completed tasks (server rejects the move) — `research/decisions/2026-10-21-completed-tasks-order.md` (affects E03-S01 #20, E02-S01 #17).

Decisions made after filing (2026-10-27, D22–D24, brief refresh): subtask estimates add up into their task (R12–R15) and an exact price is typed once (R18) — `research/decisions/2026-10-27-subtask-estimate-rollup.md`, `research/decisions/2026-10-27-exact-price-single-amount.md`.

- **E01-S01 #15:** AC6 "both amounts or neither" replaced by the exact price (R18); new AC7, amounts beside the title in quick add (C1). Rewritten 2026-10-28.
- **E01-S02 #16:** retitled; AC2/AC3 (R06, parent unchanged) replaced by roll-up criteria (R12–R15). Rewritten 2026-10-28; covered by spec E01, revision 2026-10-28.
- **E03-S01 #20:** new AC6: completing subtasks does not change the task's estimate (R14). Added 2026-10-28.
- **E03-S02 #21:** the total counts each open main task with its summed estimate (`rollUpEstimate` from spec E01) and never counts subtasks a second time (R17, replacing R08). Its AC2 ("subtask estimates are not counted", R06/R08) must be rewritten; an exact price shows as one amount (R18), and amounts use the "1 500–2 700 zł" format.

Decisions made after filing (2026-11-03, epic alignment): `research/decisions/2026-11-03-e02-e03-epic-alignment.md`. Version 1 stays in English to the end; E03 is specified and built before E02.

- **E03-S01 #20:** new AC7 (reopening a task whose subtasks are all completed brings its full summed estimate back), AC8 (confirmation before completing a task with open subtasks), AC9–AC13 (the 2026-10-21 completed-tasks criteria 1–4 and 7). R11's "reopening a task does not reopen its subtasks" is confirmed by the owner.
- **E03-S02 #21:** the list of what still has no estimate moved out to E03-S03.
- **E03-S03 #47 (new):** the list of what still has no estimate, with "Add estimate": tasks without subtasks and subtasks, never a task with subtasks; partly estimated tasks list their unpriced subtasks; completed subtasks are not listed; the line hides when nothing is missing (brief D27).
- **E02-S01 #17:** depends on E03-S01; subtasks reorder within their own task only, by drag and drop too; "Move up / Move down" and the keyboard; the refused move; 2026-10-21 criteria 5–6, the server refusing with 409.
- **E02-S02 #18, E02-S03 #19:** no inheritance of markers or spaces between a task and its subtasks. #19 adds the predefined, editable spaces (Polish names, rename, delete with confirmation, colour assigned by the app, case-insensitive unique names).
- **Brief:** R11 and Q18 confirmed; D25 (subtask reordering), D26 (spaces), D27 (the list of what has no estimate) added. Place colours: the app assigns them in turn from 10 colours, repeating from the eleventh, and the owner can change one; at most 20 places (replacing G4's picker and G5's limit of 10). #18 and #19 raised to `risk-high` (schema migrations, SDLC.md).
