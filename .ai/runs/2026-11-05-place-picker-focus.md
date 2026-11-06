# Place picker: focus after save/delete, one Cancel, swatch focus (#49)

- **Date:** 2026-11-05
- **Spec:** none (bug, GitHub issue #49; QA of PR #48, findings 4, 5, 9)
- **Outcome:** success

## Goal

Fix the three keyboard and focus problems in `PlacePicker` / `PlaceColorPicker` from #49: focus fell to `<body>` after Save, "Delete place", a confirmed delete and the create that reaches the 20-place limit; two "Cancel" buttons showed while the delete question was open; a focused swatch looked the same as the chosen one.

## Steps taken

1. Reproduced through new unit tests: 6 of them failed on the unfixed picker (focus on `body`, two Cancels).
2. `place-picker.tsx`:
   - closing a place's form (Save or Cancel) focuses that place's "Edit". The picker keeps a map of the Edit buttons and a "return to" target, applied in a layout effect after every render, because the row can come back in a later render than the one that closed the form.
   - after a delete, focus goes to the next place's "Edit", the previous one for the last place, or "Back to choosing" for the only place.
   - "Delete place" focuses the question's Cancel, and that Cancel focuses "Delete place" again.
   - the form's Save and Cancel are hidden (`actionsHidden`) while the question is open, so only one Cancel shows.
   - when `atLimit` turns true while focus is on `body` (the focused create form was removed), the limit message (`tabIndex={-1}`) takes focus. The message takes no focus when the picker opens at the limit, or when focus is elsewhere.
3. `place-color-picker.tsx`: the focus ring moved from the dot to the whole 44 px target (`focus-visible:focus-ring` on the Radix item). "Chosen" stays on the dot (`swatch-selected`), so focused-unchosen, chosen-unfocused and chosen-focused all look different, in both themes.
4. Stories: Playground's play now walks Save → Delete place → confirm delete and checks focus each time. New `ReachingTheLimit` story (19 places + one create), because Playground starts with 8 places and would need 12 creates. ConfirmDelete checks there is one Cancel and the focus moves both ways. Colour picker: Playground checks with computed outlines that keyboard focus rings the target and Tab removes it. States shows the three swatch states (the focus look is forced with an arbitrary variant) and its play checks their outlines.
5. Docs: `PlacePicker.mdx` (states table, focus rules), `PlaceColorPicker.mdx` (anatomy, Focus state).

## Files changed

- `packages/ui/src/product/places/place-picker.tsx`, `place-color-picker.tsx`, `places.test.tsx`
- `packages/ui/.storybook/docs/product/places/PlacePicker.stories.tsx`, `PlacePicker.mdx`, `PlaceColorPicker.stories.tsx`, `PlaceColorPicker.mdx`

## Verification (commands run and results)

- `npm run format:check`, `lint`, `check:agents`, `typecheck`: pass.
- `npm test`: 76 files / 1038 tests pass, coverage thresholds (100%) met. The first run failed in `packages/core` (`better-auth` not found) because the cezar worktree had no `node_modules` of its own and resolved from the main checkout. Passed after `npm ci` in the worktree.
- `npm run check:tokens -w @taskly/ui`: pass. `npm run test:storybook -w @taskly/ui`: 120 files / 928 tests pass (light and dark). `npm run build-storybook -w @taskly/ui`: pass.
- The new unit tests fail against the old `place-picker.tsx` (6 failures). The new colour-picker Playground check fails against the old `place-color-picker.tsx` (2 failures, light and dark).
- `npm run build`: pass. `npm run audit`: exit 0 (4 moderate in esbuild via `@esbuild-kit`, already there, below `high`).
- `npm run test:integration`: 18 files / 192 tests pass. Chrome first failed with "Socket path too long" because of the long cezar `TMPDIR`. It passed with `TMPDIR=/tmp/claude-1000/t` and `AGENT_BROWSER_SOCKET_DIR=/tmp/claude-1000/ab`.
- No manual run of the app: the component is not used by the app yet (#49 "Who has it"). The Storybook play tests in a real Chromium cover it.

## Problems / open questions

- AC1 asks for every case in `Playground`. The limit case is in the new `ReachingTheLimit` story instead (the reason is in step 4).

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-05: Chrome under agent-browser needs a short `TMPDIR` in cezar worktrees.

## 2026-11-06 — republished from the cezar autosave branch

The fix stayed only on the local branch `cez/75938b3c`. It was cherry-picked onto `main` (`f93db62`) as `fix/place-picker-focus`; the `.ai/lessons.md` conflict kept both sides. Gate on the new base: `lint`, `check:agents`, `typecheck`, `test` (1064 tests, 100% coverage), `build`, `audit` pass; `format:check` passes for every tracked file and warns only on the untracked `.ai/cezar/runs.json`. `test:integration`: 198/199; `completion-browser` AC8–AC12 timed out on the reopen of A ("shown: B, C, A✓"). It is flaky on `main` as well (1 of 6 runs) and never opens the places popover, so this change does not reach it.
