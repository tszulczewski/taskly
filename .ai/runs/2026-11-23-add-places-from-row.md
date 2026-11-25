# Add places straight from a task row's places line (#90)

- **Date:** 2026-11-23
- **Spec:** none (issue #90 extends E02-S03 from `.ai/specs/implemented/2026-11-03-order-markers-and-spaces.md`)
- **Outcome:** success (manual phone QA by the owner still pending; not committed)

## Goal

Give every saved task and subtask row with `places` an "Add places" button at the end of its meta line, opening the same `PlacePicker` as "Places…" in the "…" menu, next to the button that opened it, and returning focus there on close.

## Steps taken

1. Read the issue, `.ai/lessons.md`, `packages/ui/AGENTS.md`, `.ai/docs/design-system.md`, `TaskRow`, its tests, stories and docs.
2. `TaskText`: added `addPlaces` ("Add places") and `addPlacesTo(title)` ("Add places to “title”"), plus Polish story text.
3. `TaskRow`: with `places` the meta line always shows; after the place tags a muted `TextAction` (13px, `relative` so it sits above the title's `::after` target layer) opens the picker. It is disabled while pending, has `aria-haspopup="dialog"` and `aria-expanded`. A `placesFrom` state ("menu" | "row") picks the popover anchor (`<PopoverAnchor virtualRef>`: "…" or the button), the alignment (end / start) and where focus returns on close. The "…" button no longer wraps itself in `PopoverAnchor`.
4. Unit tests (`tasks.test.tsx`): task and subtask with no places, a tick showing a tag before the button, two places with an untick, focus return to the button, no catalog, completed (kept), pending (disabled), translated name.
5. Stories: Add Places (play: open, tick, Escape, focus back), Add Places Subtask, Add Places After Several, Add Places Narrow 320 (target ≥ 44px).
6. Docs: `TaskRow.mdx` (anatomy, row heights, states, order, places, title, targets, content), `PlacePicker.mdx`, `.ai/docs/design-system.md`.
7. Browser integration test in `test/places-browser.integration.test.ts`: Add places on task B and subtask s1, tag order, focus back to the button, stored ticks.
8. Measured row heights with a temporary story (removed): with `places`, a one-line row without places grows from 69px to 113px on a 320px phone and from 53px to 75px on desktop, because the meta line now holds a 44px / 36px target. Screenshots in the task artifacts (`shots/`).

9. First full `npm run test:integration`: 6 failures. (a) `subtasks-browser` AC1–AC4 read every child of the meta line, now including "Add places"; the helper skips buttons. (b) Rows got taller, so the test page (577px high) now scrolls. In `reorder-browser` dnd-kit's keyboard sensor smooth-scrolls the page on ArrowDown before the row reaches B, and the test's Space dropped it back on A ("“A” was moved to “A”"); the test now waits for the "“A” is now at “B”." announcement. In `subtasks-browser` AC4 the new subtask's smooth `scrollIntoView` moved "…" while the test clicked it, so the menu never opened; `rowAction` now waits for "…" to stop moving (`waitForSteady`). (c) `tasks-browser` "runs with sign-up closed" failed once with `fetch failed` (socket closed) and passed on rerun: a flake.
10. Second full run: one failure, `future-expenses-browser`, the same "…" click during a scroll ("No element found: menuitem Edit"). Moved the wait into a shared `browser.openRowMenu(title)` in `test/helpers.ts` (`waitForSteady` on "…", then the click) and used it in every suite that opens a row menu (tasks, future-expenses, subtasks, completion, markers, places, reorder).

`packages/app/components/tasks/task-list-screen.tsx` already passes `places` and no `text`, so it needed no change.

## Files changed

- `packages/ui/src/product/tasks/task-row.tsx`, `text.ts`, `tasks.test.tsx`
- `packages/ui/.storybook/blocks/task-data.ts`, `docs/product/tasks/TaskRow.stories.tsx`, `TaskRow.mdx`, `docs/product/places/PlacePicker.mdx`
- `.ai/docs/design-system.md`
- `test/helpers.ts` (`openRowMenu`); `test/places-`, `subtasks-`, `reorder-`, `tasks-`, `future-expenses-`, `completion-`, `markers-browser.integration.test.ts`
- `.ai/lessons.md`, this log

## Verification (commands run and results)

- `npm run format:check` — pass
- `npm run lint` — pass
- `npm run check:agents` — pass
- `npm run test:env-scripts` — pass
- `npm run typecheck` — pass
- `npm test` — 84 files, 1279 tests pass; coverage 100% on statements, branches, functions and lines
- `npm run check:tokens`, `npm run test:storybook` (120 files, 948 tests), `npm run build-storybook -w @taskly/ui` — pass
- `npm run build` — pass
- `npm run audit` — exit 0 (4 existing moderate dev-only advisories under drizzle-kit)
- `npx vitest run --config vitest.integration.config.mts test/places-browser.integration.test.ts` — 11 tests pass
- `npm run test:integration` — run 1: 6 failures, run 2: 1 failure (steps 9–10); run 3 after the fixes: 24 files, 304 tests pass

## Problems / open questions

- Rows get noticeably taller (see step 8). The owner accepted a taller list in the issue; check it on a phone at QA.
- A keyboard user who presses Space while dnd-kit is still scrolling a long list drops the row where it was. This is how dnd-kit 6 always behaves on a list taller than the window, not something this change introduced; it may deserve its own issue.
- "Add places" sits between the place tags and the markers, as the issue specifies ("after the last tag").

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-23 — title `::after` layer covers controls in the text block; `PopoverAnchor virtualRef` for a popover opened from two places; Storybook Vitest probe quirks.
