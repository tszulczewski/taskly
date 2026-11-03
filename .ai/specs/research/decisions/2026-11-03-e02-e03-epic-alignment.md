# Aligning epics E02 and E03 with D22–D24 and the 2026-10-21 decisions

- Date, owner: 2026-11-03, product owner.
- Context: before the E03 and E02 specs are written, the agent compared the open epics and stories (#12, #13, #17–#21) with D22–D24 (R12–R18), the completed-tasks decision (`2026-10-21-completed-tasks-order.md`), the prototype states s04.22–s04.29 and `.ai/design/reference.md`, and asked the owner nine questions. The answers below are the owner's, given in the conversation of 2026-11-03 (two rounds).
- Decisions:
  1. **Reopening a task whose subtasks are all completed.** Reopening a task does not reopen its subtasks (R11 confirmed by the owner, no longer only the agent's reading). Its full summed estimate, completed subtasks included (R14), returns to future expenses. Goes into #20 as an acceptance criterion.
  2. **Confirmation when completing a task with open subtasks.** Completing a task that has open subtasks asks first: "Complete “…” and its N open subtasks?" (prototype state s04.26). Goes into #20.
  3. **Completed-tasks order.** The draft acceptance criteria of `2026-10-21-completed-tasks-order.md` are accepted: criteria 1–4 and 7 go into #20, criteria 5–6 into #17. Its point 3 (a reopened subtask is shown first among its task's subtasks) is confirmed by the owner.
  4. **Subtask reordering.** Subtasks can be reordered only within their own main task, by drag and drop too (and by the same keyboard and "Move up / Move down" alternatives as tasks). Moving a subtask to another task is out of scope. Completed subtasks cannot be dragged and the server rejects moving them (2026-10-21, points 5–6).
  5. **Scope of #17 (agent's recommendation, accepted).** #17 also covers "Move up / Move down" in the row's "…" menu and keyboard reordering (s04.22, s04.23), the refused move (s04.24), and the server's refusal to move a completed task or subtask as `ConflictError` (HTTP 409, the pattern from E01). #17 therefore depends on E03-S01 (#20), so E03 is specified and built before E02.
  6. **Spaces.** The owner gets a ready, simple list of spaces and can edit it and add new ones. Predefined: Salon, Sypialnia, Łazienka, Kuchnia, Garaż, Ogródek, Strych, Biuro ("Kuchani" in the owner's message read as "Kuchnia").
     - The predefined names are Polish from the start, although the UI stays English: they are the owner's data, like task titles, and the final UI translation does not touch them.
     - Editing covers renaming and deleting a space, predefined ones included.
     - Deleting a space that is assigned to tasks or subtasks removes it from them after a confirmation ("Remove “Garaż” from 4 tasks?"); deleting is not blocked.
     - The app assigns each space's dot colour itself, in turn from the six design-system colours; no colour picker in version 1.
     - Two spaces with the same name are refused, ignoring letter case ("łazienka" = "Łazienka").
     - Each user gets their own copy of the predefined list, since each owner edits their own (agent's reading, follows from "editable").
  7. **No inheritance.** A subtask does not inherit markers or spaces from its task; each has its own (D21). #18 and #19 each get one acceptance criterion for a subtask.
  8. **Language.** Version 1 stays in English to the end, E02 and E03 included; the Polish translation is done once at the end (supersedes, for version 1, the order in `.ai/design/reference.md` Luki pkt 5).
  9. **List of what still needs an estimate (new story E03-S03).** Under the future-expenses total, a collapsed line opens a list of what has no estimate, each item with "Add estimate", which opens the amount fields in place (R02.10, Luki pkt 9).
     - The list shows what really has to be priced: a task without subtasks and without an estimate, and each subtask without an estimate, labelled with its task ("Tiles · Bathroom tiles"). A task with subtasks is never listed itself, because it has no amount fields (R12).
     - A partly estimated task (some subtasks priced) is covered too: its unpriced subtasks are listed, so the total never looks complete when it is not (R13).
     - This is a separate story, E03-S03, not part of #21.
- Open: none.
- Affects: new story E03-S03; issues #12, #13, #17, #18, #19, #20, #21; `backlog.md`; the E03 and E02 specs.
- Status: active (owner's answers of 2026-11-03); issues and `backlog.md` not yet updated.
