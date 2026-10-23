# Design-system agent test: shopping list screen

- **Date:** 2026-10-23
- **Spec:** none — task `.ai/design/prompt-agent-test.md` (design-system stage 5, decision M5 in `packages/ui/POSTEP.md`)
- **Outcome:** success

## Goal

Build the quick shopping list screen (E04 "Later", brief Evidence) only from the design system, as a Storybook story `Product/Shopping/Screens` on its own branch, and record every place where the system did not answer a decision. The screen is a documentation exercise, not a scope decision (D13).

## Read first

`.ai/lessons.md`, `.ai/docs/design-system.md`, `packages/ui/POSTEP.md` (stage 5), Storybook MDX: Start here, How to choose, What to avoid, What is missing, Content, Contributing; Patterns: List, Quick capture, Inline edit, Delete confirmation, Optimistic change, Complete and reopen, Details in row; Foundations: Spacing and layout; components: App shell, Quick add, Checkbox, Task checkbox, Skeleton, Empty state, Menu, Confirm dialog, Tooltip; sources of `TaskList`, `TaskRow`, `QuickAdd`, `TaskForm`, `useForm`, primitives, `tokens.css`, `theme.css`, `base.css`; `.storybook/blocks/TaskScreen.tsx`, `task-data.ts`; Tasks `Screens.stories.tsx`.

## Step 1: decisions before code

R = REGUŁA (a written rule; file and place), P = PRZYKŁAD (only an example in code or Storybook), G = ZGADUJĘ (neither; what I assume).

### Layout

| # | Decision | Tag | Where / assumption |
| --- | --- | --- | --- |
| 1 | Frame: `AppShell` (top bar, `<main>` column 980px, gutters, `pt-page-top`) | R | design-system.md › Components (App shell: "Every signed-in page"); AppShell.mdx §2 |
| 2 | Page = `h1` + add form + list in one `flex flex-col gap-between-groups` column; `h1` is `text-heading font-strong` | P | `.storybook/blocks/TaskScreen.tsx` (return block). Spacing relations are a rule (SpacingAndLayout › Relations, T7), but which relation the heading/form/list have is only shown there |
| 3 | Heading text "Shopping list" / "Lista zakupów" | G | No name in brief or spec; tasks use the list name "My renovation" (spec E01). Assumed the feature name from AGENTS.md ("shopping list") |
| 4 | Navigation between the task list and the shopping list | G | Conflict: SpacingAndLayout › Layout says "On phones navigation sits at the bottom (P07, R02.11)"; AppShell.mdx §4 and decision E1 say no bottom navigation in version 1, "it comes back with a second screen" — this is a second screen, but there is no navigation component. Assumed: no navigation on the screen (the task lists only list, add, check, edit, delete) |
| 5 | Add field above the list | R | Patterns › Quick capture; design-system.md › Components (Quick add: "Above the list") |
| 6 | One-handed use on a phone (thumb reach: add field at the top vs. the bottom, sticky field) | G | Nothing on one-handed use, thumb zone or sticky controls (searched all MDX for "thumb", "one hand", "sticky", "reach"). Assumed: same as tasks, field at the top, page scrolls |
| 7 | All items on one `Surface`, rows divided by 1px lines, no cards | R | Patterns › List rules 1–2; How to choose › Table, list, cards |
| 8 | No reorder (no handle, no Move up/down) | G | Reorder is defined for tasks only; the brief says nothing about the order of purchases. Assumed: order of adding, bought after open |

### Components

| # | Decision | Tag | Where / assumption |
| --- | --- | --- | --- |
| 9 | Add form built from `useForm` + `FormField` + `Input` + `Button` + `Alert`, copying `QuickAdd`'s structure | G | `QuickAdd` always renders "Details" with description and min/max in zł (quick-add.tsx; QuickAdd.mdx §4: Details "yes"), and prices are out of scope. No rule says what to do when a product component almost fits; Contributing says "build it from primitives in that screen" for a one-screen need (task, stage 4) |
| 10 | List rows built from `li` + `Checkbox` + `Label` + `Menu`, copying `TaskRow` | G | `TaskRow` always renders `EstimateRange` ("No estimate"), and its menu has "Add subtask"; `TaskList` only renders `TaskRow`. No generic list row exists |
| 11 | Row geometry `min-h-row items-start gap-group px-inset py-row-y`, `border-t border-divider first:border-t-0`, `hover:bg-raised` | G | Example in task-row.tsx (lines 345, 376–377), but the tokens behind `min-h-row`/`py-row-y` are component tokens of the task row (`--task-row-min-height`, `--task-row-padding-y`; tokeny.md: component tokens "only where a component needs its own value"). Assumed reuse is allowed because the utility names are generic |
| 12 | "Bought" control: `Checkbox` with a visible `Label` (the item name), not `TaskCheckbox` | G | How to choose › Switch and checkbox covers "a task done" (TaskCheckbox) and "a choice in a form" (Checkbox); a bought item is neither. Checkbox.mdx §11 shows `Checkbox` + `Label` "Buy primer"; §8 "The label is the thing that gets done, not an instruction" — but TaskCheckbox uses the instruction "Complete “{title}”". Assumed the Checkbox rule; the whole name is a tap target |
| 13 | Bought row: stays in the list, box checked, name muted and struck through | R | Patterns › Complete and reopen rule 1 (R02.2); Foundations: colour only for actions and "completed" |
| 14 | Bought items after open ones; an unchecked item goes first | G | Rule exists for tasks only (decision 2026-10-21, Complete and reopen rules 2–3). Assumed it carries over |
| 15 | Row actions in one "…" `Menu`: Edit, separator, Delete (danger, last) | R | How to choose › Button… ("one row has several actions → one … Menu"); Menu.mdx §5 (danger last, after a separator) |
| 16 | "…" wrapped in `Tooltip` | R | design-system.md › Components (Tooltip: "Every icon-only button: handle, “…”, plus"); Tooltip.mdx line 88. Note: `TaskRow`'s "…" has no Tooltip (task-row.tsx 245–258) — conflict |
| 17 | "…" icon Lucide `Ellipsis`, `Button variant="ghost" size="icon"` | R | Menu.mdx §4 Trigger; Luki 7 |
| 18 | Edit opens in the row: same field prefilled, Save (primary) / Cancel, Escape cancels, focus to the field, back to "…" after | R | Patterns › Inline edit rules 1–3 (F6, F2) |
| 19 | Edit form on `bg-raised p-inset`, buttons `flex flex-col gap-group wide:flex-row` | P | task-row.tsx line 356; task-form.tsx (buttons) |
| 20 | Delete asks first in `ConfirmDialog` (danger), naming the item; focus on Cancel; pending and error inside; after delete focus to the list | R | Patterns › Delete confirmation rules 1–5; How to choose › Dialog |
| 21 | A cheap item still gets the delete question | R | Patterns › Delete confirmation rule 1 ("Ask before every delete"); deleting is not undoable, so How to choose's "act at once" does not apply. (Tagged G before coding; re-read, the rule is explicit.) |
| 22 | No "Clear bought items" action; bought items leave only by Delete | G | Nothing in brief or system; assumed out of scope |

### States

| # | Decision | Tag | Where / assumption |
| --- | --- | --- | --- |
| 23 | Loading: `Surface aria-busy`, static `Skeleton` rows in the row shape, one visually hidden `role="status"` | R | Patterns › List rule 3; Skeleton.mdx §4, §8 ("bars in the shape of the real rows") |
| 24 | Skeleton shape: one bar per row (items have one line), three rows | G | Skeleton §8 only describes the two-line task row; the number three comes from task-list.tsx |
| 25 | Load failed: `ErrorState` with "Try again" in place of the list; the add form stays | R | Patterns › List rule 5; How to choose › Field error, alert, toast |
| 26 | Empty: `Surface` + `EmptyState` (why + next step), focus in the add field | R | Patterns › List rule 6; EmptyState.mdx §2, §8; Content › Empty states |
| 27 | Adding in progress: pending row at the end at once, muted name, "Saving…" meta line, actions and checkbox disabled; button "Adding…" | R | Patterns › Optimistic change rules 1–2 (F3); Quick capture rule 3; Content › pending labels |
| 28 | Pending meta line `text-meta text-muted` under the name | P | task-row.tsx 440–441 |
| 29 | Add failed: pending row removed, `Alert` above the form, typed text kept | R | Patterns › Quick capture rule 5; Optimistic change rule 4 |
| 30 | Added: row highlighted (`row-highlight`), scrolled into view, field cleared with focus | R | Patterns › Quick capture rules 3–4, 6 |
| 31 | Checking or unchecking: at once; a refusal puts it back with a message in the row (`role="alert"`, `text-meta text-danger`) | R | Patterns › Optimistic change rule 4; How to choose › "a change shown at once was refused" |
| 32 | Row message indented past the checkbox | P | task-row.tsx `UnderTitle` (lines 104–121, 493–498) |
| 33 | Bought row slides to its new place (`motion-duration-base`) | G | Complete and reopen rule 10 asks for it, but `useMoveAnimation` is not exported from `@taskly/ui`. Assumed: no animation; focus kept on the checkbox |
| 34 | Everything bought: all rows muted, nothing else | G | No rule for an "all done" list; Tasks › All Done only changes the total. Assumed no extra message |
| 35 | Many items: the page scrolls, the list never gets its own scroll area | R | Patterns › List rule 8 (WCAG 1.4.10) |
| 36 | Long names wrap beside the box (never truncate), first line aligned with the box | R | Checkbox.mdx §8; Content › Buttons (wrap, never truncate) |
| 37 | Name length limit and its message | G | No schema for items; task titles are 1–200 (spec E01). Assumed only "required", no length rule shown |

### Spacing, colour, type

| # | Decision | Tag | Where / assumption |
| --- | --- | --- | --- |
| 38 | Only semantic utilities (`bg-list`, `text-muted`, `text-danger`, `gap-group`, `p-inset`…) | R | design-system.md › Rules that are checked; `npm run check:tokens` |
| 39 | Field and "Add" on one line, `gap-group` | R | QuickAdd.mdx §9 (320px: "Title and Add share a line") |
| 40 | Item name weight: regular (Label default), not strong like a task title | G | Label is `font-regular`; task titles are `font-strong`; Contributing forbids a `className` that changes a component's look. Assumed Label as is |
| 41 | Muted + struck-through name on a `span` inside `Label` (not a class on Label) | G | Same Contributing rule; no example of a checked label |

### Text and content

| # | Decision | Tag | Where / assumption |
| --- | --- | --- | --- |
| 42 | UI in English in stories, plus a Polish story | R | design-system.md › Content; Content.mdx intro (Luki 5, Q5, P5) |
| 43 | Word for one thing on the list: "item" / "rzecz"; field "New item" / "Nowa rzecz"; edit field "Name" / "Nazwa"; confirm "Delete item" / "Usuń rzecz" | G | Glossary has no shopping words (Content › Glossary). Assumed "item"; the user's need says "rzecz" |
| 44 | Message shapes: "Could not add the item. Try again.", "Could not save “Glue”. It is back as it was.", "Could not load your shopping list.", "Could not delete the item. Try again." | R | Content › Errors (shapes from spec E01, decision H5); the wording for items is mine |
| 45 | Empty text: "Nothing to buy yet." + "Add the first thing you need to buy." | R | Content › Empty states (why + next step); wording adapted from "No tasks yet." |
| 46 | Names: "More actions for “Glue”", "Delete “Glue”?" | R | Content › Buttons and actions (icon button names action + object; questions name the object) |
| 47 | Example items beyond the three in the brief (many items) | G | The brief names only door lock, glue, grass fertilizer (Evidence). Assumed materials named in the brief and spec E01 / task data: grass seed, primer, paint, masking tape, grout, plaster, curtain rods, tiles, kitchen tap |
| 48 | Long-name examples | G | No long shopping names in the sources; assumed two long names built from the brief's own words |

### Behaviour on error and on the phone

| # | Decision | Tag | Where / assumption |
| --- | --- | --- | --- |
| 49 | No toasts; every error where it happened (form, row, dialog, list) | R | How to choose › Field error, alert, toast; What to avoid › 3 |
| 50 | Touch targets 44px (checkbox, "…", field, buttons) | R | design-system.md › Accessibility (44 × 44 px); tokens `touch-target-min` |
| 51 | Delete dialog at 320px: full width, buttons stacked, confirm on top | R | ConfirmDialog.mdx §9 |
| 52 | Offline / no network on add | R | Patterns › Form; `useForm` `unexpectedError` "Something went wrong. Try again." (Content › Errors) |

**Count:** REGUŁA 29, PRZYKŁAD 4, ZGADUJĘ 19 (52 decisions).

## Steps taken

- Branch `design/shopping-screen-agent-test` from `main` (a3e386b).
- Read the sources above, wrote the Step 1 table before any code.
- Built the screen in one story file from `@taskly/ui` exports only: `AppShell`, `useForm`, `FormField`, `Input`, `Button`, `Alert`, `Surface`, `Checkbox`, `Label`, `Menu*`, `Tooltip`, `ConfirmDialog`, `Skeleton`, `EmptyState`, `ErrorState`, `cn`; Lucide `Ellipsis`. The simulated server copies `TaskScreen` (confirm, refuse, never answer). Nothing added to `packages/ui/src`, no new tokens, variants, exports, tests or config entries; no MDX page (the state map is in the story file's doc comment and below).
- 19 stories, each with a play function where the state needs an interaction.

## State map

| State | Story | Width |
| --- | --- | --- |
| Ready: open and bought items | List Phone / List Tablet / List Desktop | 320 / 768 / 1440 |
| Loading (first load) | Loading | 320 |
| Empty (first visit), focus in the field | Empty | 320 |
| Load failed → Try again → ready | Load Failed | 1440 |
| Adding: pending row → confirmed, field cleared with focus | Add Item | 320 |
| Adding in progress (server never answers) | Pending Add | 768 |
| Add refused: row gone, Alert above the field, text kept | Add Failed | 320 |
| Marked bought: moves after open items, focus stays on its box | Mark Bought | 320 |
| Marking refused: back, message in the row | Mark Bought Failed | 768 |
| Editing the name in place | Edit Name | 320 |
| Delete asked | Confirm Delete | 320 |
| Deleted, focus on the list | Delete Item | 1440 |
| Everything bought | All Bought | 768 |
| Many items | Many Items / Many Items Phone | 1440 / 320 |
| Long names | Long Names | 320 |
| Polish text | Polish Phone | 320 |

## Gaps (what I guessed, where, what the system needs)

### Missing component

1. **Quick add without details** (#9). `QuickAdd` always renders "Details" with description and min/max zł. Guessed: rebuilt it from `useForm` + `FormField` + `Input` + `Button` + `Alert`. Needs: either a `QuickAdd` mode without details, or a documented recipe "quick add for a list that is not tasks".
2. **A list row / list that is not a task** (#10, #11, #32). `TaskList`/`TaskRow` always show an estimate ("No estimate") and task menu items. Guessed: copied TaskRow's layout (checkbox, name, "…", row message under the name). This is the second list in the product, so by Contributing ("same need in at least two places → propose a component") a generic row (checkbox + text + "…" + pending/error lines) should be proposed.
3. **Navigation between the task list and the shopping list** (#4). No component; decision E1 says it "comes back with a second screen". Guessed: none shown.
4. **Move animation for other lists** (#33). `useMoveAnimation` is not exported, so a bought item jumps instead of sliding (Complete and reopen rule 10). Needs: export it or say other lists may jump.

### Missing state

5. **Everything done** (#34): no rule for a list whose items are all completed (message or not). Guessed: rows only.
6. **Skeleton for one-line rows** (#24): Skeleton §8 describes only the two-line task row. Guessed: one bar per row, three rows. The skeleton row (64px) is also 4px shorter than a real row with a 44px checkbox (68px), so the list jumps a little when it loads.
7. **Removing completed items in bulk** (#22): no pattern; bought items leave only one by one through Delete. Product decision.
8. **Name too long** (#37): no schema for items; only "required" is shown.

### Missing rule (when to use what)

9. **One-handed phone use** (#6): nothing on thumb reach, a field at the bottom, or a sticky add field — the user's need is explicitly one-handed in a shop. Guessed: field on top, like tasks.
10. **Done/bought for something that is not a task** (#12): How to choose covers only TaskCheckbox (task) and Checkbox (form choice). Guessed: `Checkbox` + visible `Label` with the name.
11. **Order of done items outside tasks** (#14): decision 2026-10-21 is written for tasks. Guessed: same (open first, unchecked back to the top).
12. **Reorder outside tasks** (#8): guessed no reorder.
13. **Reusing component tokens** (#11): `min-h-row`, `py-row-y` come from `--task-row-*`; tokeny.md says component tokens are for one component. Guessed: reuse is fine. Needs: rename to a list-row token or say they are for every list row.
14. **Completed look on a Label** (#40, #41): Contributing forbids look-changing `className` on a component, but there is no completed style for `Label`. Guessed: a `span` inside Label with `text-muted line-through`; name in regular weight (task titles are strong).
15. **Words for the shopping list** (#3, #43): glossary has no "shopping list", "item", "bought". Guessed: "Shopping list" / "Lista zakupów", "item" / "rzecz", "Delete item" / "Usuń rzecz".
16. **Example data** (#47, #48): the brief names three items; "many items" and "long names" need more. Guessed: materials from brief and spec E01 (grass seed, primer, paint, masking tape, grout, plaster, curtain rods, tiles, kitchen tap), long names from the brief's own words.

### Unclear or conflicting documentation

17. **Bottom navigation:** Foundations › Spacing and layout says "On phones navigation sits at the bottom (P07, R02.11)" and "version 1 has two places, the list and future expenses"; App shell §4 and decision E1 say there is none in version 1 and one screen.
18. **Tooltip on "…":** design-system.md and Tooltip.mdx say every "…" has a Tooltip; `TaskRow`'s "…" has none. Tooltip.mdx's snippet `<Tooltip><MenuTrigger asChild><Button …/></MenuTrigger></Tooltip>` gives an empty tooltip as written: `Tooltip` reads `aria-label` from its direct child, which is `MenuTrigger`. Done here: `aria-label` on both `MenuTrigger` and `Button`.
19. **Checkbox name:** Checkbox.mdx §8 "the label is the thing that gets done, not an instruction" vs TaskCheckbox "Complete “{title}”".
20. **Utilities missing from the token table** in design-system.md: `min-h-row`, `py-row-y`, `pl-row-indent`, `w-touch`, `size-icon`, `h-lh`, `row-highlight` — the screen needs several of them and they are only found in component code and `theme.css`/`base.css`.
21. **Scope:** What is missing › Later says nothing should look ready for the quick shopping list (R02.8, P03); this test builds it (stage 5, M5). Fine as an exercise, but the story sits next to version 1 screens with no "Later" marker.
22. **UI language for the test:** the task says "language as in the project (see AGENTS.md)"; AGENTS.md does not say it; design-system.md › Content does (Polish product, English first in stories).

## Hard-coded values

`npm run check:tokens -w packages/ui`: "no values outside the token system". Manual grep of the story file: no hex/rgb/hsl/oklch, no palette classes, no arbitrary values; the only numeric-looking classes are `min-w-0` (zero, allowed) and `w-1/2` (fraction, allowed).

## Files changed

- `packages/ui/.storybook/docs/product/shopping/Screens.stories.tsx` (new)
- `.ai/runs/2026-10-23-shopping-screen-agent-test.md` (this log), `.ai/lessons.md` (one line)

## Verification (commands run and results)

- `npm run typecheck -w packages/ui`: no errors. `npm run lint`: no errors. `npm run format:check`: clean. `npm run check:tokens -w packages/ui`: clean.
- `npx vitest run .storybook/docs/product/shopping/Screens.stories.tsx` (in `packages/ui`): 38 passed (19 stories × 2 themes, play functions and axe with `a11y.test = "error"`).
- `npm run build-storybook -w packages/ui`: success. 16 stories × 2 themes at their widths in the built Storybook (Playwright): no horizontal scroll; screenshots looked at (list 320 dark, list 1440 light, long names 320, delete dialog 320 light, edit 320, row error 768 light, loading 320).
- Not run: the full `npm run test:storybook` (other stories unchanged), `npm test`, `build`, `test:integration` (no app or `src` code changed). Not checked: screen reader, Firefox/Safari, real touch devices.

## Problems / open questions

- Before coding I tagged #21 as a guess; on re-reading, Delete confirmation states the rule. Changed to REGUŁA.
- Gaps above are for the product owner: fill each in the docs or add it to "What is missing" (per the task).

## Lessons recorded (links into .ai/lessons.md)

- 2026-10-23 — `Tooltip` reads `aria-label` from its direct child; around a `MenuTrigger` put the label on `MenuTrigger` too.
