# Aligning epics E02 and E03 with the decisions made since filing

- **Date:** 2026-11-03
- **Spec:** none (backlog issues and a decision record; the E03 and E02 specs are not written yet)
- **Outcome:** success

## Goal
Before writing the E03 spec, bring the open epics and stories (#12, #13, #17–#21) in line with D22–D24 (R12–R18), the completed-tasks decision of 2026-10-21 and the prototype states s04.22–s04.29, and get the owner's answers on what those left open.

## Steps taken
1. Recommended E03 as the next spec (brief "Next", A01, completion before reorder).
2. Compared the issue bodies with the brief, the decision records, spec E01 and `.ai/design/reference.md`; asked the owner nine questions, then six follow-ups on the "no estimate" list and spaces.
3. Recorded the answers in `.ai/specs/research/decisions/2026-11-03-e02-e03-epic-alignment.md` (9 decisions, nothing open).
4. With the owner's confirmation: filed E03-S03 (#47, labels feature, priority-medium, risk-high); rewrote the bodies of #12, #13, #17, #18, #19, #20, #21, each with a "Changes (2026-11-03, epic alignment)" section where criteria changed, and replaced the outdated "no feature code" note. Previous bodies were saved in the session scratchpad before editing. No claim labels were set: the edits were single body replacements, as in the 2026-10-28 rewrite.
5. Updated `backlog.md`: E03-S03 row, #17's dependency on E03-S01, closed open points, a 2026-11-03 change list.

## Files changed
- `.ai/specs/research/decisions/2026-11-03-e02-e03-epic-alignment.md` (new)
- `.ai/specs/backlog.md`
- `.ai/runs/2026-11-03-e02-e03-epic-alignment.md` (this log)
- GitHub: #47 created; #12, #13, #17, #18, #19, #20, #21 edited.

## Verification (commands run and results)
- `npm run format:check`: passed ("All matched files use Prettier code style!").
- `npm run check:agents`: passed (29 routed paths exist; every AGENTS.md is routed and within budget).
- Re-read each edited issue body after `gh issue edit`: all seven updated.
- Code gate (lint, typecheck, test, build, audit, test:integration) not run: docs-only change, no code touched.

## Problems / open questions
- Two questions are left to the E03 spec in #47: whether a completed subtask without an estimate inside an open task is listed, and the wording of the collapsed line and whether it hides when nothing is missing.
- Not changed, for the owner to approve separately: the brief's R11 still says "the agent's reading of 'by user'" though the owner confirmed it; `.ai/design/reference.md` Luki pkt 5 says only E01 is English first, superseded for version 1 by decision 8.
- Labels of #19 (risk-low) were left as filed although its scope now includes new tables and seeding; SDLC.md treats schema migrations as risk-high, to re-evaluate when the spec is written.

## Lessons recorded (links into .ai/lessons.md)
- None: no new pitfall; the existing 2026-10-21 lesson (decisions before a spec go to `research/decisions/` with a pointer in `backlog.md`) was followed.
