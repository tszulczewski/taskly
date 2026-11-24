# Browser tests: open a row menu on a settled screen; wait for dnd-kit's announcements between keys

- **Date:** 2026-11-24
- **Trigger:** bug fix (#99)
- **Related:** `test/helpers.ts` (`openRowMenu`, `rowAction`), `test/reorder-browser.integration.test.ts`, `.ai/runs/2026-11-24-browser-test-row-menu-flakes.md`

## Context

Four CI attempts on PRs that did not touch the code under test failed in browser suites, and each
passed on re-run: REORDER-001's keyboard move moved nothing, and two row-menu actions timed out on
`getByRole('menuitem', …)` ("No element found" for 15 s) in `subtasks-browser` and
`future-expenses-browser`.

## Finding

1. **Keyboard move.** dnd-kit's `sortableKeyboardCoordinates` returns without moving while the
   drag has no `collisionRect` (the active row's rect, measured a render or more after Space). An
   arrow key pressed in that window is dropped. `waitForAnimations` does not cover it: nothing
   animates. The first `onDragOver` announcement ("“A” is now at “A”.", over the row itself) is made
   only once collisions were computed from those rects, so it marks the moment arrows work.
2. **Row menu.** The "…" menu is a non-modal Radix menu: it closes as soon as focus leaves it.
   - `subtasks-browser` AC4: `addSubtask` returned right after the submit click. The next "…"
     click opened the menu, then the add's answer closed the form and moved focus to "Add subtask"
     (decision F7), which closed the menu before the item click.
   - `future-expenses-browser`: the trigger was clicked straight after an add, with no wait at
     all. agent-browser's "covered by `<li.border-t.border-divider>`" refusal in that run means
     the button was no longer under the point it had measured: the screen was still changing (the
     new row's highlight animation, the rows' `transition-transform`, and on a long list a smooth
     `scrollIntoView` to the new row, which `document.getAnimations()` does not list). A click
     sent in that window lands on a row instead of the button, no menu opens, and the item click
     times out. The log alone does not show which of these moved the button.

## Resolution

- `browser.openRowMenu(title)` / `browser.rowAction(title, item, role?)` in `test/helpers.ts`:
  wait until no row is `[data-pending]`, no finite animation runs and the button's box is steady
  (catches the scroll), click it, wait until focus is inside the menu labelled by that button, then
  until the menu is placed (animations, `waitForSteady`), and only then pick the item. Every suite
  uses it; no suite clicks "More actions for …" by hand.
- `addSubtask` (subtasks suite) waits until the form has closed and nothing is pending.
- REORDER-001 waits for the live-region announcement after Space and after each arrow key.

## Rule going forward

- Open row menus only through `browser.rowAction` / `browser.openRowMenu`.
- An add/save helper returns only after the server's answer has been applied (row not pending,
  form closed): an answer arriving later moves focus and closes whatever the next step opened.
- In a keyboard drag, wait for dnd-kit's live-region text (`[id^="DndLiveRegion-"]`) after each
  key, never for animations or a fixed time.
- A box that is steady across two polls is the only check that catches smooth scrolling.
