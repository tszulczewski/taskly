# Agent test 2: decisions O1–O7, A fixes, C questions

- **Date:** 2026-10-23
- **Spec:** none (decision batch `packages/ui/POSTEP.md` › Etap 7)
- **Outcome:** success

## Goal
Implement the owner's decision (2026-10-23: everything in the recommended variants): A1–A6 doc fixes, O1–O7 variant A, C questions in the E04 table, and open one PR. Branch `design/agent-test-2-decisions`.

## Steps taken
- Batch written and committed (7bb814f); owner chose all recommended variants.
- O4 first: wrote a regression test (stateful wrapper that really removes the last task). On the old code focus landed on `body`; the test's first selector was also wrong (`Surface` overwrites a passed `data-slot`; lesson recorded). Fixed `TaskList`: focusable empty state, focus to the first connected target (`…` after Cancel, the list) or the empty state.
- O3: skeleton rows keep the same empty columns as task rows (arrow from 640px, handle with `onMove`, checkbox with `onToggleComplete`). Unit test for the column count; story Task list › Loading Lines Up compares the bar's and the title's left edge.
- Both new stories (Loading Lines Up, Delete Last) checked against the old `task-list.tsx`: both fail there, pass on the new code.
- Docs: A1–A6, O1 (Inline edit recipe), O2 (Delete confirmation recipe), O3–O6 rules, O7 and A4–A6 in the prompt, C table in E04 Later, legends, `design-system.md`, POSTEP.md Etap 7 outcome and implementation.

## Files changed
- Code: `packages/ui/src/product/tasks/task-list.tsx`, `tasks.test.tsx`; stories `product/tasks/TaskList.stories.tsx` (Loading Lines Up, Delete Last).
- Docs: Patterns Inline edit, Delete confirmation, List, Quick capture; Primitives Button, Skeleton; Task list; Contributing, How to choose, Start here, Usage and accessibility, What is missing, E04 Later; `.ai/docs/design-system.md`; `.ai/design/prompt-agent-test.md`; `packages/ui/POSTEP.md`; `.ai/lessons.md`.

## Verification (commands run and results)
- `npm run format:check`, `lint`, `typecheck`, `check:tokens -w packages/ui`: pass.
- `npm test`: 254 tests, coverage 100% (statements, branches, functions, lines).
- `npm run test:storybook -w packages/ui`: pass (both themes, axe).
- `npm run audit`: pass at `--audit-level=high`; 4 moderate (esbuild chain) existed before, no dependency changes here.
- `npm run build`: pass. `npm run build-storybook -w packages/ui`: pass.
- Built Storybook: the 13 changed docs pages open at 320px with no errors and no horizontal scroll; Loading Lines Up at 1440px: bar and title both at 205px.
- Not run: `test:integration` (no app code changed).

## Problems / open questions
- None open. The product questions (C) wait for the E04 spec.

## Lessons recorded (links into .ai/lessons.md)
- 2026-10-23 — focus target may be unmounted when a dialog closes; pick the first connected target.
- 2026-10-23 — `Surface` overwrites a passed `data-slot`.
