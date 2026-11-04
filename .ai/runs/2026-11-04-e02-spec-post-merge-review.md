# E02 spec post-merge review and fixes

- **Date:** 2026-11-04
- **Spec:** .ai/specs/2026-11-03-order-markers-and-spaces.md
- **Outcome:** success

## Goal

Review the merged E02 spec (#53, head 15388c0) with `om-auto-review-pr` as a specification review, read-only, then apply the owner-approved fixes in a docs PR.

## Steps taken

1. #53 was already merged, so no claim, labels or GitHub review: the review was reported in the session only.
2. Grounded the spec against `main` (1d93282): `tasks.ts`, `access.ts`, `schema.ts`, `use-tasks.ts`, `sortable.tsx`, `task-row.tsx`, `task-list.tsx`, the design-system docs, the E03 spec after #54, and the bodies of #17, #18 and #19 (the audit had not checked the tracker's criteria; they match the spec).
3. Findings: one major (P1), four minor (P2–P5), three nits (P6–P8); see the spec's "Review changes (2026-11-04)".
4. The owner chose P1 option (a), "no reordering while an add is saving", and approved the rest and the config fix.
5. Applied the fixes to the spec body, edge cases, acceptance criteria (new M-3) and Implementation Plan steps; set `baseBranch` to `main` in `.ai/agentic.config.json`.

## Files changed

- `.ai/specs/2026-11-03-order-markers-and-spaces.md` (P1–P8, revision note, review table)
- `.ai/agentic.config.json` (`baseBranch: "main"`)
- `.ai/lessons.md` (one lesson)
- this run log

## Verification (commands run and results)

- At the #53 head, in a temporary worktree: `npm run format:check` passed, `npm run check:agents` passed. CI on #53 was green.
- On this branch: `npm run format:check` passed, `npm run check:agents` passed.
- Skipped (no code changed): `lint`, `typecheck`, `test`, `build`, `audit`, `test:integration`; left to CI.

## Problems / open questions

- P1 is applied list-wide, not per sibling group: `TaskList` passes one `onMove` to the top level and to every task's subtasks (`task-list.tsx:188`), so pausing only one group would need a design-system change. Accepted because an add saves in well under a second.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-04 — a move computed from a group that hides temporary rows (index entry).

## Follow-up (2026-11-04): review of #55

- `om-auto-review-pr` on #55 approved it at `ab1814a` (author-account comment review, full gate and CI green) with two minors. The owner asked for both to be fixed:
  - P9: the replay skips a queued `place` tick whose place is no longer in the places cache (deleted meanwhile); its 404 answer refetches as before. Added to the replay, Places, Edge cases and step 12.
  - P10: the P1 reorder pause covers a temporary subtask too; M-3, step 17 and Edge cases now include a subtask add.
- The two nits (an older in-flight answer briefly undoing a rename; `"auto"` in the config being the default-branch value, not a branch) were left as they are.
- Verification: `npm run format:check` passed, `npm run check:agents` passed. Docs only, so the rest of the gate is left to CI.
