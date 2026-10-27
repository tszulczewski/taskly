# Clickable prototype of E01, stage 2: states, roles and scenarios (task-list-v1)

- **Date:** 2026-10-27
- **Spec:** `.ai/specs/2026-10-16-sign-in-pages.md`, `.ai/specs/2026-10-16-tasks-and-subtasks.md`; screen map `prototypes/konta-i-role/mapa-ekranow.md`
- **Outcome:** stages 2 and 3 done (the owner said "dalej" after stage 2); prototype complete

## Goal

Stage 2 of the clickable prototype (previous run: `.ai/runs/2026-10-26-clickable-prototype-task-list.md`; progress: `prototypes/task-list-v1/POSTEP.md`): every state of the map reachable by a click or a scenario control, demo accounts K1–K4 with switching, access gates, typed data kept after errors, plus the owner's extension s04.22–s04.29 (order and completion).

The owner pasted `lekcja-07/klikalny-prototyp-devmentor.txt` and pointed at `prototypes/konta-i-role/POSTEP.md`, which does not exist. Asked; the owner chose to continue `prototypes/task-list-v1` at stage 2 (the DevMentor prompt's rules 1–8 are the same as in the Taskly prompt `lekcja-07/prompty/prompt-klikalny-prototyp.md`).

## Steps taken

- Read `.ai/lessons.md`, the map, `POSTEP.md`, the previous run log, the prototype source, the design-system components used by s01–s08 and the Storybook blocks (`TaskScreen`, `fake-api`, `task-data`).
- Added s04.22–s04.29 to the map (new subsection in section 1; no existing id changed).
- Built the scenario controls P01–P12, account switching K1–K4, access gates, the "Go to state" guide for all 83 states, "Reload screen" (and Alt+Shift+R), the P12 card skeleton (DS03 gap) and the list's page/load phases. Details and decisions in `POSTEP.md`, "Etap 2".
- Bugs found in the browser walk and fixed: (1) the guide signed in after setting scenarios, and signing in resets P04, so s01.11 was unreachable from the guide; (2) the guide kept data deleted by earlier states (s06.8, s07.6), so later presets found no task; the guide now restores the account's demo list; (3) the s04.3 focus effect also fired when the last task was deleted, taking focus from the empty state (s08.7, O4); (4) at 320px the page scrolled sideways (ThemeToggle's `sr-only` labels escaped the scrolling review row; lesson recorded).

- Owner's answers (2026-10-27): 1 the map's text stays; 2 the two "at most" texts approved; 3 s04.21 shows "My renovation" for now; 4 gates stay as review cards; 5 account and "Go to state" moved into the folded panel. Implemented 3 and 5; the guide's live region stays mounted (hidden while empty) so new hints are announced.

- Stage 3 (owner: "dalej"): per-screen notes (stories, simulated, not decided), kept visible in presentation mode via `review.css`; `README.md` with run steps, demo accounts, scenarios and "Ograniczenia symulacji"; 13 navigation tests (`src/navigation.test.tsx`, own `vitest.config.mts`) on the whole review page with the real engine in jsdom, checked to fail on wrong expectations; browser sweep of every button and link on 14 screen states, every scenario value, keyboard-only walk, 8 screens × 320/1440 × light/dark. Final report in `POSTEP.md`.

## Files changed

- `prototypes/task-list-v1/src/`: new `scenarios.ts`, `states.ts`, `page-open.ts`, `screens/gate.tsx`, `screens/auth-skeleton.tsx`; changed `app.tsx`, `store.tsx`, `server.ts`, `review-bar.tsx`, `review.css`, `data.ts`, `screens/sign-in.tsx`, `screens/sign-up.tsx`, `screens/task-screen.tsx`
- `prototypes/task-list-v1/POSTEP.md`, `prototypes/task-list-v1/evidence/stage2-*.png`, `stage3-*.png`
- Stage 3: `prototypes/task-list-v1/README.md`, `vitest.config.mts`, `src/navigation.test.tsx`, `tsconfig.json`; `src/screens.ts`, `src/app.tsx`, `src/review.css` (notes)
- `prototypes/konta-i-role/mapa-ekranow.md` (s04 extension)
- `.ai/lessons.md`, this log
- Build output (git-ignored): `packages/ui/.storybook/public/prototypes/task-list/`
- No app, design-system or spec code changed.

## Verification (commands run and results)

- `npx tsc -p prototypes/task-list-v1/tsconfig.json --noEmit`: ok. `npx eslint prototypes/task-list-v1`: ok. `npx prettier --check prototypes/task-list-v1 prototypes/konta-i-role`: ok. `vite build --config prototypes/task-list-v1/vite.config.ts`: ok (chunk-size warning only).
- Storybook was not running (:6006 and :3000 refused), so the Storybook `public` folder was served with `python3 -m http.server 6107` (same path `/prototypes/task-list/index.html`). Browser walk with agent-browser 0.39.1 at 1440 (dark) and 320 (light): every state listed in `POSTEP.md` "Sprawdzone" behaved as the map says; no sideways scroll at 320 on all 8 screens; review bar reachable by keyboard.
- After the answers: `eslint`, `tsc`, `prettier`, `vite build` ok; review bar 288px at 320 (334px with a hint; was 377), 194px at 1440; no sideways scroll at 320 or 1440; s04.21 shows "My renovation" and recovers after P12 "fast" + "Try again".
- Stage 3: `npx vitest run --config prototypes/task-list-v1/vitest.config.mts` 13/13; mutant copy with 2 wrong assertions: 2 failed. `tsc`, `eslint`, `prettier --check`, `vite build` ok; `npm run lint` 0 errors (1 pre-existing warning in `.agents/skills/…`). Browser: every button/link on 14 states does something (only drag handles and the already-selected theme do nothing on a plain click; mouse drag checked), all scenario values, keyboard walk, 32 width/theme combinations without sideways scroll.
- Not checked: long press, a real P11 window, reduced motion, screen reader. Repo-wide `npm run build`/`test` not run: no package or app code changed (`npm run lint` ran in stage 3).

## Problems / open questions

- `prototypes/konta-i-role/POSTEP.md` did not exist; resolved with the owner (continue task-list-v1).
- Questions 1–5 answered by the owner on 2026-10-27 (`POSTEP.md`).

## Lessons recorded (links into .ai/lessons.md)

- 2026-10-27: `sr-only` inside an `overflow-x` row widens the page unless the row is positioned.
- 2026-10-23 entry extended: `ErrorState`'s `data-slot` is overwritten by `Alert`.
