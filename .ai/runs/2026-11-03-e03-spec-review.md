# E03 specification review

- **Date:** 2026-11-03
- **Spec:** .ai/specs/2026-11-03-completion-and-future-expenses.md
- **Outcome:** partial

## Goal
Review the E03 draft against current contracts, implementation, and project rules; no implementation changes.

## Steps taken
- Loaded review skill, configuration, lessons and repository review rules.
- Reviewing completion, future expenses, concurrency and client cache design.

## Files changed
- This run log only.

## Verification (commands run and results)
- Configured gate pending; detailed command output kept under /tmp/taskly-e03-review.

## Problems / open questions
- Review targets a draft specification, not implemented behavior; passing existing tests does not validate the proposed feature.

## Lessons recorded (links into .ai/lessons.md)
- None yet.

## Review evidence
- Scope: the untracked E03 draft only; existing source inspected as context. Default branch resolved to `main`.
- Read #20, #21 and #47 acceptance criteria through the configured GitHub tracker; no tracker mutations.
- Major: spec line 83 places the isomorphic helper and database service in one module, contradicting engineering standards §1. Split the helper and server service into separate modules.
- Major: spec lines 173–176 replace a parent view without replaying newer optimistic completion operations. A probe using the installed QueryClient with a shared scope observed: complete optimistic true → reopen optimistic false → complete response true → reopen request pending with cache true. Scope queues requests but not onMutate. Require a confirmed base plus replay of pending operations, including rollback and parent/subtask overlap.
- Existing `summarize`, `listSummary`, `globalSummary` consumers searched under `packages/`; only declarations, barrel exports and tests found. Removal fits internal-workspace policy; HTTP additions and unchanged DB representation are compatible.
- Browser manual verification of the proposed feature is unavailable because it is not implemented; existing browser integration suite is in the configured gate.

## Verification update
- format:check, lint, check:agents, typecheck, npm test, build and audit passed.
- Unit suite: 72 files, 947 tests; statements/branches/functions/lines all 100%.
- Audit exits 0 at the configured high threshold, reporting four moderate findings in the existing esbuild/drizzle-kit chain.
- Integration gate still running.

## Lessons update
- Added the verified mutation-scope behavior to `.ai/lessons.md`.

## Final result
- **Outcome:** success (review completed).
- **Verdict:** request changes — two major design findings above; no blocker found in the reviewed draft.
- All eight configured validation commands passed with exit 0. Integration suite: 15 files, 163 tests, 110.3 seconds; includes the existing browser flows.
- Required proposed regression cases: complete → reopen with the first response delayed; both request-failure orderings; parent completion concurrent with a subtask toggle; an unrelated edit response while completion remains pending. Add these in `packages/app/components/tasks/use-tasks.test.tsx`, plus a delayed-response browser case in the planned completion integration test.
- Future-expenses helper must stay isomorphic; its service must have a separate server-only module. Verify the production build with the actual barrel exports when implementing Phase 2.
- The passing gate validates current code, not the future E03 implementation. No application source or specification requirements were changed, no commits made, no review posted externally.

## Re-review started
- Requested after the R1/R2 revision. Re-read the complete revised draft and prior findings.
- Checking module separation, pending-completion replay, request ordering and regression plans.
- Re-running the full configured validation gate; fresh output under `/tmp/taskly-e03-rereview`.

## Re-review findings and evidence
- R1 resolved at revised spec lines 85–88: helper and service have separate modules and entry points; the service is explicitly server-only, with a real-barrel build check in Phase 2.
- R2 resolved at revised spec lines 176–185 and steps 5–6: the screen derives its completion state from confirmed data plus pending operations. Parent/subtask requests share a scope, callbacks are hook-level, and the regression cases cover delayed answers and both failure orderings.
- A fresh installed-QueryClient probe of the proposed replay mechanism passed complete → reopen with no failures, first request refused, and second request refused. While reopening remained pending, the first completion answer did not change the derived view back to completed; final states matched the confirmed result.
- Checked the installed `useMutationState` implementation: it reads matching mutations from the mutation cache; queued requests remain pending and are included. The proposed replay can therefore include queued toggles.
- No new blocker or major design findings identified. The draft keeps existing product decisions and the additive HTTP/unchanged DB contracts.
- Scope remains specification review; actual React rendering, cascade/reopen ordering and browser regressions must be verified in the planned implementation tests.

## Re-review final result
- **Outcome:** success.
- **Verdict:** approve (revised specification). R1 and R2 are resolved; no new actionable findings.
- All eight configured commands were rerun and passed with exit 0, in order: format:check (7.5s), lint (10.6s), check:agents (0.2s), typecheck (21.4s), test (29.9s), build (6.9s), audit (1.3s), test:integration (109.0s).
- Unit results: 72 files / 947 tests, 100% statements, branches, functions and lines. Integration results: 15 files / 163 tests.
- Audit reports four moderate findings; exits 0 at the configured high threshold.
- This approval concerns the revised design. The passing suites cover the current implementation; the E03 regression cases are still planned implementation work.
- Only appended to this review log during re-review; no specification or application changes, no commits or tracker mutations.
