# Design-system doc fixes after the agent test

- **Date:** 2026-10-23
- **Spec:** none — follow-up A of the agent test (`.ai/runs/2026-10-23-shopping-screen-agent-test.md`), approved by the owner in chat
- **Outcome:** success

## Goal

Fix the documentation contradictions and missing references the agent test found, without changing components, tokens or variants. Product questions specific to the shopping list go to the E04 page; general gaps become proposals (follow-up B, separate).

## Steps taken

- Branch `docs/design-system-agent-test-fixes` from `main` (a3e386b). The test's story file is kept on `design/shopping-screen-agent-test` (stashed, not merged); its run log is copied here because the docs cite it.
- **Navigation** (Foundations › Spacing and layout): "version 1 has two places … navigation sits at the bottom" now follows decision E1: one screen, no navigation; with a second screen, a bottom bar on phones (P07, R02.11), not designed yet.
- **Tooltip with a menu** (Primitives › Tooltip): the snippet `<Tooltip><MenuTrigger asChild><Button …/></MenuTrigger></Tooltip>` gave an empty bubble (Tooltip reads `aria-label` from its direct child). New code sample with the label on `MenuTrigger` too, new story **With Menu** with a play test, and a note in §2 that `TaskRow`'s "…" and `DragHandle` have no tooltip yet (proposal N4).
- **Checkbox name** (Primitives › Checkbox §7, §8): visible `Label` = the thing; a box named by `aria-label` beside a visible title = action + object (`TaskCheckbox`, decision J9). Removed the stale "proposal; settled in stage 3".
- **Component tokens** (`.ai/docs/design-system.md`): table token → utility → purpose for every component token and the custom utilities from `base.css`; states that task-row tokens belong to the task row and their reuse is open (proposal N2).
- **E04 Later**: table of the seven shopping-list questions the test left open, with what the test assumed.
- **Test prompt** (`.ai/design/prompt-agent-test.md`): UI language now points at design-system.md › Content (AGENTS.md does not say it).
- `packages/ui/POSTEP.md`: new section "Etap 6" with the test result and these fixes. `.ai/lessons.md`: lesson on `Tooltip` + `MenuTrigger`.
- **B:** proposals N1–N11 in `packages/ui/POSTEP.md` (Etap 6), each with variants and a recommendation, for the owner. N8 is based on a measurement in the built Storybook (Product/Tasks/Screens, 320 and 1440 px): a one-line task row is 68px, not the 64px of `task-row-min-height`; skeleton rows are 71.5–72.5px.

## Files changed

- `.ai/docs/design-system.md`, `.ai/design/prompt-agent-test.md`, `.ai/lessons.md`
- `.ai/runs/2026-10-23-shopping-screen-agent-test.md` (copied from the test branch), this log
- `packages/ui/POSTEP.md`
- `packages/ui/.storybook/docs/foundations/SpacingAndLayout.mdx`, `primitives/Checkbox.mdx`, `primitives/Tooltip.mdx`, `primitives/Tooltip.stories.tsx`, `system/epics/E04Later.mdx`

## Verification (commands run and results)

- `npm run format:check`, `npm run lint`, `npm run typecheck -w packages/ui`, `npm run check:tokens -w packages/ui`: clean.
- `npm run test:storybook -w packages/ui`: 896 passed (120 files; +2 = With Menu in both themes).
- Regression check for the Tooltip claim: with `aria-label` removed from `MenuTrigger`, the With Menu test fails in both themes with an empty bubble; restored, it passes.
- `npm run build-storybook -w packages/ui`: success. The four changed MDX pages render at 320 and 1440 px without page errors; GFM tables render; 3 `?path=` links on them resolve in `index.json`; no unescaped `{…}` in their prose. E04 page screenshot at 1440 looked at.
- Not run: `npm test`, `build`, `test:integration` (no code in `src` or the app changed).

## Problems / open questions

- **Pre-existing:** Foundations › Spacing and layout scrolls sideways at 320px (row anatomy diagram up to 423px, token table 349px). Not caused by this change (one paragraph edited); proposal N11.
- The skeleton/row height mismatch from the test (64 vs 68px) needs a component decision, so it is proposal N8.

## Lessons recorded (links into .ai/lessons.md)

- 2026-10-23 — `Tooltip` reads `aria-label` from its direct child; around `MenuTrigger` put the label there too.

## Follow-up: implementing decisions N1–N11 (2026-10-23)

Owner decision in chat: "wszystkie wg rekomendacji", so all of N1–N11 use the recommended variant. They are recorded in `packages/ui/POSTEP.md` › Etap 6, "Etap 6: wdrożenie decyzji N".

### Steps taken

- **N4 (tooltips):**
  - `DragHandle` now wraps its button in `Tooltip`.
  - `TaskRow`'s "…" is now `Tooltip > MenuTrigger(aria-label) > PopoverAnchor > Button`.
  - The handle's `hidden wide:inline-flex` moved to a wrapper span, because the tooltip trigger wraps the button.
  - New unit tests for both.
  - Tooltip.mdx §2 updated.
  - TaskRow/DragHandle anatomy updated.
- **N8 (row height):**
  - Skeleton rows in `TaskList` now use the row geometry (`py-row-y` + `min-h-touch` content). They are 68px, the same as a one-line row; before, they were 71.5px.
  - Regression play test in TaskList › Loading measures the rows against `tokenPx`. On the old code it fails with "expected 71.5 to be close to 68".
  - Token comments and docs now say "64px floor; a row with a 44px target is 68px".
- **N1, N2, N3, N5, N6, N7, N9, N10 (docs only):** no new components, variants or tokens.
  - List.mdx: new section "A list that is not tasks", plus the N10 rule.
  - QuickCapture.mdx: new section "A list whose items have only a name", plus N7.
  - CompleteAndReopen.mdx: rule 10 now covers N9.
  - Checkbox.mdx: §11 adds a done-item example (N5, N6).
  - HowToChoose.mdx: new row for N5 and N6.
  - Skeleton.mdx: §8 and §11 updated.
  - SpacingAndLayout.mdx: new row rule.
  - E04Later.mdx: new rows for N1, N3 and N7.
  - `.ai/docs/design-system.md`: If…then lines and the component-token purposes.
  - StartHere.mdx: legend now includes M1–M5 and N1–N11.
- **N11 (docs overflow at 320px):**
  - `DoDont` figure gets `min-w-0`, and its example sits in a named, focusable `overflow-x-auto` group.
  - `SpacingRelations` now wraps.
  - The Surface SignInCard catalog cell is now `wide`.

### Files changed (in addition to the list above)

- `packages/ui/src/product/tasks/drag-handle.tsx`, `task-row.tsx`, `task-list.tsx`, `tasks.test.tsx`, `sortable.test.tsx`
- `packages/ui/src/styles/tokens.css` (comments only)
- `packages/ui/.storybook/blocks/Primitives.tsx`, `Specimens.tsx`
- `packages/ui/.storybook/docs/`:
  - `primitives/`: `Surface.stories.tsx`, `Skeleton.mdx`
  - `patterns/`: `List.mdx`, `QuickCapture.mdx`, `CompleteAndReopen.mdx`
  - `system/`: `HowToChoose.mdx`, `StartHere.mdx`
  - `product/tasks/`: `TaskList.stories.tsx`, `TaskRow.mdx`, `DragHandle.mdx`

### Verification

- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run check:tokens -w packages/ui`: clean.
- `npm test`: 252 passed, 100% coverage.
- `npm run test:storybook -w packages/ui`: 896 passed (120 files, both themes, axe as error).
- `npm run build-storybook -w packages/ui`: success.
  - All 72 docs pages at 320 and 1440px: 0 horizontal scroll and 0 page errors. Before N11, 11 pages scrolled at 320px.
  - 165 `?path=` links checked against `index.json`: 0 missing.
  - Screenshots checked:
    - Patterns/List docs at 1440px;
    - Primitives/Input docs at 320px;
    - Product/Tasks/Screens Organized Desktop with the "…" tooltip;
    - Product/Tasks/Screens Loading at 320px.
- Not run: `npm run build`, `test:integration`, `audit` (the app was not changed; only the `ui` package and docs were).

### Problems / open questions

- The shopping-screen test file and its run log are still in `stash@{0}` for the `design/shopping-screen-agent-test` branch. Restore them with `git checkout design/shopping-screen-agent-test && git stash pop`. `.ai/lessons.md` may conflict.
- Nothing is committed.

### Lessons recorded

- 2026-10-22 docs-overflow lesson extended: scan every docs page at 320px; a flex/grid child needs `min-w-0` for its scroll box to shrink.
