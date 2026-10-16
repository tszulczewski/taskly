# Grilling session on the tasks and subtasks spec

- **Date:** 2026-10-16
- **Spec:** .ai/specs/2026-10-16-tasks-and-subtasks.md
- **Outcome:** success

## Goal

Stress-test the tasks and subtasks spec with the owner (`/grill-me`), settle the open design branches, and write the decisions into the spec.

## Steps taken

1. Read `.ai/lessons.md`, the spec, and the code it touches: `packages/db/src/schema.ts`, `packages/core/src/{tasks,lists,schemas,money,position,http}.ts`, `test/global-setup.ts`, `test/helpers.ts`, `.github/workflows/ci.yml`.
2. Checked facts: the dev DB role has neither `CREATEDB` nor superuser; migration `0000` hard-codes the `"public"` schema; CI's integration job uses Testcontainers; the `createUser` / `createPasswordUser` test helpers don't exist yet (they come from the sign-in spec); English UI is already decided (sign-in spec Q3).
3. Round 1 (Q1–Q7) and round 2 (Q8–Q10): the owner accepted every recommendation.
4. Updated the spec with the decisions below.

## Decisions (owner, 2026-10-16)

- Q1: `deleteList` refuses the default list (`ConflictError`); renaming is allowed.
- Q2: new `estimateGroszeSchema` with the 10M PLN cap; `groszeSchema` stays uncapped for E03 totals.
- Q3: the `0000`→`0001` upgrade test runs only under Testcontainers (CI) and skips when `TEST_DATABASE_URL` is set; the rollback SQL is checked by hand.
- Q4 → revised by Q8: three PRs. A = steps 1–6 (db + core, closes #22), B = steps 7–8 after Phase 0 (closes #15), C = steps 9–11 (closes #16). The routes moved to PR B because their HTTP integration tests need the sign-in spec's `createUser` helper.
- Q5: new tasks append at the end, scroll into view with a brief highlight (none under reduced motion), and focus stays in quick-add.
- Q6: pending optimistic rows are dimmed and their actions disabled until the real id arrives.
- Q7: `ensureDefaultList` reads first and writes only on a miss.
- Q9: PR A's QA is evidence-based (violation query, `0001` on the dev DB, integration and CI migration runs, manual rollback check).
- Q10: issue mapping as above; epic #11 closes during housekeeping.

## Files changed

- `.ai/specs/2026-10-16-tasks-and-subtasks.md`: Depends on, Proposed Solution, Architecture, API Contracts (schemas, `ensureDefaultList`, `deleteList`, `createTask`), UI/UX, Edge Cases, Risks, Decisions in play, Phasing (delivery table), Implementation Plan steps 1–4, 6–9 and 11.
- `.ai/runs/2026-10-16-task-spec-grilling.md` (this file).

## Verification (commands run and results)

Docs-only change; no code, lint or build run needed. Re-read the edited sections for consistency.

## Problems / open questions

None open.

## Lessons recorded (links into .ai/lessons.md)

- Added: the dev DB role cannot create databases and migrations hard-code `"public"`, so tests that need a fresh database run only under Testcontainers (CI).
