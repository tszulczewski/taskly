# Drive PR #94 to merge-ready (round 2)

- **Date:** 2026-11-25
- **Spec:** none
- **Outcome:** partial (local gate green; CI Integration red only on browser flakes outside this PR's diff, filed as #102)

## Goal
Take [PR #94](https://github.com/tszulczewski/taskly/pull/94) from `blocked` (red Integration check after round 1, `.ai/runs/2026-11-25-auto-fix-pr-94.md`) to merge-ready, without merging it.

## Steps taken
- Claimed the PR (atomic lock `refs/om-locks/pr-94`, claim comment, `in-progress`). Base `main` (`17bbce2`) was already merged.
- Re-reviewed `44fb59b..0e641dd` (the last approved head to now). Found one defect in the round-1 merge: the threat model's "Unit tests (to add)" row had the `apiHandler` item back that `main` had moved to "existing" (#76). Restored `main`'s row.
- Classified the CI Integration failures on `0e641dd`. REORDER-001 (keyboard move) also fails on `main` at the same SHA (run 45560029468). The rerun's `future-expenses-browser` failure clicks a subtask checkbox while the expanded task is still animating open ("covered by `<li…>`"). Neither test is changed by this PR, so both were filed as #102 instead of being fixed here.

## Files changed
- `.ai/docs/security/threat-model.md`
- `.ai/lessons.md`
- `.ai/runs/2026-11-25-auto-fix-pr-94-round-2.md`

## Verification (commands run and results)
All with `TMPDIR=/tmp/pr94t`, on `0e641dd` plus the threat-model fix:
- `npm run format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck` passed.
- `npm test` passed: 89 files, 1309 tests, 100% coverage.
- `npm run build` passed. `npm run audit` passed (4 moderate dev-dependency advisories, under the `high` threshold).
- `npm run test:integration` passed: 24 files, 307 tests.

## Problems / open questions
- GitHub has no independent approval: the reviewer account is the PR author. The QA gate (`needs-qa`) still needs a human sign-off.

## Lessons recorded (links into .ai/lessons.md)
- 2026-11-25: check doc-table merge resolutions against `origin/main`.
