# PR #95 conflict resolution

- **Date:** 2026-11-24
- **Spec:** none (auth security issue #77)
- **Outcome:** partial

## Goal
Resolve PR #95's conflicts with `main` and verify the merge result.

## Steps taken
- Inspected PR #95, its review history, current head, base, labels and CI.
- Compared the PR head with the current `main`; only `.ai/docs/security/threat-model.md` and `.ai/lessons.md` conflict.
- Fast-forwarded local `fix/issue-77-sign-in-rate-limit` to PR head `399a265`, then merged `origin/main` (`09e7227`). Resolved the two documentation conflicts while retaining updates from both branches.

## Files changed
- `.ai/docs/security/threat-model.md` — kept the sign-in 429 test in the existing integration tests row and preserved the newer existing unit test coverage from `main`.
- `.ai/lessons.md` — preserved the new #99 lesson along with the three #95 lessons, ordered by date.
- The merge also brings in all files from `main` through `09e7227`.
- This run log.

## Verification (commands run and results)
- `git diff --check` — passed.
- Conflict marker scan on both resolved files — no markers remain.
- `npm run format:check` — passed.
- `npm run check:agents` — passed (30 routed paths).

## Problems / open questions
- The merge commit has not been pushed. The new remote PR head will need a fresh review; the prior approval is pinned to `399a265` and this run wrote the merge change, so it cannot count as an independent high-risk review.
- Manual QA and Solo-maintainer records still gate merge per `SDLC.md`.

## Lessons recorded (links into .ai/lessons.md)
- None.
