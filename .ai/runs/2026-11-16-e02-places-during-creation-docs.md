# E02 places-during-creation requirements on main; epics tidied

- **Date:** 2026-11-16
- **Spec:** .ai/specs/2026-11-03-order-markers-and-spaces.md
- **Outcome:** success

## Goal

The owner noticed the epics still listed finished stories. Owner's decisions: (1) tick and close the epics whose stories are all done; (2b) keep #19 closed as AC1–AC10 and move AC11–AC18 (places while creating a task, added on 2026-11-13) to a new story; and bring the requirements, which were only on the unpushed autosave branch `cez/bc6af6f3`, to `main` now.

## Steps taken

1. Tracker check: stories #15–#21 and #47 were all closed, but epics #11, #12 and #13 were open with unticked `om-backlog` checklists. #19 had been closed by #75's `Closes #19`, although its 2026-11-13 section (AC11–AC18) and the note in #12 said the extension was not delivered.
2. Tracker changes: #11 and #13 got ticked checklists and corrected status text, then were closed (completed) with a comment naming the delivering PRs. In #12, #17, #18 and #19 are ticked, #83 is added, and a 2026-11-16 note was added. New story #83 (E02-S04) has the problem, outcome, non-goals, AC11–AC18 and contract copied verbatim from #19, labelled `feature`, `priority-medium`, `risk-high`. A comment on #19 explains the split.
3. Branch `docs/e02-places-during-creation` from `main` (2fa5f04). The E02 spec moved back from `specs/implemented/` to `specs/`, because the extension is not implemented. Then the `cez/bc6af6f3` changes to the spec, brief, backlog and lessons were applied with `git apply --3way`. Only `.ai/lessons.md` conflicted (index lines; both kept). The 2026-11-13 analysis and run log were copied unchanged.
4. Spec: the status line now says Phases 1–3 shipped (#69, #75) and the extension (#83) is open. A 2026-11-16 revision line was added. References to the extension now point to #83 (AC list, contract heading, UI/UX heading, phasing). No requirement text changed.
5. Brief: the delivery line points to E02-S04 #83. Backlog: an E02-S04 row, a 2026-11-16 note, and the E02 status sentence.
6. Path references to `specs/implemented/2026-11-03-order-markers-and-spaces.md` were updated in the QA scenarios (MARKERS, PLACES, REORDER), the Storybook docs (`WhatIsMissing.mdx`, `Screens.mdx`, `E02OrderMarkersPlaces.mdx`) and the backlog. Run logs and analyses were left as history.

## Files changed

`.ai/specs/2026-11-03-order-markers-and-spaces.md` (moved and edited), `.ai/specs/product-brief.md`, `.ai/specs/backlog.md`, `.ai/lessons.md`, `.ai/analysis/2026-11-13-places-during-task-creation.md` and `.ai/runs/2026-11-13-places-during-task-creation.md` (both from `cez/bc6af6f3`), 12 QA scenario files, 3 Storybook MDX files, this log.

## Verification (commands run and results)

See the PR. Docs-only: no code, schema or test changes.

## Problems / open questions

- #19 was closed with unbuilt criteria because #75's body said `Closes #19` (my mistake in that run). Fixed by the split; lesson recorded.
- AC numbering in #83 continues #19's (AC11–AC18), because the spec, brief and analysis cite those ids.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-16 — read the whole issue before `Closes #N`; tick epic checklists and close finished epics after merges.
