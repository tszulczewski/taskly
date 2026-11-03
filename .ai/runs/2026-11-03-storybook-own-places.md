# Storybook: organized pickers list the owner's own place

- **Date:** 2026-11-03
- **Spec:** none (finding 1 of `.ai/analysis/2026-11-03-pr48-code-review.md`, D26)
- **Outcome:** success

## Goal
Fix finding 1 of the PR #48 review. `organizedTasks` and `polishOrganizedTasks` assign the owner's own place Przedpokój (`hall`), but the organized screens and stories passed only the eight predefined places to the picker. The place showed on rows and was missing from the picker, so the owner could not see or remove it. Commit the review artifacts alongside the fix.

## Steps taken
- Added `organizedPlaces` (`predefinedPlaces` plus `hall`) to `.storybook/blocks/place-data.ts`.
- Used it everywhere organized tasks reach a picker: Screens (`organized`, Organized Polish Phone), Patterns › Reorder, TaskList › Organized, TaskRow `organized`.
- Regression story `Product › Tasks › Screens › Remove Own Place`: Przedpokój is on the row, listed and checked in the picker; unchecking it removes it from the row.

## Files changed
- `packages/ui/.storybook/blocks/place-data.ts`
- `packages/ui/.storybook/docs/product/tasks/{Screens,TaskList,TaskRow}.stories.tsx`
- `packages/ui/.storybook/docs/patterns/Reorder.stories.tsx`
- `.ai/analysis/2026-11-03-pr48-code-review.md`, `.ai/runs/2026-11-03-pr48-code-review.md` (review artifacts, unchanged)
- `.ai/lessons.md`

## Verification (commands run and results)
- Affected Storybook tests (both themes, axe): 26 files, 342 passed.
- `format:check` passed; `lint` 0 errors (1 warning predates this work, in `.agents/skills/om-share-this-session`); `check:agents`, `typecheck`, `check:tokens` passed.
- `test`: 100% statements/branches/functions/lines.
- `test:storybook`: 120 files, 926 passed (was 924; the new story runs in both themes).
- `build-storybook` and `build` succeeded; `audit` exit 0 (4 moderate, below the `high` threshold).
- `test:integration`: not run locally (no Docker / `TEST_DATABASE_URL`); CI runs it.

## Problems / open questions
- Integration tests need Docker or `TEST_DATABASE_URL`; neither is available locally, so they run only in CI. The change touches only Storybook.

## Lessons recorded (links into .ai/lessons.md)
- 2026-11-03: story fixtures pass every place their tasks reference.
