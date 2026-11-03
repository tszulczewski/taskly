# Design system: places (D26) and the list of what has no estimate (D27)

- **Date:** 2026-11-03
- **Spec:** none; decisions D26 and D27 in `.ai/specs/product-brief.md` and `.ai/specs/research/decisions/2026-11-03-e02-e03-epic-alignment.md`
- **Outcome:** success after a QA round (see Follow-up)

## Goal
Bring the design system's `PlacePicker` / `PlaceColorPicker` and `UnestimatedTasks` / `FutureExpenses` in line with D26 and D27, on PR #48 (owner's choice), and QA the result with a subagent (owner's request).

Owner's choices (2026-11-03): the component does not pick a new place's colour (the server will: a free or least-used colour, lowest number on a tie; rule for the E02 spec); a subtask in the list reads "Tiles" then muted "· Bathroom tiles"; story places use the eight predefined Polish names; the code goes onto PR #48.

## Steps taken
1. Places (D26): `types.ts` lost `freePlaceColors` / `placeColorIsAutomatic`; `PlaceColorPicker` offers all ten colours (no `places`, `placeId`, "used by"); `PlacePicker` creates by name only (`onCreate({ name })`, new `NewPlaceValues`), colour only in Edit places, limit text 20; `TaskRow`'s `PlaceOptions.onCreate` follows.
2. List of what has no estimate (D27): `UnestimatedTasks` takes `items: UnestimatedItem[]` (`taskTitle` marks a subtask, shown muted as "· Bathroom tiles"); no `subtasksWithoutEstimate` / `addSubtaskEstimates` (W3); count `unestimated(tasks, subtasks)` ("2 tasks and 1 subtask without an estimate"); `addEstimateFor(title, taskTitle?)`; simpler focus after a save. `FutureExpenses` passes `items`.
3. Storybook data: the eight predefined Polish places plus own ones (`place-data.ts`), `twentyPlaces`, `nextPlaceColor` as the simulated server's colour rule (least used, lowest number); `futureExpenses()` in `task-data.ts` lists per D27; Polish texts with plural forms. Stories, catalog, `TaskScreen`, `ColorBlocks` and 18 MDX pages updated; `POSTEP.md` stage 11; `.ai/docs/design-system.md` component row and source legend.
4. Unit tests rewritten for the new behaviour (all ten colours selectable, name-only create, subtask items, count wording, focus to the item before after the last save).

## Files changed
`packages/ui/src/product/places/*` (types, text, colour picker, picker, tests), `packages/ui/src/product/expenses/*` (text, unestimated list, future expenses, tests), `packages/ui/src/product/tasks/task-row.tsx`, `tasks.test.tsx`, `packages/ui/src/index.ts`; `packages/ui/.storybook/blocks/*` (place-data, task-data, PlacePickerDemo, TaskScreen, Catalog, catalog.ts, ColorBlocks); stories and MDX under `packages/ui/.storybook/docs/`; `packages/ui/POSTEP.md`; `.ai/docs/design-system.md`; this log.

## Verification (commands run and results)
- `npm run format:check`: passed.
- `npm run lint`: 0 errors, 1 warning outside this change (`.agents/skills/om-share-this-session/scripts/prepare-share-bundle.mjs`, unused `tmpdir`).
- `npm run check:agents`: passed. `npm run typecheck`: passed. `npm run check:tokens`: passed.
- `npm test`: 72 files, 947 tests passed; coverage 100% statements, branches, functions, lines.
- `npm run test:storybook`: 120 files, 922 tests passed (both themes, axe). First run had 2 failures (Screens › Choose Places clicked "Salon", already ticked on that task); fixed by choosing "Biuro".
- `npm run build-storybook`: completed. `npm run build`: completed. `npm run audit`: exit 0 (4 moderate, below the configured level).
- `npm run test:integration`: **not run**. No Docker here, and the agent could not read `.env` for a `TEST_DATABASE_URL` (permission denied). The app does not use the changed components yet; only the `PlaceOptions.onCreate` type changed, which the app does not pass.

## Problems / open questions
- The server's colour rule (least used, lowest number on a tie) is simulated in Storybook only; the E02 spec must define it in `core`.
- Integration tests to be run by the owner: `TEST_DATABASE_URL=<local test database> npm run test:integration`.

## Lessons recorded (links into .ai/lessons.md)
- None new.

## Follow-up: QA by a subagent and fixes (same day)

QA verdict on cf363a5: fail on two checks; D26/D27 behaviour itself passed (create by name, colours repeat, limit 20, case-insensitive names, any colour in Edit places, subtask items, counts, focus after save, 320px, both themes, Polish). The owner chose the agent's recommendation: fix findings 1–3 and 8 in PR #48, file an issue for the pre-existing 4, 5 and 9.

- **Finding 1, places popover off screen and not scrollable:** `PopoverContent` had no height limit, so 8 predefined places already pushed "Edit places" below a 900px screen, and 20 places on a phone hid the title. New utility `max-h-overlay` (`max-height: var(--radix-popper-available-height)`, `overflow-y: auto`) in `base.css`, applied in `popover.tsx`. New story `Screens › Places At Limit Phone` asserts the panel stays inside the viewport and scrolls.
- **Finding 2, stale guidance:** `catalog.ts`, `StartHere.mdx` and `.ai/docs/design-system.md` (Collapsible example, Unestimated tasks "when not", colour picker summary), and `PlaceTag.mdx` (G4 → G6, D26).
- **Finding 3:** the subtask's estimate form is named "Estimate for “Tiles” in “Bathroom tiles”" (`estimateFor(title, taskTitle?)`, Polish too); unit test and story assert it.
- **Finding 8:** `Future expenses › Playground` stuck on "Saving…"; the stories now render a stateful demo that drops a saved item.
- **Findings 4, 5, 9** (focus lost to `body` in the place picker, two Cancel buttons, swatch focus looks like chosen): issue #49.
- Finding 7 (colour rule) was already decided by the owner (least used, lowest number); it goes into the E02 spec.

Verification after the fixes: `format:check`, `check:tokens`, `check:agents`, `typecheck` pass; `lint` 0 errors (same 1 warning outside the change); `npm test` 947 passed, 100% coverage; `test:storybook` 924 passed; `build-storybook` and `build` completed. `test:integration` still not run (no Docker, no `TEST_DATABASE_URL`).

