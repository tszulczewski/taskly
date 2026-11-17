# PR #88: make the integration job green (agent-browser 0.43 typing)

- **Date:** 2026-11-17
- **Spec:** none (maintenance PR #88 for issue #74)
- **Outcome:** success (local gate green; CI result on the new head reported on the PR)

## Goal

Drive PR #88 (npm dependency update) to merge-ready with `om-auto-fix-pr`: merge the latest `main`, review, and fix the red `Integration` CI job.

## Steps taken

1. Claimed the PR, merged `main` (ae8004b, #86 places during quick add; no package changes, no conflicts), pushed 66c6c0f.
2. CI failed `Integration` on both heads (2e035e7, 66c6c0f) with the same five browser tests: the typed text came out scrambled ("Grey 30×60 tiles, …" → "×60 tiles, …03 yerG"; "Buy paint" → "uy paintB"). The fields were the quick-add description (just opened) and the subtask form (just opened). `main` with agent-browser 0.39.1 was green on the same Chrome for Testing 157.
3. Local runs passed, also with Chrome 157 (`AGENT_BROWSER_EXECUTABLE_PATH`), pinned to one CPU, and with 6× CDP CPU throttling.
4. Logged the field's events and value setters in the app: agent-browser (0.39.1 and 0.43) types with one `beforeinput`/`input` per character and no `keydown`; 0.43 starts about 14 ms after `focus` instead of about 77 ms.
5. Reproduced on a static page: a textarea that just mounted inside a container animating its height from 0 (`overflow: hidden`). With 0.43 `keyboard type`, every character goes to position 0. Without the animation the text is correct. React's `defaultValue` sync and being below the fold make no difference. 0.39.1 types the same page in order, and so do 0.43 `press` and `keyboard inserttext`. This is an agent-browser regression, not an app bug.
6. In the app, a temporary probe typed into the description while it opened. Raw `focus` + `keyboard type` scrambled 5 of 10 runs. The fixed `typeInto` was correct in 12 of 12. The probe was deleted.
7. Fix: `typeInto`/`retypeInto` (shared `typeAt` in `test/helpers.ts`) focus the field, wait until no finite animation runs, then type. `waitForAnimations` reuses the same `runningAnimations` reading. Corrected the `typeInto` comment ("real key events" was wrong).

## Files changed

- `test/helpers.ts` — `typeAt` (focus, wait for animations, type) behind `typeInto`/`retypeInto`; shared `runningAnimations`.
- `.ai/lessons.md` — 2026-11-17 lesson.
- `.ai/runs/2026-11-17-pr-88-integration-ci.md` — this log.

## Verification (commands run and results)

Node 24, WSL2, after merging `main`:

- `npm run format:check` 0 · `lint` 0 · `check:agents` 0 · `test:env-scripts` 0 · `typecheck` 0 · `npm test` 0 (84 files, 1274 tests, 100% coverage) · `build` 0 · `audit` 0 (4 moderate in dev tooling, as recorded in the dependency-update log).
- `npm run test:integration` (Chrome for Testing 157, `TMPDIR=/tmp/ab88`): before the fix 24 files / 303 tests passed (local runs never showed the race). With the fix: see the PR's run comment for the final result.

## Problems / open questions

- The bug should be reported upstream to agent-browser with the static reproduction (a textarea in a container with `animation: open 300ms` from `height: 0`, `overflow: hidden`, then `focus` + `keyboard type`).
- The PR's other `agent-browser` 0.43 workarounds (`act` retries, viewport centring) are unchanged.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-17 — agent-browser 0.43 `keyboard type` into a field still animating open.
