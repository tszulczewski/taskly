# Fix intermittent browser-test failures on row menus and keyboard moves (#99)

- **Date:** 2026-11-24
- **Spec:** none (bug, issue #99)
- **Outcome:** success

## Goal

Make the browser integration tests that open row menus or move rows pass reliably in CI. Fix the
cause in the shared helpers (`test/helpers.ts`, `test/browser-suite.ts`) without blind retries or
longer sleeps, and prove it with repeated runs before and after the change.

## Steps taken

1. Filed #99 from the brief (`om-prepare-issue`), with the four failing CI attempts from the job logs.
2. Read the failing job logs (PR #94 run 45165616783 attempt 1; PR #97 run 45269457345 attempts 1
   and 2; PR #98 run 45273068439 attempt 1).
3. (Resumed run) Checked the earlier diagnosis against the code:
   - The row's "…" menu is `<Menu modal={false}>` (`packages/ui/src/product/tasks/task-row.tsx`),
     so it closes when focus leaves it. A subtask add's success runs `closeAddSubtask`, which
     focuses "Add subtask" (decision F7). `subtasks-browser`'s `addSubtask` returned right after
     the submit click, so AC4's next `rowAction` opened a menu that the add's answer then closed.
   - `future-expenses-browser`'s `rowAction` clicked the trigger straight after an add with no
     wait at all; the "covered by `<li.border-t.border-divider>`" refusal in that run shows the
     button was not under the measured point (the screen was still changing after the add).
   - dnd-kit's `sortableKeyboardCoordinates` returns early while the drag has no
     `collisionRect`; REORDER-001 pressed ArrowDown after `waitForAnimations`, which does not
     wait for that measurement (nothing animates).
4. Added `browser.openRowMenu(title)` and `browser.rowAction(title, item, role?)` to
   `createBrowser`: wait until nothing is `[data-pending]` and no finite animation runs, wait for
   the trigger's box to be steady, click it, wait until focus is inside the menu labelled by that
   trigger, wait for animations and a steady menu, then pick the item. `waitForAnimations`,
   `waitForSteady` and `count` became named functions so the helper reuses them.
5. Replaced every hand-written "More actions for …" click with it: `subtasks`, `future-expenses`,
   `tasks`, `places` (including the peer tab), `markers`, `completion`, `reorder` (its own
   `openMenu` is gone).
6. `subtasks-browser` `addSubtask` now waits until the form has closed and nothing is pending.
7. REORDER-001 waits for dnd-kit's live-region announcement after Space ("“A” is now at “A”.",
   the first `onDragOver`, made once the rects are measured) and after each arrow key.
8. Recorded the lesson.

No app or UI code changed: the menu closing on focus loss and "Add subtask" taking focus after an
add are the specified behaviour, and nothing showed a race a user would hit.

## Files changed

- `test/helpers.ts` — `openRowMenu`, `rowAction`; `waitForAnimations`, `waitForSteady`, `count`
  as shared functions.
- `test/subtasks-browser.integration.test.ts`, `test/future-expenses-browser.integration.test.ts`,
  `test/tasks-browser.integration.test.ts`, `test/places-browser.integration.test.ts`,
  `test/markers-browser.integration.test.ts`, `test/completion-browser.integration.test.ts`,
  `test/reorder-browser.integration.test.ts` — use the shared helper; `addSubtask` settles;
  REORDER-001 waits for announcements.
- `.ai/lessons.md`, `.ai/lessons/2026-11-24-browser-tests-row-menu-and-keyboard-move.md`.

## Verification (commands run and results)

Each browser suite was run alone, sequentially, against the production build (`npm run build`), a
dedicated PostgreSQL container (`TEST_DATABASE_URL`), `TMPDIR=/tmp/t02` and a private
`AGENT_BROWSER_SOCKET_DIR`, one `npx vitest run --config vitest.integration.config.mts <file>` per
run (`/tmp/t02/run.sh`).

- After the fix, 10 runs each: reorder 10/10, subtasks 10/10, future-expenses 10/10, places
  10/10, markers 10/10, tasks 10/10, completion 10/10.
- Before (main's versions of the three failing suites, same build), 10 runs each: reorder 10/10,
  subtasks 10/10, future-expenses 10/10. The stopped duplicate run (9de28d01) saw subtasks 9/10 on
  `main` (AC4 failed once) and reproduced the AC4 mechanism deterministically: with the subtask
  add held by a pg row lock, a "…" menu opened meanwhile was open (`menus=1`), and after the answer
  `menus=0` with focus on "Add subtask".
- During part of the after-runs the duplicate run shared the CPU; every after-run still passed.

Gate (`fix/issue-99-browser-row-menu-flakes`): `format:check` ✅, `lint` ✅, `check:agents` ✅,
`test:env-scripts` ✅, `typecheck` ✅, `test` ✅ (84 files, 1274 tests, coverage thresholds met;
a first run made while the browser loop loaded the machine timed out one unrelated unit test at
5 s, and the quiet re-run passed), `build` ✅, `audit` ✅ (4 moderate, dev-only drizzle-kit/esbuild,
below the `high` level), `test:integration` ✅ (23 files passed, 1 skipped; 298 tests passed, 5 skipped: the env-gated `describe.skipIf(!url)` core suites, unchanged).

## Problems / open questions

- The failures never reproduced locally before the fix either (see the before counts): the
  races need CI's slower machine. The evidence for the fix is the diagnosis against the code plus
  the repeated green runs; CI over the next PRs is the real check.
- After a cezar restart, the pre-restart session of this task kept running in the same worktree
  (it wrote this log's draft and started the before-runs); it was stopped by its PID and the
  before-runs were redone. The earlier interrupted run (9de28d01) was also revived and was stopped
  by the root task.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-24 — row menus only through `browser.rowAction` / `openRowMenu`; add helpers return after
  the answer; keyboard drags wait for dnd-kit's announcements
  (`lessons/2026-11-24-browser-tests-row-menu-and-keyboard-move.md`).
