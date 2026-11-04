# E02/E03 metadata cleanup

- **Date:** 2026-11-04
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md
- **Outcome:** success

## Goal

Apply the owner-requested cleanup identified by the implementation-order analysis: E03 readiness metadata, the target branch, and stale issue references to unwritten specifications. Preserve feature requirements and the agreed E03-before-E02 order.

## Steps taken

1. Read lessons, the GitHub tracker descriptor, configuration and the affected metadata. Checked open E02/E03 issues for stale specification notes and active claims.
2. Set E03 to ready with the date and owner authorization; corrected its phase target from auto to main.
3. Updated the bodies of issues #12, #13, #17, #18, #19, #20, #21 and #47 with links to their existing specs. Corrected an old E01 spec path in #21. Each body was backed up, checked for concurrent edits and read back after updating. Titles, labels, dependencies and acceptance criteria were preserved.
4. Reconciled Storybook epic pages, the coverage matrix and task screens: existing ready specs, implementation pending, E03-S03, limit 20, decided places ownership and current risk classifications. Preserved the historical analysis and run logs.

## Files changed

- .ai/specs/2026-11-03-completion-and-future-expenses.md.
- .ai/lessons.md (metadata reconciliation lesson).
- packages/ui/.storybook/docs/system/epics/E02OrderMarkersPlaces.mdx and E03CompletionAndExpenses.mdx.
- packages/ui/.storybook/docs/system/WhatIsMissing.mdx.
- packages/ui/.storybook/docs/product/tasks/Screens.mdx.
- This log.

## Verification (commands run and results)

- GitHub: all eight updated issue bodies match the prepared bodies on read-back. Backups: /tmp/taskly-epic-metadata-oq74yit2.
- npm run format:check, npm run check:agents, npm run check:tokens: passed.
- npm run test:storybook: passed, 120 files / 926 tests, 66.73 seconds. npm run build-storybook: passed. Logs: /tmp/taskly-epic-metadata-checks-frq_eepe.
- git diff --check: passed. Active docs searched for stale no-spec/auto text; no matches remained.
- Application lint, typecheck, unit tests, Next build, audit and integration suite skipped: documentation and tracker metadata only; no application code changed.

## Problems / open questions

- No open blockers. Source and spec edits are local and uncommitted; issue-body edits are already applied on GitHub. The implementation-order analysis remains a dated record of the state before this cleanup.

## Lessons recorded (links into .ai/lessons.md)

- Added the 2026-11-04 lesson on reconciling readiness, branch metadata and issue references after approval.
