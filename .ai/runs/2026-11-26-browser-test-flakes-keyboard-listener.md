# Two browser test flakes: REORDER-001 keyboard move, future-expenses subtask toggle (#102)

- **Date:** 2026-11-26
- **Spec:** none (bug fix, issue #102)
- **Outcome:** success

## Goal

Stop two browser integration tests from failing CI intermittently, without loosening an assertion:
REORDER-001 ("moves a task with the keyboard …", ArrowDown ignored after the first "is now at") and
future-expenses "counts a task with subtasks once …" (`covered by <li.border-t.border-divider>`,
then `expected 'todo' to be 'done'`).

## Steps taken

1. Read the #99 lesson and dnd-kit 6.3.1's `KeyboardSensor`: `attach()` adds the `keydown`
   listener in a `setTimeout(0)` set during the Space keydown (the sensor is created synchronously
   in the activator). The "is now at" announcement comes from React work that does not wait for
   that timer, so it does not prove arrows are heard.
2. Probe (not committed): wrapped `window.setTimeout` before Space so only the callback whose
   source contains `handleKeyDown` (the production chunk has
   `setTimeout(()=>this.listeners.add(p.Keydown,this.handleKeyDown))`) ran 1.5 s late. The old
   test failed (`Tasks: ["B","A","C"] (shown: ["A","B","C"] …)`; the unheard ArrowDown scrolled
   the page, so the drop Space was lost too). A first, cruder probe that delayed every timer set
   during the press also failed but confounded dnd-kit's measuring timers, so it was discarded.
3. Fix: `pickUp(title)` in `test/reorder-browser.integration.test.ts` focuses the handle, presses
   Space, sets a zero timer in the page and waits for it (equal-delay timers run in order, so
   dnd-kit's has run), then waits for the first "is now at" as before. The same probe, delaying
   dnd-kit's timer and the marker alike, passed.
4. future-expenses: not reproduced in 5 plain local runs. With `--motion-duration-base` forced to
   2000 ms before opening "Bathroom", the old test printed the CI's exact refusal
   (`Element … is covered by <li.border-t.border-divider> at its click point`) and passed only
   because `act` retried; the fixed test printed none. `toggle` now waits for
   `browser.waitForAnimations()` before the click (all five call sites), and the row open waits
   for animations before its click too. The CI's lost click (`todo`) is the retried click landing
   while the row was still moving (2026-11-16 lesson); inferred, not observed.

## Files changed

- `test/reorder-browser.integration.test.ts` — `pickUp` helper, used for both keyboard moves.
- `test/future-expenses-browser.integration.test.ts` — `toggle` waits for animations; wait before
  opening the row.
- `.ai/lessons.md`, `.ai/lessons/2026-11-24-browser-tests-row-menu-and-keyboard-move.md` — lesson.

## Verification (commands run and results)

- `npm run format:check`, `lint`, `check:agents`, `typecheck`, `test:env-scripts`: pass.
- `npm test`: 89 files, 1324 tests pass, coverage thresholds met.
- `npm run build`: pass (before the test-only change). `npm run audit`: exit 0.
- `npm run test:integration` (`TMPDIR=/tmp/claude-1000/t`): 25 files, 315 tests pass.
- Both suites repeated 5× in a row: 5/5 pass.
- Probes above: old REORDER-001 fails, fixed passes; old future-expenses shows the refusal, fixed
  does not.
- Not done locally: several CI runs of the Integration job in a row (needs the PR's CI).

## Problems / open questions

- Why the timer runs after React's render on CI runners is not observed; Chrome's scheduler can
  run rendering and `MessageChannel` tasks ahead of timers on a busy renderer. The fix does not
  depend on why.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-26 — REORDER-001's keyboard move (#102) → `lessons/2026-11-24-browser-tests-row-menu-and-keyboard-move.md`
