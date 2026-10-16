# Apply tasks specification review corrections

- **Date:** 2026-10-16
- **Spec:** .ai/specs/2026-10-16-tasks-and-subtasks.md
- **Outcome:** success

## Goal
Apply the three review corrections approved by the user: concurrent task/list mutation safety, Zod response validation, and browser-test account creation compatible with closed sign-up.

## Steps taken
- Read current spec, project lessons, engineering standards, and the prerequisite auth spec. Preserve edits made since the review.
- Plan: retain and clarify the existing lock-protocol correction, add response schemas and validation boundaries, align test setup with the prerequisite, and verify the document.
- Preserved the existing change requiring list deletion to lock every membership before touching the list. Aligned append lock ordering across the service contract and protocol table; required distinct-actor concurrency tests in both operation orderings for tasks and subtasks.
- Added four runtime Zod response schemas, an inferred `TaskView`, server/client validation boundaries, safe error handling, compatibility with additive fields and existing helper callers, and malformed-output tests.
- Clarified that browser fixtures use `createUser` backed by `createPasswordUser`, then sign in over HTTP with `ALLOW_SIGN_UP=false`; required fixture cleanup.
- Updated API contracts, failure scenarios, and implementation steps together. Feature scope remains unchanged; no application source or previous run logs edited.

## Files changed
- This run log (created).
- `.ai/specs/2026-10-16-tasks-and-subtasks.md`.

## Verification (commands run and results)
- Targeted Prettier checks for the spec and this run log: passed.
- `npm run lint`: passed.
- `npm run build`: attempted; failed with the existing Turbopack worker-process port-binding restriction (`Operation not permitted`). The earlier review's approved retry hit the same restriction, so no repeated escalation or application workaround was attempted.
- Manually checked that all three approved corrections appear in the design and verification plan, that append lock ordering is consistent, and that test setup matches the updated prerequisite spec.
- Unit/integration suites not run: documentation-only changes; the future implementation's required tests are now in the plan.

## Problems / open questions
- None; all three corrections are authorized.
- Production build verification remains limited by the environment, as above.

## Lessons recorded (links into .ai/lessons.md)
- Existing [cross-actor list-lock lesson](../lessons/2026-10-16-cross-actor-list-locks.md) applies; no new lesson needed.
