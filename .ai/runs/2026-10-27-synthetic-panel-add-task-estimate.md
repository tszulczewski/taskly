# Synthetic panel: adding tasks with an estimate and subtasks (prototype task-list-v1 rev 001)

- **Date:** 2026-10-27
- **Spec:** none (subject: `.ai/prototypes/discovery/task-list-v1/revision-001/index.html`; brief `.ai/specs/product-brief.md`)
- **Outcome:** success (synthetic hypotheses only; parity skipped)

## Goal
Run `om-synthetic-users` on the prototype: flow "dodanie zadań z szacunkiem i podzadań", stance validate, 2 runs × 2 personas. Output is synthetic hypotheses only.

## Steps taken
- 11:38 Read the skill references, brief, prototype README, research notes; user confirmed panel (FO + MO notes, parity skipped) and the empty-list start.
- Reserved session `.ai/specs/research/walkthroughs/2026-10-27-dodanie-zadan-z-szacunkiem-i-podzadan-session-001/`; wrote its `personas.md` (P07–P10).

- 11:38–11:49 Run 1 (P07, P08): interview with decision simulations, then walk in agent-browser (sessions `synth-r1-p07`, `synth-r1-p08`); P08 stopped at step 7, P07 at step 8.
- 11:49–11:57 Run 2 (P09, P10), fresh panel: past-tense interview → walk → decision simulations (order changed to remove priming found in run 1).
- 11:57–12:10 Consolidated; quality gate; wrote report, transcripts, shared personas, calibration.

## Files changed
- `.ai/specs/research/walkthroughs/2026-10-27-dodanie-zadan-z-szacunkiem-i-podzadan-session-001/` — `report.md`, `personas.md`, `transcripts/run-1-P07.md`, `run-1-P08.md`, `run-2-P09.md`, `run-2-P10.md`, `screenshots/` (33 PNGs)
- `.ai/specs/research/personas.md` — retitled as the shared file; P07–P10 appended, P01–P06 kept
- `.ai/specs/research/calibration.md` — new; one "parity skipped" line
- `.ai/lessons.md` — one entry

## Verification (commands run and results)
- Every judged screen captured with agent-browser 0.39.1 at 1280×900 (absolute paths); all browser sessions closed.
- Report scanned for "validated", "confirmed", "users said/want", and stated-preference questions: none. 10 findings, each with `[SYNTHETIC]` and a real-user check; 10 rows in *To confirm with real users*.
- Acquiescence: 5 yes / 5 no of 10 answered (6 no basis). Saturation: not reached.
- No code changed, so lint/build were not run (not applicable to research files).

## Problems / open questions
- Run 1's DS2 wording told P07/P08 the subtask rule before the walk, and the step-6 message hinted that "Details" is clickable; both recorded at the affected steps, and run 2 was run unprimed.
- The panel is homogeneous by construction (one note per segment); identical placeholder amounts and job titles across runs show it.
- Parity could not run: no held-out note.

## Lessons recorded (links into .ai/lessons.md)
- 2026-10-27 — decision simulations before the walk prime the persona; screenshot paths must be absolute.
