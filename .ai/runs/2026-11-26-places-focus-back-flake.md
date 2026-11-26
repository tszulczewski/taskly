# Fix the places-browser "gives focus back" flake (#107)

- **Date:** 2026-11-26
- **Spec:** none (bug, issue #107)
- **Outcome:** success

## Goal
Make `test/places-browser.integration.test.ts` › "adds places from a row's Add places, … gives focus back to it" reliable without weakening its focus assertion. Decide whether the product or the test is wrong.

## Steps taken
- Read Radix `react-focus-scope`: on unmount it fires `onCloseAutoFocus` (our `placesOpener.current?.focus()`) inside a `setTimeout(0)`, after the popover has left the DOM.
- Probed the test (temporary): it records `activeElement` right after `count(PICKER) === 0`, then again 300 ms later. Of 8 runs, 3 failed, all on subtask `s1`: `BODY` at once, "Add places to “s1”" focused 300 ms later. The product gives focus back; the test checked too early. No detached or replaced node was seen.
- Fix (test only): a `waitForFocusBack(selector)` helper that waits for `document.activeElement` to be that exact element, with the focused element in the timeout message. Used by `pickFromRow` and by `closeDraftPlaces` (same synchronous check after a Radix close; latent).
- Mutation check: replaced the `focus()` in `task-row.tsx`'s `onCloseAutoFocus`, rebuilt. The test fails with "Timed out … waiting for focus back on button[aria-label="Add places to “B”"] (focused: BODY)". Restored and rebuilt.

## Files changed
- `test/places-browser.integration.test.ts`
- `.ai/lessons.md`
- `.ai/runs/2026-11-26-places-focus-back-flake.md`

## Verification (commands run and results)
- Fixed tests ("gives focus back" + quick-add focus tests), run alone: 15/15 passed (an earlier batch of 5 skipped all 11 tests in setup and is not counted; it did not recur).
- Full `test/places-browser.integration.test.ts`: 11/11 passed.
- `prettier --check`, `eslint` on the file: clean. `npm run typecheck`: clean.
- Full gate: `format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`, `test` (100% coverage), `build`, `audit` all exit 0; `test:integration` 25 files, 319/319 passed (with `TMPDIR=/tmp/t107`).

## Problems / open questions
- agent-browser's Chrome fails with "Socket path too long" under the cezar worktree's long `TMPDIR`; ran with `TMPDIR=/tmp/t107`.

## Lessons recorded (links into .ai/lessons.md)
- 2026-11-26 — Radix close autofocus in browser tests (#107).
