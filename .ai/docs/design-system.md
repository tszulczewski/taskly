# Taskly design system (summary for agents)

The design system lives in `packages/ui` (`@taskly/ui`); its documentation is the Storybook in `packages/ui/.storybook` (`npm run storybook`, port 6006). This file is the short version for agents writing UI. When it and Storybook differ, Storybook and the sources it cites win; decisions and their history are in `packages/ui/POSTEP.md` (Polish).

Read before writing any screen: this file, then in Storybook **Design system / Start here**, **How to choose** and **What to avoid**, then the page of every component you use.

## Character

Taskly is a quiet list for someone in the middle of building work: it shows what to do next and what it may cost, and nothing else asks for attention. It speaks plainly, in short sentences, about tasks, places and money, never in the language of software teams. Colour is spent on two things only, actions and "completed".

- Is: simple, readable, sparing, matter-of-fact, calm.
- Is not: loud, scattered (many panels and windows), overloaded, technical (ids, jargon), generic (the look of any generated app).

Source: `.ai/design/reference.md`.

## Rules that are checked

- **Tokens only.** No hex/rgb/hsl outside `packages/ui/src/styles/tokens.css`, no Tailwind palette or numeric classes (`text-gray-500`, `p-4`, `text-sm`, `rounded-lg`, `shadow-*`: they do not compile), no arbitrary values (`p-[13px]`). `npm run check:tokens` fails on them.
- **Layering.** Primitives in `packages/ui/src/components/ui/` (added with `npx shadcn@latest add`, then rewritten to tokens); product components in `packages/ui/src/product/<epic>/` are presentational: props in, callbacks out, amounts arrive formatted; no `fetch`, no `@taskly/core`. The app wraps them with TanStack Query and the shared Zod schema (standards §5, decision P1).
- **Accessibility.** Every story runs in both themes with axe failing on any violation (`npm run test:storybook`). Keyboard works everywhere, focus is always visible, targets are at least 44 × 44 px.
- **Tests.** 100% unit coverage (`npm test`); interaction tests in story `play` functions.

## Components

Import everything from `@taskly/ui`. One line each; the Storybook page of each component has states, API and do/don't.

| Component | Import | When to use | When not |
| --- | --- | --- | --- |
| Button | `Button` | Submitting a form, confirming or cancelling, “Try again”; icon-only for a known gesture (…, +). | Going to another page (Link); a quiet action in a row (TextAction); several row actions (“…” menu). |
| Text action and link | `TextAction, Link` | “Add estimate”, “Add subtask”, a muted prompt for an empty value; Link for any navigation. | The main action of a form (Button primary); something that does not navigate, as a Link. |
| Input | `Input` | Task title, email, name, min and max (`inputMode="decimal"`, suffix “zł”). | A password (PasswordInput); several sentences (Textarea); a field without a visible label. |
| Password input | `PasswordInput` | The password on sign-in and sign-up. | Any value that is not secret; a “Repeat password” field. |
| Textarea | `Textarea` | The optional task description. | A title, a name or an amount (Input); a description that is only shown. |
| Form field | `FormField, Label` | Around every Input, PasswordInput and Textarea. | An error about the whole form (Alert); a rule for the whole screen (one sentence). |
| Checkbox | `Checkbox, Label` | Several independent choices, such as the places of a task. | One choice of several (RadioGroup); an action (Button); completing a task (TaskCheckbox). |
| Radio group | `RadioGroup, RadioGroupItem, RadioGroupSegment` | The theme switch (segmented); one colour out of a few. | Several may be chosen (Checkbox); more than about 5 options. |
| Surface | `Surface` | The task list, the future expenses line, the sign-in card. | Inside another Surface; one card per task; tiles with numbers. |
| Alert | `Alert` | A failed sign-in or sign-out; a refused save above a form. | An error about one field (FormField); success; a notice that disappears (no toasts). |
| Skeleton | `Skeleton` | The first load of the task list or the future expenses line. | Waiting for a button (Button loading); a change already shown optimistically. |
| Collapsible | `Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsibleIndicator` | Quick-add Details, a task row's details, “N tasks without an estimate”. | Details in a drawer or window; switching views; a rule the user needs to act. |
| Confirm dialog | `ConfirmDialog` | Deleting (danger); completing a task with open subtasks (primary). | An action undone in one tap; details or a form; reporting a failure. |
| Menu | `Menu, MenuTrigger, MenuContent, MenuItem, MenuCheckboxItem, MenuSeparator` | The task row menu: Add subtask, Edit, Places…, markers, moves, Delete. | The main action of a screen; one value of several (RadioGroup); navigation. |
| Popover | `Popover, PopoverTrigger, PopoverContent, PopoverAnchor` | The place picker of a task row. | A list of actions (Menu); a whole form (in the row); a question before deleting. |
| Tooltip | `Tooltip` | Every icon-only button: handle, “…”, plus. | A button with text; why something is disabled; anything the user needs to act. |
| Empty state | `EmptyState` | No tasks yet; nothing to show in a region. | Loading (Skeleton); a failed load (ErrorState); one missing value (muted text). |
| Error state | `ErrorState` | The task list failed to load. | A field error; a failed save (inline Alert); the future expenses line (inline). |
| App shell | `AppShell, AppHeader` | Every signed-in page. | Sign-in and sign-up (AuthCard); side bars or panels. |
| Theme toggle | `ThemeToggle` | Once, in the top bar. | Following the operating system; any other on/off setting. |
| Auth card | `AuthCard` | `/sign-in` and `/sign-up`. | Signed-in pages (AppShell); a panel inside a page (Surface). |
| Sign-in form | `SignInForm` | The `/sign-in` page, inside AuthCard. | Creating the account; Google sign-in (after the MVP). |
| Sign-up form | `SignUpForm` | `/sign-up` while sign-up is open. | Sign-up closed (SignUpClosed); inviting people (version 2). |
| Sign-up closed | `SignUpClosed` | `/sign-up` while sign-up is closed (the default). | Sign-up is open; a failed request (Alert). |
| Quick add | `QuickAdd` | Above the list, the one way to add a task; under an expanded task for subtasks. | Changing a task (TaskForm); a form in a modal; a subtask under a subtask. |
| Task list | `TaskList` | The main screen `/`, under quick add. | Columns by status (a board); a table of amounts. |
| Task row | `TaskRow` | Every task and subtask; TaskList renders the rows. | A card per task; details in a drawer; many amount columns. |
| Task form | `TaskForm` | “Edit” in a row's menu; TaskRow renders it. | Adding (QuickAdd); details in a drawer; deleting. |
| Estimate range | `EstimateRange` | The right end of a task or subtask row. | Typing an amount (Input); a real cost; the future expenses total. |
| Delete task dialog | `DeleteTaskDialog` | “Delete” in a row's menu; TaskList opens it. | Any other confirmation (ConfirmDialog); undo after the fact (there is none). |
| Drag handle | `DragHandle, SortableGroup` | Rows of a list that can be reordered, from 640px. | Below 640px (long press, Move up / down); pending or completed rows. |
| Markers | `Markers` | The meta line of a row, after the places. | Setting a marker (row menu); a place (PlaceTag); a warning (Alert). |
| Task checkbox | `TaskCheckbox` | Every row once the list has completion. | A choice in a form (Checkbox); markers; completing many tasks at once. |
| Subtask progress | `SubtaskProgress` | The meta line of a task with subtasks, with completion. | A list without completion (“3 subtasks”); a bar or a percentage. |
| Complete task dialog | `CompleteTaskDialog` | Checking a task with at least one open subtask; TaskList opens it. | A task without open subtasks, a subtask, reopening: act at once. |
| Place tag | `PlaceTag` | The meta line of a row; next to a place in the picker. | Choosing places (PlacePicker); markers; filtering (not in version 1). |
| Place picker | `PlacePicker` | The popover that “Places…” in a row's menu opens. | Showing places (PlaceTag); markers; a separate page to manage places. |
| Place color picker | `PlaceColorPicker` | Creating the seventh and later places; editing a place. | The first six places (automatic); any colour outside the ten. |
| Future expenses | `FutureExpenses` | Once, under the list's name, above quick add. | Tiles with several numbers; spent or budget (version 2); one task's estimate. |
| Unestimated tasks | `UnestimatedTasks` | Under the future expenses total; FutureExpenses renders it. | Changing an existing estimate (Edit); subtasks; a separate summary page. |

Not built on purpose (ask the product owner first): Avatar, Tabs, Toast, StatusBadge, Select, Switch, a general-purpose Dialog, a list with filters, bottom navigation on phones (decisions P4, E1).

Growing the system: a need on one screen → build it from primitives there; the same need in at least two places → propose a component; a different look for a different meaning → a variant named by meaning (`danger`), not look (`red`) (task stage 4, decision L1).

## Semantic tokens

Use the utility, never the raw value. Raw tokens (`--raw-*`) are only for `tokens.css`.

| Token | Utility | Purpose |
| --- | --- | --- |
| `color-surface-page` | `bg-page` | Page background. |
| `color-surface-list` | `bg-list` | The one continuous list surface; the future expenses line; the sign-in card. |
| `color-surface-raised` | `bg-raised` | A hovered, open or dragged row; menus, popovers, dialogs; loading bars; the error alert. |
| `color-surface-raised-hover` | `bg-raised-hover` | A highlighted menu item. |
| `color-scrim` | `bg-scrim` | Behind the confirm dialog. |
| `color-border-divider` | `border-divider` | Line between rows; decorative only. |
| `color-border-control` | `border-control` | Edge of fields, unchecked checkboxes and overlays. |
| `color-focus-ring` | `focus-visible:focus-ring` | Keyboard focus outline (2px, offset 2px; fields `focus-ring-field`). |
| `color-text-primary` | `text-primary` | Titles, amounts of open tasks, body text. |
| `color-text-muted` | `text-muted` | Second line of a row, markers, "1/3", helper text, completed tasks, empty values. |
| `color-text-danger` | `text-danger`, `border-danger` | Validation and error messages; the delete button's text. |
| `color-action-primary` | `bg-action`, `text-action`, `border-action` | Primary button, checked checkbox, text actions. |
| `color-action-primary-hover` | `hover:bg-action-hover` | Hover and press of the primary button. |
| `color-text-on-action` | `text-on-action` | Text and check mark on the action colour. |
| `color-place-1` … `color-place-10` | `bg-place-N` | Place dots only, always next to the place name. |
| `font-size-meta` / `body` / `heading` | `text-meta`, `text-body`, `text-heading` | 13 / 15 / 22 px; fields on phones 16 px (`text-input-mobile`). |
| `font-weight-regular` / `strong` | `font-regular`, `font-strong` | 400 / 600; no other weights, no capitals. |
| `space-inline` | `gap-inline`, `p-inline` | 4px: inside one element (icon and its word). |
| `space-group` | `gap-group` | 8px: items of one group. |
| `space-between-groups` | `gap-between-groups` | 16px: between groups. |
| `space-inset` | `p-inset` | 16px: inside a panel. |
| `space-section` | `gap-section` | 32px: between sections. |
| `space-page-gutter`, `space-page-top` | `px-page-gutter`, `pt-page-top` | Page edges: 16px on phones, 24px from 640px; 48px above content. |
| `radius-control`, `radius-surface` | `rounded-control`, `rounded-surface` | 8px controls, 12px surfaces. |
| `layout-content-max-width`, `layout-text-measure` | `max-w-content`, `max-w-measure` | 980px column; 65ch for text. |
| `touch-target-min`, `control-height` | `size-touch`, `min-h-touch`, `min-h-control` | 44px targets and controls at every width. |
| `motion-duration-quick` / `base`, `motion-easing` | `duration-quick`, `duration-base`, `ease-standard` | 150 / 200 ms ease-out; 0 with reduced motion. |
| `opacity-disabled` | `disabled:opacity-disabled` | Disabled controls. |

Breakpoint: only `wide:` (640px). Numbers: `numeric` (tabular figures). The full lists, both themes and the contrast table are in Storybook, Foundations.

## If … then use …

- One main action of a form → `Button variant="primary"`; cancel, retry, a second action → `Button`; delete after a question → `Button variant="danger"`.
- A quiet action in a row → `TextAction`; navigation → `Link`; several row actions → one "…" `Menu`; an icon only for a known gesture, with `aria-label` (+ `Tooltip`).
- Details or a form for one task → open in the row (`Collapsible`, `TaskForm`); never a drawer or a general dialog.
- Something lost for good → `ConfirmDialog` (danger) naming the object; more changes than tapped → `ConfirmDialog confirmVariant="primary"`; undoable in one tap → act at once.
- One field wrong → `FormField` error; the form failed → `Alert` above it; an optimistic change refused → message in that row; a screen failed to load → `ErrorState`; one line failed → message in the line. Never a toast. Success → nothing; the result is the confirmation.
- First load → static `Skeleton`; a running button → `Button loading` with "Saving…".
- Many items → rows on one `Surface` divided by a line; a total → one line (`FutureExpenses`), never tiles; never a board, cards per item or a many-column table.
- Several choices → `Checkbox` per option; one of 2–5 → `RadioGroup`; completing a task → `TaskCheckbox`; a marker → `MenuCheckboxItem`.

## What to avoid

- Taskly's anti-references: a loud bar on a white page, a board of columns, an overloaded task card, drawers and panels in panels, tiles of numbers, version 2 features (spent, budget, AI estimate, sharing), a long add form, a spreadsheet, a tool for programmers (ids, jargon, shortcut-only actions), coloured pills for places (A01.1–A05, R02.x).
- The generic generated look: gradients, glass and blur, glow, emoji, sparkles for AI, three identical icon cards, pills everywhere, a card in a card, shadows as the only separation, everything centred, capital labels with wide spacing (A02, P12).
- Implementation mistakes: a value outside tokens, a variant added in passing, a `div` with `onClick`, a placeholder as the label, colour as the only signal, a disabled button with no explanation, a toast for an actionable error, essential information in a tooltip, an icon button without a name, `fetch` or business rules in a component.

## Content

- English first in stories (specs are in English); Polish is the main language of the product, with **ty** form and imperative buttons. Glossary: task → zadanie, subtask → podzadanie, future expenses → przyszłe wydatki, completed → ukończone, estimate → szacunek, place → miejsce.
- Buttons are verbs, with the object when not obvious ("Delete task"); pending labels "Saving…"; icon-button names say action and object ("More actions for “Seal the bath”").
- Errors say what happened and what to do, next to where it happened; empty states say why and the next step.
- Money: integer grosze end to end, formatted by the server; an estimate is "1 200–1 500 zł" (non-breaking spaces, en dash without spaces, grosze only when not zero). `formatPlnRange` in `@taskly/core` does not do this yet (decision F11).
- Dates and times are not shown in version 1; when they appear: "22 paź 2026", "14:30" / "22 Oct 2026", "2:30 pm" (decision L2). The language comes from the browser on the first visit, with no switch in version 1 (decision L3).

## Commands

| Command | What it does |
| --- | --- |
| `npm run storybook` | Storybook on port 6006 |
| `npm run build-storybook` | static Storybook in `packages/ui/storybook-static` |
| `npm run test:storybook` | every story in both themes, with interaction and a11y checks |
| `npm run check:tokens` | fails on any value outside the tokens |
| `npm test` | unit tests with 100% coverage |

## Sources

Every rule in Storybook names its source; a rule without one is marked "proposal".

| Id | Where |
| --- | --- |
| R01.x, R02.x, A01.x–A05, Q1–Q5, P01–P15, Luki 1–10 | `.ai/design/reference.md` (and screenshots in `.ai/design/reference/`) |
| T1–T10, tokens rule 1–15 | `.ai/design/tokeny.md` |
| D01–D21, R06–R11, N01–N04 | `.ai/specs/product-brief.md` |
| P1–P5, K1–K5, B–J, L1–L4 decisions | `packages/ui/POSTEP.md` |
| task rule N | `.ai/design/prompt-storybook.md` |
| standards §N | `.ai/docs/engineering-standards.md` |
