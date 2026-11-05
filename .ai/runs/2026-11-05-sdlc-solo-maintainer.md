# SDLC: solo-maintainer path for risk-high PRs

- **Date:** 2026-11-05
- **Spec:** none
- **Outcome:** success

## Goal
The project has one human. `SDLC.md` required a second person's review for auth/money and banned self-QA on `risk-high`, so such PRs could never merge (PR #58 was squash-merged by hand). The maintainer asked for this as a PR.

## Steps taken
1. Added **Solo maintainer** to `SDLC.md`. The second person's review becomes an independent `om-auto-review-pr` report (from a run that did not write or fix the change). QA becomes a manual pass by the maintainer with self-QA evidence and `QA head:`. The PR also needs a `Maintainer sign-off: <sha>` comment, and all three must match the head. Agents still never apply `qa-approved` or sign off on `risk-high`.
2. Pointed the existing high-risk references (author-account section, risk table, no-self-QA rule) at the new section.
3. Extended the repo-local overlays (`om-approve-merge-pr`, `om-merge-buddy`, `om-pr-autopilot`, `om-auto-qa-pr`, `om-auto-review-pr`) to apply it.

## Files changed
`SDLC.md`, `.ai/skills/{om-approve-merge-pr,om-merge-buddy,om-pr-autopilot,om-auto-qa-pr,om-auto-review-pr}/SKILL.md`

## Verification (commands run and results)
format:check, lint, check:agents, typecheck: pass. test, build, audit, test:integration: skipped (docs and skill overlays only, no code).

## Problems / open questions
Under the new rule, the PR #58 re-review would not count as independent, because that run pushed the fix itself. #58 is already merged, so nothing changes there.

## Lessons recorded (links into .ai/lessons.md)
None: the rule lives in `SDLC.md`.
