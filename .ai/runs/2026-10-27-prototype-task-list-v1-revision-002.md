# Discovery prototype task-list-v1, revision 002

- **Date:** 2026-10-27
- **Spec:** none (prototype of the brief's "Future state" flow; E01 `.ai/specs/2026-10-16-tasks-and-subtasks.md` read for context)
- **Outcome:** success

## Goal
Build revision 002 of `.ai/prototypes/discovery/task-list-v1/` with `om-mockup-prototype --refresh`, addressing the `[SYNTHETIC]` findings of `.ai/specs/research/walkthroughs/2026-10-27-dodanie-zadan-z-szacunkiem-i-podzadan-session-001/report.md` without changing brief rules. Owner confirmed changes C1–C7 and English UI on 2026-10-27.

## Steps taken
- Validated revision-001 ownership: format, skill, slug, path, all 17 SHA-256 values match; no symlinks; no manual changes.
- Created `revision-002/` from a copy of revision-001's `index.html`.
- Implemented C1–C7:
  - estimate inline in quick add and in the subtask form, with a "+ Description" toggle;
  - the reference note and the "(reference)" label on subtasks;
  - the missing-estimate line names the tasks, each with a button;
  - "Add estimate" short form on rows;
  - edit form reordered, with markers and places behind a toggle;
  - subtask counter wording.
- Static review, then a browser walk V01–V21 with agent-browser 0.39.1, session `proto-tasklist-002`. One CSS tweak during the walk (smaller in-row button); the screenshots were retaken.
- Wrote README.md (changes, assumptions A-P12–A-P17, superseded A-P03/A-P07, E01 relation, checks) and prototype.json (20 files, verification passed).

## Files changed
- `.ai/prototypes/discovery/task-list-v1/revision-002/` (new): `index.html`, `README.md`, `prototype.json`, `evidence/01…18-*.png`
- `.ai/runs/2026-10-27-prototype-task-list-v1-revision-002.md` (this log)
- Unchanged: revision-001 (hashes rechecked), the brief, the specs, `.uxproof/`, application code.

## Verification (commands run and results)
- `node --check` on the extracted script: OK. Grep for URLs, fetch, storage, innerHTML, external src: none.
- Browser walk V01–V21 at 1280×900 and 360×780: all as expected; session closed. Details in the revision README.
- Not run: real screen reader. No app lint/build: no application code changed.

## Problems / open questions
- C1 departs from E01's quick add ("Details" disclosure). Adopting it needs an E01 change approved by the owner.
- The panel's main contradiction (R06/D15, no roll-up) is still open and needs the owner's decision. It is not touched here.

## Lessons recorded (links into .ai/lessons.md)
- None new. The absolute-path screenshot lesson from 2026-10-27 was applied.

## Update 2026-10-27: real test, owner decisions, brief refresh

- **Test, relayed by the owner.** The owner tested revision 002 with the same future owner and moved-in owner as the 2026-10-15 notes. Notes: `.ai/specs/research/interviews/2026-10-27-prototype-test-person-{1,2}-via-owner.md`. The owner's own use: `interviews/2026-10-27-owner-prototype-use.md`.
- **Owner decisions:**
  - Subtask estimates roll up into their task: `decisions/2026-10-27-subtask-estimate-rollup.md`.
  - An exact price is typed once: `decisions/2026-10-27-exact-price-single-amount.md`.
  - Quick add with Min/Max shown inline (C1) goes into E01 and the design system (owner: "Tak").
- **Brief refresh.** `om-discover --refresh` wrote `.ai/specs/product-brief.md`:
  - New rows: R12–R18 and D22–D24.
  - Superseded: R06, R07, R08, D15, D16.
  - Coverage: 80 claims, 74 sourced.
  - Skeptic review was done inline only.
- **Not yet updated:**
  - spec E01 (`.ai/specs/2026-10-16-tasks-and-subtasks.md`);
  - issues #15 (AC6) and #16 (AC2/AC3 assert R06);
  - `backlog.md`;
  - the design system (`QuickAdd`, `EstimateRange`, `formatPlnRange`, `UnestimatedTasks`);
  - the styled prototype `prototypes/task-list-v1/`.

  A handoff prompt for a new session was given to the owner.
- **Nothing committed.**
