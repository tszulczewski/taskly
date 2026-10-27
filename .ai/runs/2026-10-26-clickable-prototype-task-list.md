# Clickable prototype of E01 with sign-in (task-list-v1)

- **Date:** 2026-10-26
- **Spec:** `.ai/specs/2026-10-16-sign-in-pages.md`, `.ai/specs/2026-10-16-tasks-and-subtasks.md`; screen map `prototypes/konta-i-role/mapa-ekranow.md`
- **Outcome:** in progress (stage 1 of 3 done)

## Goal

Build a clickable prototype of the approved screen map (s01–s08) from the design system's components and tokens, in stages 0–3 with the owner's "dalej" between stages (prompt `lekcja-07/prompty/prompt-klikalny-prototyp.md`). Progress: `prototypes/task-list-v1/POSTEP.md`.

## Steps taken

- Stage 0: read the screen map, the grey prototype (revision 001), `.ai/docs/design-system.md`, the component props in `packages/ui/src`, the Storybook screen stories and `blocks/TaskScreen.tsx`, the review engine README, the Storybook `staticDirs` setup. Wrote the plan to `POSTEP.md`; nothing built.
- The owner asked what the review engine is; explained it is the lesson's ready-made engine in `lekcja-07/silnik-przegladu/` (no prior comments needed). Owner chose "dalej A" (with the engine).
- Stage 1: copied the engine into `prototypes/task-list-v1/silnik/`, rewrote `mostek.css` onto Taskly tokens, built the review page (all screens as permanent `section.screen`), the review bar, the demo store and the happy path s01 → s04 → add → s05/s07 → s06 → s08 → sign out, plus s02 → s04.3 and s03. Details and checks in `POSTEP.md`.
- Review comments (Markdown export pasted by the owner): sign-in card, fields, buttons and task rows too big. All sizes come from design-system tokens, so the owner chose a design-system change. Showed the numbers for 320/768/1440 first; approved V1 (K1 variant B: 36px controls and targets, 52px rows from 640px; phones unchanged) and V2 (sign-in card 400px); content column stays 980px.
- Implemented V1–V2 in `packages/ui` (tokens, theme, `AuthCard`, token list block), the Storybook docs and code comments that stated 44px/68px, `.ai/docs/design-system.md`, `packages/ui/POSTEP.md` (stage 9), and the 44px sentence in both specs (owner-approved).
- `test:storybook` failed TaskList › Loading (skeleton 57.7 vs 52px): asked the owner; approved one skeleton bar from 640px (`wide:hidden` on the second bar) and documented it in Skeleton.
- `check:tokens` flagged 73 values in the built prototype bundle under `.storybook/public`; made the script skip that folder.
- The owner's Storybook dev server on :6006 stopped during the run (not started by this session); measurements and the docs check ran against the static build served by `python3 -m http.server 6106`.
- Owner feedback after V1: (1) hovered first/last task rows have square 90° corners inside the rounded list; (2) field borders look harsh. (1) is a design-system bug: fixed in `TaskRow` (row tones follow the list's corners; no `overflow-hidden` on the list because a dragged row would be cut), regression test added, lesson recorded. (2) is a design decision (T1): measured `border-control` at 5.3–7.6:1 against a 3:1 requirement and asked the owner to choose a softer colour. Owner chose V3: one new raw `neutral-500` `#748079` for both themes (dark 4.08/4.48/3.49, light 4.11/3.72/3.44 on list/page/raised); implemented in `tokens.css`, `.ai/design/tokeny.md`, the V1–V3 legend, `packages/ui/POSTEP.md`.
- Owner: subtasks should stand out (tone or something else?). Recommended against a tone (tones already mean hover/open/editing/dragging) and proposed a lighter subtask title plus a guide line. Owner asked for a comparison: added `packages/ui/.storybook/docs/product/tasks/SubtaskHierarchy.stories.tsx` (Product/Tasks/Proposals/Subtask hierarchy), variants A today, B lighter title, C divider line, D B+C, E B + `border-control` line (added after the screenshots showed the divider line nearly invisible in dark). Variants restyle the real `TaskList` from outside with token utilities; `TaskRow` unchanged. First build showed no difference: classes built from template strings were never generated (lesson recorded).
- Owner chose "nothing" (A) for subtasks, recorded as V4; removed the temporary comparison story. Owner found the checkbox-and-handle version the most readable and asked for it in the prototype: wired `onMove`/`onToggleComplete` with the Storybook block helpers (`reorder`, `setCompleted`, `forDisplay`), outside the E01 map with the owner's consent.
- Owner: stage 2 also covers the drag and completion states. Planned new states s04.22–s04.29 (after the last map id, none renamed) and P06/P09 extended to moves and completion; listed in `prototypes/task-list-v1/POSTEP.md`, to be added to the map at the start of stage 2.

## Files changed

- `prototypes/task-list-v1/POSTEP.md` (new)
- `.ai/runs/2026-10-26-clickable-prototype-task-list.md` (new)
- `prototypes/task-list-v1/` (new: `index.html`, `vite.config.ts`, `tsconfig.json`, `silnik/`, `src/`, `evidence/stage1-*.png`)
- `.prettierignore` (the three engine files that must not be edited)
- Design system (V1–V2): `packages/ui/src/styles/tokens.css`, `theme.css`, `src/product/sign-in/auth-card.tsx`, `src/product/tasks/task-list.tsx` (skeleton), comments in `button.tsx`, `checkbox.tsx`, `radio-group.tsx`, `task-checkbox.tsx`, `drag-handle.tsx`, `task-row.tsx`; `.storybook/blocks/tokens.ts`; 22 Storybook docs pages; `scripts/check-tokens.mjs`; `packages/ui/POSTEP.md`
- `.ai/docs/design-system.md`, `.ai/specs/2026-10-16-sign-in-pages.md`, `.ai/specs/2026-10-16-tasks-and-subtasks.md`
- Corner fix: `packages/ui/src/product/tasks/task-row.tsx`, `tasks.test.tsx`, `packages/ui/POSTEP.md`, `.ai/lessons.md`
- V3: `packages/ui/src/styles/tokens.css`, `.ai/design/tokeny.md`, `.ai/docs/design-system.md`, `packages/ui/.storybook/docs/system/StartHere.mdx`, `packages/ui/POSTEP.md`
- Subtask comparison (proposal, removed after decision V4): `packages/ui/.storybook/docs/product/tasks/SubtaskHierarchy.stories.tsx`; screenshots `prototypes/task-list-v1/evidence/subtasks-*.png`
- Build output (git-ignored): `packages/ui/.storybook/public/prototypes/task-list/`

## Verification (commands run and results)

- V1–V2: `npm test` 254/254, coverage 100%; `npm run test:storybook` 900/900 (both themes, axe) after the skeleton fix (before it: 2 failed, TaskList › Loading); `npm run check:tokens` ok; `npm run typecheck` ok; `npm run lint` 0 errors (1 warning in `.agents/skills/…`, not touched); `npm run build-storybook` ok; `npm run format:check` fails only on files outside this change (`.agents/skills/…`, `lekcja-07/…`, the grey prototype's `index.html`). Prototype measured at 320/768/1440 (table in `POSTEP.md`). All 72 docs pages at 320px: no sideways scroll, no Storybook error screen (static build on :6106). `npm run build` (Next app) ok.
- Corner fix: `npm test` 255/255, coverage 100%; `npm run test:storybook` 900/900; `check:tokens`, `typecheck`, eslint and prettier on `src/product/tasks` ok. Prototype rebuilt; on :6006 the first row's top corners and the last row's bottom corners compute to 12px with the raised tone (open rows, zoomed screenshots); headless Chromium has no hover, so hover itself was not captured.
- V3: `check:tokens` ok; `test:storybook` 900/900; `build-storybook` ok; prettier on the changed docs ok. Prototype rebuilt; computed field border `rgb(116, 128, 121)` in both themes; screenshots `evidence/v3-s01-1440-{dark,light}.png`, `evidence/v3-s06-320-{dark,light}.png`.
- Subtask comparison: story tests 4/4 (both themes, axe); eslint, `tsc`, `check:tokens` ok; `build-storybook` ok; computed styles per variant checked (A 600/no line, B 400, C line, D line + 400). The owner's :6006 did not index the new story, so screenshots come from the static build on :6106.
- Checkbox and handle in the prototype: `tsc`, eslint, prettier, `vite build` ok; on :6006 at 1440 px: 4 handles and 4 checkboxes on s04, completing moves a task last, completing "Decorative wall" asks "Complete “Decorative wall” and its 5 open subtasks?", "Move up" and reopening reorder as expected; s05–s08 presets still open their row/form/dialog; 320 px in both themes: no sideways scroll, handle hidden (G2).
- Stage 1: `vite build` ok; `tsc -p prototypes/task-list-v1/tsconfig.json` ok; `eslint prototypes/task-list-v1` ok; `prettier --check prototypes/task-list-v1` ok. Browser walk with agent-browser 0.39.1 against Storybook on :6006 at 1440 and 320 px, dark and light: every happy-path step passed (list in `POSTEP.md`). Repo-wide `npm run lint`/`build` not run: no app or package code changed.
- Stage 0 is a plan only; nothing to verify yet. Checked that `vite` 8.3.5, `@tailwindcss/vite` and `agent-browser` exist in `node_modules`, that `@vitejs/plugin-react` does not, and that the root Vitest config only includes `packages/**`.

## Problems / open questions

- The prompt's materials say "review engine: none", but stage 1 asks to wire it up, and `lekcja-07/silnik-przegladu/` exists. Asked the owner; resolved: use the engine (A).
- The prompt's folder "prototypes/taks-list-v1/" read as a typo for `prototypes/task-list-v1/`.

## Lessons recorded (links into .ai/lessons.md)

- 2026-10-26: review engine + React (focus after remount, stable frame child, Radix menu opened by keydown, hash-only `open` does not reload).
