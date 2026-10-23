# Design system and Storybook in packages/ui

- **Date:** 2026-10-21
- **Spec:** none (task prompt `.ai/design/prompt-storybook.md`; progress and approved decisions in `packages/ui/POSTEP.md`)
- **Outcome:** in progress

## Goal

Build the Taskly design system in `packages/ui` with Storybook documentation in `packages/ui/.storybook`, in stages 0–5, stopping after each stage for the owner's "dalej".

## Steps taken

- Stage 0 (2026-10-21): inventory and plan written to `packages/ui/POSTEP.md`; owner accepted proposals P1–P5.
- Stage 1 (2026-10-21): foundations.
  - Installed Storybook 10.6.3 (react-vite), addon-docs (+ remark-gfm), addon-a11y, addon-vitest with Vitest 5.0.4 browser mode (Playwright Chromium), Vite 8, Tailwind 4.3.3, fontsource Instrument Sans, lucide-react. Configured by hand (no `storybook init`, so no onboarding addon).
  - Tokens in three layers (`src/styles/tokens.css`), Tailwind bridge without the default theme (`theme.css`), base styles, package export `@taskly/ui/styles.css`.
  - Re-measured contrast from the written values: identical to tokeny.md; only the decorative divider (T1) is below 3:1.
  - Theme switch on the root element, a11y test = error, one Vitest project per theme.
  - Seven Foundations pages with live token blocks; `check:tokens` script.
- Stage 2 (2026-10-21): owner accepted F1–F8 and K1–K5.
  - Batch 1: `shadcn add button input textarea label` (CLI 4.22.1), then rewrote all four on tokens and added TextAction/Link, FormField, PasswordInput; `cn` helper with token-aware tailwind-merge.
  - Docs pages with 13 sections and 40 stories in `.storybook/docs/primitives/`; frozen states via `@custom-variant` overrides in `preview.css`.

- Stage 2 reverted (2026-10-21), at the owner's request ("cofnąć się do stanu etapu 1, tak jakbyśmy nie robili etapu 2"):
  - Deleted `components.json`, `src/components/`, `src/lib/`, `.storybook/docs/primitives/`, `.storybook/blocks/Matrix.tsx`.
  - Restored `src/index.ts`; uninstalled `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`.
  - Removed the K1–K5 tokens and utilities, the frozen-state variants, the docs frame decorator, the `-0` exception in `check-tokens`, the stage 2 POSTEP sections and the two batch 1 lessons.
  - Kept everything from stage 1, including F1–F8 and the CI job (F8). K1–K5 answers are no longer recorded in POSTEP.

- Stage 2 restarted (2026-10-22, new session): wrote the shape, density and state differences against shadcn and questions K1–K5 to `packages/ui/POSTEP.md`; no components added yet, waiting for the owner.

- Stage 2, batch 1 (2026-10-22): owner chose K1 = A and accepted K2–K5. Added Button, TextAction, Link, Input, PasswordInput, Textarea, Label and FormField with K1–K3 tokens, unit tests, six 13-section docs pages and 41 stories. Details, verification and proposals B1–B9 in `packages/ui/POSTEP.md`.

- Stage 2, batch 2 (2026-10-22): owner accepted B1–B9. Added Checkbox, RadioGroup (list and segmented), Surface, Alert, Skeleton and Collapsible with unit tests, six 13-section docs pages and 40 stories. Proposals C1–C10 in `packages/ui/POSTEP.md`.

## Files changed

- `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/vitest.config.ts`
- `packages/ui/src/styles/{tokens,theme,base,index}.css`
- `packages/ui/.storybook/` (`main.ts`, `preview.tsx`, `preview.css`, `manager.ts`, `vite-env.d.ts`, `blocks/*`, `docs/foundations/*`)
- `packages/ui/scripts/check-tokens.mjs`, `packages/ui/POSTEP.md`
- root `package.json` (scripts), `package-lock.json`, `.gitignore`, `.prettierignore`, `eslint.config.mjs` (ignore storybook-static)
- `.ai/lessons.md`
- Stage 2 batch 1: `packages/ui/components.json`, `src/lib/cn.ts`, `src/components/ui/*` (+ tests), `src/index.ts`, `src/styles/{tokens,theme,base}.css`, `scripts/check-tokens.mjs` (allow `-0`), `.storybook/{main.ts,preview.tsx,preview.css}`, `.storybook/blocks/{Matrix.tsx,tokens.ts}`, `.storybook/docs/primitives/*`

## Verification (commands run and results)

Stage 1:
- `npm run check:tokens`: no values outside the token system. A fixture with `bg-zinc-900 text-white p-[13px] p-4 text-sm rounded-lg shadow-md border-2 duration-150 md:flex`, `#fff`, `rgb(…)`, `oklch(…)` produced 13 findings and exit 1; `data-[state=open]:` was correctly not flagged.
- `npm run test:storybook`: 14 files, 54 tests passed (27 stories × dark and light). A temporary low-contrast story failed `color-contrast` in both themes (gate verified), then removed.
- `npm run build-storybook`: success. Built Storybook served locally and checked with agent-browser: all 7 Foundations docs pages in dark and light (screenshots), manager branding "Taskly", tab title "… ⋅ Taskly", no onboarding checklist, GFM tables render, Instrument Sans loads locally, column story at 320px has no horizontal scroll.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass. `npm test`: 88 tests, 100% coverage. `npm run build` (app): success.
- Not run: `npm run audit`, `npm run test:integration` (no app or DB change).

Stage 2, batch 1:
- `check:tokens` clean; `format:check`, `lint`, `typecheck` pass; `npm test`: 113 tests, 100% statements/branches/functions/lines.
- `test:storybook`: 134 passed (67 stories × 2 themes), a11y = error.
- `build-storybook` and app `npm run build` succeed. Built Storybook checked with agent-browser: the six Primitives docs pages (dark, plus light spot checks), state matrices in both themes, 320px stories without horizontal scroll, manager shows only "Taskly".
- Not run: `npm run audit`, `npm run test:integration` (no app or DB change).

Stage 2, batch 1 (2026-10-22):
- `check:tokens`, `format:check`, `lint`, `typecheck` pass; `npm test` 113 tests, 100% coverage; `test:storybook` 136 passed (68 stories × 2 themes); `build-storybook` and app `npm run build` (clean `.next`) succeed; `npm run audit` exit 0.
- Built Storybook checked with agent-browser: state matrices in both themes, docs pages with 13 sections and rendered tables, 320px without horizontal scroll.
- Not run: screen reader, iOS Safari, `test:integration`.

Stage 2, batch 2 (2026-10-22):
- `check:tokens`, `format:check`, `lint`, `typecheck` pass; `npm test` 124 tests, 100%; `test:storybook` 216 passed (108 stories × 2 themes); `build-storybook`, app `npm run build` (clean `.next`) and `npm run audit` succeed.
- Built Storybook checked with agent-browser: state matrices in both themes, six docs pages with 13 sections, five 320px stories without horizontal scroll; fixed a skeleton collapsing to zero width in the state matrix.
- Not run: screen reader, iOS Safari, `test:integration`.

Stage 2, batch 3 (2026-10-22):
- C1–C10 accepted by the owner except C7 (alert title in danger colour, message in primary text; title now required); Alert updated.
- Built ConfirmDialog, Menu, Popover, Tooltip, EmptyState, ErrorState with 6 docs pages and 40 stories; `color-scrim`, `overlay.ts`, `max-w-overlay` utility; `preview.tsx` mirrors the docs page theme into story iframes.
- `check:tokens`, `format:check`, `lint`, `typecheck` pass; `npm test` 134 tests, 100%; `test:storybook` 296 passed (148 stories × 2 themes); `build-storybook`, app `npm run build` (clean `.next`) and `npm run audit` (exit 0; 9 moderate in dev tools) succeed.
- Built Storybook checked with agent-browser: all 25 docs pages render (fixed a `{title}` MDX expression that broke Confirm dialog), overlays in both themes, 320px.
- Not run: screen reader, iOS Safari, `test:integration`.

Stage 3, batch 1: sign-in and app shell (2026-10-22):
- Engineering standards §5 point 3: P1 exception added.
- Built `useForm` (form pattern), AuthCard, SignInForm, SignUpForm, SignUpClosed, ThemeToggle, AppHeader, AppShell in `packages/ui/src/product/`; `"use client"` added to Input, PasswordInput, FormField.
- Storybook: 6 component pages, Patterns/Form, 2 screen pages with state maps; `fake-api.ts` simulates server answers.
- `check:tokens`, `format:check`, `lint`, `typecheck` pass; `npm test` 158 tests, 100%; `test:storybook` 396 passed; `build-storybook`, app `npm run build` (clean `.next`), `npm run audit` succeed; no new dependencies, no app code change.
- Built Storybook checked: new docs pages render, screens at 320/768/1440 in both themes, theme switch drives the preview theme.
- Not run: screen reader, iOS Safari, `test:integration`.

## Problems / open questions

- npm 11 skipped install scripts not covered by `allowScripts` (esbuild postinstall among them); Storybook and Vite builds still work. Not changed.
- Stage 1 proposals F1–F8: accepted.
- Batch 1 open points B1–B3 wait for the owner (see `packages/ui/POSTEP.md`).

- Batch 1: the shadcn CLI installed an unplanned npm package `cn` (from the `utils` alias); removed.
- Batch 1 proposals B1–B9 wait for the owner.

- Batch 2: the shadcn CLI added `cn` again; removed. Radix RadioGroup arrow-key tests needed a held key.
- Batch 2 proposals C1–C10 wait for the owner.

- Batch 3: `shadcn add alert-dialog` hung on an overwrite prompt for `button.tsx`; ConfirmDialog written on Radix directly. Story tests do not render MDX, so a broken docs page passed `test:storybook`.
- Batch 3 proposals D1–D10 decided by the owner: D2, D5–D10 accepted; D1 a separate token (value left to me); D3, D4 a helper reading tokens.
- D decisions implemented:
  - `color-surface-raised-hover` (dark `neutral-800` per the R02 menu hover step; light white, because `neutral-200` leaves danger text at 4.09:1);
  - `tokenPx` + `overlayPlacement()` (`sideOffset` = `space-inline`, `collisionPadding` = `space-page-gutter`); `max-w-overlay` simplified;
  - Color page: the new role, `color-scrim` and its opacity.
- Verification: gate green (139 unit tests at 100%, 296 story tests, builds, audit); at 320px the menu and tooltip keep 16px from both edges.
- Stage 2 is complete.

- Stage 3 batch 1: a story test caught focus arriving late after a server field error (`useEffect` after paint); fixed with `useLayoutEffect`.
- Stage 3 batch 1 proposals E1–E12 wait for the owner (E1: no bottom navigation in v1; E11: link from sign-up to sign-in?).

- Stage 3 batch 1: owner decisions 2026-10-22: E1 no bottom navigation in v1; E11 link "Sign in" on the sign-up page (done, `signInHref` required); E2–E10, E12 accepted.
- Stage 3 batch 2 (E01): owner chose row expansion variant 2 (collapsed row shows only the task; the arrow reveals description, subtasks and "Add subtask").
  - Built `src/product/tasks/` (EstimateRange, QuickAdd, TaskForm, TaskRow, TaskList, DeleteTaskDialog, shared `TaskText`), `useForm` `resetOnSuccess`, `ConfirmDialog` `onCloseAutoFocus`, token `motion-duration-highlight` + `row-highlight`.
  - Storybook: 6 component pages, 6 patterns (List, Details in row, Quick capture, Inline edit, Delete confirmation, Optimistic change), screens S5–S6 with a state map; server simulated in `.storybook/blocks/TaskScreen.tsx`.
  - Verification: format/lint/typecheck/tokens clean; 185 unit tests at 100%; 618 story tests; Storybook and app builds; audit gate passes (full `npm audit` lists new moderate/high advisories in dev tooling only; not changed). 14 docs pages and S5–S6 at 320/768/1440 in both themes checked in the built Storybook.
  - Fixed during verification: `{title}` in MDX prose broke two pages; arrow focus ring touched the title.
  - Found, not changed (rule 11): `formatPlnRange` in `packages/core` gives "1200,00 zł – 1500,00 zł", not "1 200–1 500 zł" (tokens rule 5). Reported as F11.
  - Proposals F1–F14 decided 2026-10-22: F7 alternative (the subtask form closes after each confirmed add; implemented, regression test added), F11 recorded as a note in the E01 spec, the rest accepted. 186 unit tests at 100%; task and pattern story tests (238) green.
- Stage 3 batch 3 (E02): no spec; questions G1–G6 (subtask reorder, drag on phones, where markers and places are set, place colours past ten, managing places) asked before building.
- Stage 3 batch 3 (E02): owner decided G1–G6 2026-10-22 (subtasks reorder within their task; no handle below 640px, long press or Move up/down instead; markers and "Places…" in "…"; first six place colours automatic, then a free colour; at most 10 places; Edit places with rename, recolour, delete).
  - Built DragHandle, Markers and SortableGroup (dnd-kit; `moveTarget`/`stepTarget`/`rowMove` send only `{afterId, beforeId}`); PlaceTag, PlaceColorPicker and PlacePicker in `src/product/places/`. TaskRow and TaskList gained ordering, markers and places. Added `PopoverAnchor` and the `swatch-selected` utility. Dependencies: only `@dnd-kit/core` and `@dnd-kit/sortable` (planned).
  - Storybook: 5 new 13-section component pages, Task row and Task list updated, Patterns/Reorder, screen S7 (11 stories) with a state map; `place-data.ts`, `PlacePickerDemo`, `OrderDemo`; `TaskScreen` simulates moves, markers and places with rollback.
  - Verification: format/lint/typecheck/tokens clean; 224 unit tests at 100%; 746 story tests; Storybook and app builds; audit gate exit 0. Built Storybook: 9 docs pages render; S7 at 320/768/1440 in both themes, no horizontal scroll.
  - Fixed during verification: `PopoverAnchor` outside `Popover`; a story ending mid drag swallowed Space in the next story; S7 data had a task place missing from the list's places; a hex literal in a Don't example.
  - Not run: screen reader, iOS Safari, a real long press on a device, `test:integration`.
  - Proposals H1–H10 wait for the owner (see `packages/ui/POSTEP.md`).
- Stage 3 batch 3: owner accepted H1–H10 2026-10-22; docs now say "decision H…".
- Stage 3 batch 4 (E03): no spec; questions I1–I4 (where the future expenses line goes, confirming the R09 cascade, what a completed row keeps, what "Add estimate" opens) asked before building.
- Stage 3 batch 4 (E03): owner accepted I1–I4 2026-10-22.
  - Built TaskCheckbox, SubtaskProgress, CompleteTaskDialog (`src/product/tasks/`), FutureExpenses and UnestimatedTasks (`src/product/expenses/`), `useMoveAnimation` (FLIP with `motion-duration-base`), ConfirmDialog `confirmVariant`. TaskRow/TaskList gained completion (I2, I3), focus kept on the checkbox after the row moves. No new dependencies.
  - Storybook: 5 new 13-section pages (new Product/Expenses folder), Task row, Task list and Confirm dialog updated, Patterns/Complete and reopen, screen S8 (12 stories) with a state map; `TaskScreen` simulates completion (R09 cascade, reopen to the front, open-then-completed display order), future expenses and adding an estimate, with rollback.
  - Verification: format/lint/typecheck/tokens clean; 249 unit tests at 100%; 882 story tests; Storybook and app builds; `npm run audit` exit 0. Full `npm audit` now also lists dev-only advisories (vitest 5.0.x moderate, `braces` via eslint-config-next high); not changed without approval. Built Storybook: 10 docs pages render; S8 at 1440 in both themes and 320, no horizontal scroll.
  - Fixed during verification: `{title}` in MDX prose broke three pages again; the total's `whitespace-nowrap` could overflow 320px; two story expectations were wrong.
  - Found: at 320px the checkbox column cuts the title width from 150 to 98px; asked as J1, not changed.
  - Not run: screen reader, iOS Safari, `test:integration`.
  - Proposals J1–J10 wait for the owner (see `packages/ui/POSTEP.md`).
- Stage 3 batch 4: owner chose J1 = C and accepted J2–J10 2026-10-22. The task title is now the row's disclosure button at every width (whole text block as target, ring around it); the arrow is decorative and shown from 640px only. Title width at 320px back to 150px. 250 unit tests at 100%, 882 story tests, lint and typecheck clean. Stage 3 done; stage 4 started.
- Stage 4 (2026-10-22, new session): the pages had been written in the previous session (Design system: Start here, Components, How to choose, Usage and accessibility, Content, What to avoid, What is missing, Contributing; Epics: Sign-in, E01, E02, E03; `.ai/docs/design-system.md` linked from AGENTS.md) but not verified or logged.
  - Verification: check:tokens, format:check, lint, typecheck clean; 250 unit tests at 100%; 894 story tests (447 × 2 themes); build-storybook succeeds; 119 `?path=` links resolve in the built `index.json`; 12 stage-4 docs pages render with GFM tables; 5 pages at 320/768/1440 in both themes without horizontal scroll.
  - Fixed: the Components page scrolled 1px sideways at 320px because the `AppHeader` preview sits in a 174px column; the preview now scrolls in its own focusable group (`role="region"` failed `landmark-banner-is-top-level`). Lesson recorded.
  - Not run: screen reader, app build (no app code changed), `test:integration`.
  - Proposals L1–L4 wait for the owner (see `packages/ui/POSTEP.md`).
- Stage 4 decisions (2026-10-23, new session): the owner accepted L1–L4.
  - L1: Contributing rules sourced "task, stage 4" and "decision L1". L2: date and time formats are a decision in Content and What is missing. L3: language from the browser on first visit, no switch in version 1 (What is missing, moved from open questions to app work). L4: new page `Design system/Epics/E04 Later` (`epics/E04Later.mdx`), added to `storySort` and linked from What is missing. Agent summary `.ai/docs/design-system.md` and the Start here source legend updated.
  - Verification: format:check, check:tokens, lint, typecheck clean; build-storybook succeeds; 122 `?path=` links resolve in `index.json`; the 4 changed pages render with GFM tables at 1440 and 320 px without horizontal scroll.
  - Not run: `npm test` and `test:storybook` (no component or story code changed; only the menu order in `preview.tsx`).
- Commit `439ba0a` (L1–L4) pushed to `origin/feat/design-system-foundations` on the owner's request (2026-10-23).
- Stage 5 (2026-10-23): verification and report.
  - Clean: typecheck, lint, format:check, check:tokens (one documented allow: `--breakpoint-wide`), `npm test` 250 at 100%, `test:storybook` 894 (a11y error, no rule disabled).
  - axe on all 72 MDX docs pages in both themes (built Storybook, axe-core injected): only landmark findings from the docs container and pages showing several full screens (proposal M2).
  - 48 screen stories × 320/768/1440 × 2 themes: no horizontal scroll, no error display, theme correct. Keyboard: list Tab order, row menu (Enter, arrows, Escape returns focus), delete dialog (focus trap, Escape returns focus). Portalled menu and dialog use the active theme's token. Reduced motion zeroes durations.
  - 40/40 component pages have 13 sections; 27/40 have a frozen state matrix story (proposal M1). Row title focus ring sits tight on the text (M3).
  - Failed: `npm run audit` (`next` 16.4.0 critical, separate approved upgrade; `@vitest/browser` moderate, M4).
  - Agent test prepared in POSTEP.md (quick shopping list, E04; M5), not run.
  - Not checked: screen reader, Firefox/Safari, touch devices, 200% text, forced colours, `test:integration`.
  - Repeated the `pkill -f` self-kill with `kill $(pgrep -f …)`; lesson extended.
- Stage 5 decisions (2026-10-23): the owner accepted M1–M5 as recommended.
  - M1: section 6 of 13 composite pages links to the state matrices of their parts; Contributing rule. M2: Usage and accessibility › Known exceptions. M3: row title focus layer widened by `space-inline` (`task-row.tsx`), regression play test in TaskRow › Collapsed (verified failing without the fix). M4: vitest bump deferred to `chore/vitest-audit` on command. M5: shopping list confirmed for the agent test.
  - Verification: format:check, check:tokens, lint, typecheck clean; `npm test` 250 at 100%; `test:storybook` 894; build-storybook succeeds; 164 links resolve; ring measured at 320 and 1440 px (touches but does not overlap the checkbox and "…" targets).
- Rebase on `main` (2026-10-23) after #29 (`next` 16.4.2) and #28 (`vitest` 5.0.5): six commits replayed without conflicts. `@vitest/browser` and `@vitest/browser-playwright` in `packages/ui` raised to `^5.0.5`; the rebased lockfile still held 5.0.4 entries whose exact `vitest` peer blocked `npm install` (ERESOLVE), so the stale `@vitest/browser*`, `@vitest/ui`, `@vitest/pretty-format` and `@vitest/utils` entries were dropped and re-resolved. Lockfile diff: only those five packages 5.0.4 → 5.0.5; `npm ci --dry-run` passes; `npm audit` no longer lists Vitest.

## Lessons recorded (links into .ai/lessons.md)

- 2026-10-21 Tailwind 4 token bridge (`@theme inline reference`).
- 2026-10-21 Storybook 10 options and per-theme Vitest projects.
- 2026-10-21 `pkill -f` kills the tool's own shell.
- 2026-10-21 Frozen hover/focus states by overriding Tailwind variants in Storybook CSS.
- 2026-10-21 jsdom accessible names drop spaces inside a span.
- 2026-10-22 shadcn CLI in a workspace package: aliases, unplanned `cn` package, scratch CSS target.
- 2026-10-22 Frozen states via `@custom-variant` overrides in Storybook CSS; zero spacing needs `--spacing-0`.
- 2026-10-22 Radix RadioGroup keyboard tests: hold the arrow key (`{ArrowRight>}`) and `waitFor` the selection.
- 2026-10-22 Radix Tooltip `aria-describedby` workaround (span trigger).
- 2026-10-22 dnd-kit sortable rows in stories and unit tests (drag left active leaks key listeners; destructure `useSortable`).
- 2026-10-22 shadcn CLI overwrite prompt hangs non-interactive runs.
- 2026-10-22 Portalled overlays in stories: a11y context `body`, iframe docs stories.
- 2026-10-22 MDX braces in prose; docs iframes need the theme mirrored; Radix menus close on window blur.
- 2026-10-22 Radix overlay numbers from tokens; minified CSS turns translucent colours into 8-digit hex.
- 2026-10-22 Focus after async validation needs `useLayoutEffect`; Storybook `useGlobals` only in the render function and not in Vitest; busy buttons block `userEvent.click`.
- 2026-10-22 Radix close autofocus runs on the next task; `autoFocus` in docs-page stories; regex names match "More actions for …".
- 2026-10-22 Narrow docs previews: own scroll box with `role="group"`, not `region` (banner landmark).
