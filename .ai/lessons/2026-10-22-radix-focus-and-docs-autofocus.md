# Radix close autofocus, autoFocus on docs pages, regex accessible names

- **Date:** 2026-10-22
- **Trigger:** run
- **Related:** `.ai/runs/2026-10-21-design-system-storybook.md` (stage 3 batch 2), `packages/ui/src/product/tasks/`

## Context
Building the E01 task components (row menu, edit form, delete dialog) and their stories.

## Finding
- Radix `FocusScope` (dialogs, menus) moves focus on close in a `setTimeout(0)` after the content unmounts. A test that checks focus right after closing fails; `onCloseAutoFocus` also fires when the whole dialog is unmounted, not only on `open={false}`.
- A menu item that opens a form or a dialog loses focus to the menu trigger unless the menu's `onCloseAutoFocus` calls `preventDefault()` for that close.
- Every inline story on an MDX docs page mounts at once; a component with `autoFocus` makes the docs page jump to the last such story.
- `getByRole("button", { name: /Title/ })` also matches "More actions for “Title”"; use the exact name.

## Resolution
Tests wait with `vi.waitFor` / `waitFor` for focus after a close. TaskRow sets a "moved focus" flag before a menu action and prevents the menu's close autofocus. `TaskForm` has `autoFocus` (default true); stories pass `false` except the Playground.

## Rule going forward
Assert Radix close focus asynchronously; let focus-taking components opt out of `autoFocus` and keep it off in docs-page stories; query accessible names exactly when another control repeats the title.
