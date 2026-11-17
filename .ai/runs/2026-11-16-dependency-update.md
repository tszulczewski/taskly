# Update npm dependencies and check environment dependencies (#74)

- **Date:** 2026-11-16
- **Spec:** none (maintenance issue #74; no product spec needed)
- **Outcome:** success

## Goal

Update every workspace's direct dependencies and the lockfile's transitive dependencies to current stable releases (no prereleases), adapt code and config where needed, check Node.js/npm, GitHub Actions, PostgreSQL images and browser binaries, and pass the full gate. Protected contracts (`BACKWARD_COMPATIBILITY.md`) stay unchanged.

## Steps taken

1. Clean `npm ci` in the worktree, `npm outdated --workspaces --include-workspace-root`, `npm audit`, then `npm view <pkg> dist-tags.latest` for every direct dependency (registry checked 2026-11-16), plus peerDependencies/engines of every major candidate.
2. Raised the manifest ranges in groups (Next/React/eslint-config-next; Better Auth + `@better-auth/core`; Drizzle; Vitest/coverage/browser; Storybook; Tailwind; the rest). The first `npm install` stopped with ERESOLVE (the locked Vitest 5.0.5 family against the new `^5.1.0` ranges); `npm update --workspaces --include-workspace-root` moved the whole family together and refreshed transitive dependencies within range. No `--force` / `--legacy-peer-deps`.
3. Clean `npm ci` from the new lockfile: no ERESOLVE, `npm ls` reports no invalid/missing/extraneous packages, no engine mismatches against Node 24.21.0 / npm 11.19.0.
4. Read the release notes / package diffs of the majors that went in: `fractional-indexing` 4.0.0 (only changes keys when `digits` is passed explicitly; `positionBetween` calls `generateKeyBetween(a, b)`, so keys keep the `a0` form), `@anthropic-ai/sdk` 1.x (not imported yet; only a TODO in `packages/core/src/ai.ts`), TypeScript 6.0 (typecheck clean without config changes), jsdom 31 (needs Node ^24.15). Better Auth 1.7.8–1.7.25 notes: bug fixes only (session-refresh 415, cookie expiry on revoke); nothing changes the 1.7.7 behaviours recorded in lessons.
5. Gate. `test:integration` failed with agent-browser 0.43.0 (two browser tests, see Problems); bisected to a click check added in agent-browser 0.39.2–0.39.4 and fixed the tests' race instead of holding agent-browser back.

## Version table (current → target)

| Package | Workspace | Before | After | Note |
| --- | --- | --- | --- | --- |
| next | app | 16.4.2 | 16.4.6 | patch |
| react, react-dom | app, ui | 19.3.0 | 19.3.1 | patch |
| eslint-config-next | root | 16.4.2 | 16.4.6 | follows next |
| @tanstack/react-query | app | 5.104.2 | 5.107.1 | minor |
| tailwindcss, @tailwindcss/turbopack, @tailwindcss/vite | app, ui | 4.3.3 | 4.3.5 | patch |
| better-auth, @better-auth/core | core | 1.7.7 | 1.7.25 | patch; `@better-auth/core` stays pinned exact |
| drizzle-orm | core, db | 0.45.4 (range ^0.45.2) | 0.45.4 (range ^0.45.4) | already latest |
| drizzle-kit | db | 0.31.11 (range ^0.31) | 0.31.11 (range ^0.31.11) | already latest |
| @anthropic-ai/sdk | core | 0.133.0 | 1.8.0 | major, not imported yet |
| fractional-indexing | core | 3.4.0 | 4.0.0 | major, keys unchanged for our call |
| vitest, @vitest/coverage-v8, @vitest/browser, @vitest/browser-playwright | root, ui | 5.0.5 | 5.1.0 | minor |
| storybook, @storybook/* (4) | ui | 10.6.3 | 10.6.7 | patch |
| vite | ui | 8.3.5 | 8.3.8 | patch |
| playwright | ui | 1.64.1 | 1.65.1 | minor; CI installs the matching Chromium |
| lucide-react | ui | 1.61.0 | 1.73.0 | minor |
| typescript | root | 5.9.3 | 6.0.3 | major; 7.0.2 deferred (below) |
| jsdom | root | 30.1.2 | 31.0.1 | major; engines node ^24.15 |
| prettier | root | 3.9.10 | 3.10.1 | minor; no reformatting |
| agent-browser | root | 0.39.1 | 0.43.0 | 0.x minor; test fixes below |
| eslint | root | 9.39.5 | 9.39.5 | 10.15.0 deferred (below) |
| @types/node | root | 24.19.2 | 24.19.2 | kept on Node 24 line (below) |

Already latest, unchanged: zod 4.6.7, pg / @types/pg 8.23.1, server-only, testcontainers / @testcontainers/postgresql 12.2.1, @testing-library/react 16.3.3, tsx 4.23.15, @types/react(-dom) 19.3.0, @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, @fontsource/instrument-sans 5.3.0, class-variance-authority 0.7.1, clsx 2.1.1, radix-ui 1.8.1, tailwind-merge 3.7.0, remark-gfm 4.0.1.

### Deferred

- **eslint 10.15.0:** `eslint-config-next` 16.4.6 depends on `eslint-plugin-react` 7.37.5 (peer `eslint ^9.7`), `eslint-plugin-import` 2.32.0 and `eslint-plugin-jsx-a11y` 6.10.2 (peer `eslint ^9`); installing 10 needs `--legacy-peer-deps`. Next step: upgrade when those plugins (or `eslint-config-next`) accept ESLint 10.
- **typescript 7.0.2:** `typescript-eslint` 8.72.2 (latest, via `eslint-config-next`) declares `typescript >=4.8.4 <6.1.0`. 6.0.3 is the newest version inside that range. Next step: move to 7 when typescript-eslint supports it.
- **@types/node 26.x:** the runtime is Node 24 (CI `NODE_VERSION: "24"`); the types stay on the runtime's major (24.19.2 is the newest 24.x). Next step: bump together with a Node runtime upgrade.

## Audit

- `npm run audit` (`--omit=dev --audit-level=high`): exit 0, no high/critical. It lists 4 moderate: `esbuild <=0.24.2` (GHSA-67mh-4wv8-2f99, dev-server request reading) through `@esbuild-kit/esm-loader` in `drizzle-kit` 0.31.11 (latest); npm counts it because `better-auth` declares `drizzle-kit` as an optional peer. It is only a CLI used for migrations, never in the running app. The only "fix" npm offers is a downgrade to drizzle-kit 0.18.1.
- `npm audit` (all): 19 moderate, all in dev tooling, none fixable without a breaking downgrade:
  - `minimatch` 7–11.0.0 (GHSA-g3hv-75wg-m249) via `@typescript-eslint/*` 8.72.2 (latest, requires `minimatch ^10.2.2`) and `@joshwooding/vite-plugin-react-docgen-typescript` (Storybook react-vite 10.6.7, latest).
  - `glob` 9–14.0.1 (GHSA-3g3m-2fjr-6pw4) via `archiver-utils` → `archiver` → `testcontainers` 12.2.1 (latest) and the Storybook docgen plugin.
  - `esbuild` via `drizzle-kit` as above.
  Next step: these clear when upstream releases move to fixed `minimatch`/`glob`/`esbuild`; re-check on the next dependency update.
- Before the update `npm audit` reported the same 19 moderate.

## Environment dependencies

- **Node.js / npm:** local Node 24.21.0 / npm 11.19.0; CI `actions/setup-node` with `"24"` installs the newest 24.x. Every package's `engines` in the new tree accepts Node 24.21 (jsdom 31 needs ^24.15, agent-browser ≥22, vitest ^24, next ≥20.9). No change needed.
- **PostgreSQL:** `postgres:16-alpine` in `test/global-setup.ts` and `.ai/scripts/test-env-up.sh`. drizzle-orm 0.45.4 / pg 8.23.1 work with it (integration suite green). No package requires a newer server; a major PostgreSQL upgrade is out of scope without a migration plan. No issue needed.
- **Browser binaries:** Storybook tests use Playwright's Chromium; CI runs `playwright install --with-deps chromium`, which follows the `playwright` version (1.65.1). Integration tests use agent-browser's Chrome for Testing (`npx agent-browser install --with-deps` in CI). Locally both worked (`agent-browser doctor` 9 pass, 1 warn, 0 fail with a short `TMPDIR`). agent-browser 0.43 warns that the locally installed Chrome for Testing 155.0.8059.79 is behind stable 157.0.8103.78 (CVE fixes). CI downloads the current one on every run. The local copy (`~/.agent-browser`, shared by every checkout) was left alone while suites were running; the owner can refresh it with `npx agent-browser install`. No repository change needed.
- **GitHub Actions:** `actions/checkout@v4` and `actions/setup-node@v4`; latest are v7.0.1 / v7.1.0. Not required by any npm update, so it is a separate issue (see below).

## Files changed

- `package.json`, `packages/{app,core,db,ui}/package.json`, `package-lock.json` — the updates above.
- `test/helpers.ts` — `click`, `clickRole` and the `focus` step of `typeInto`/`retypeInto` retry (up to 15 s, every 100 ms) while agent-browser refuses the action as not actionable: no element, no name match, off-screen/hidden/disabled, covered. In each of these cases nothing was clicked, so a retry cannot click twice. When a CSS-selector action is refused as outside the viewport, the wrapper first centres the target (`scrollIntoView({ block: "center" })`).
- `test/completion-browser.integration.test.ts` — `toggle` waits for running animations before it clicks, and every call awaits it.
- `test/tasks-browser.integration.test.ts`, `test/subtasks-browser.integration.test.ts` — `listReady` waits for a loaded list, not just for no loading list.
- `test/subtasks-browser.integration.test.ts` — `fillSubtask` waits for running animations before it clicks the form's submit button.
- `.ai/lessons.md` — agent-browser viewport check lesson.
- `.ai/runs/2026-11-16-dependency-update.md` — this log.

## Verification (commands run and results)

Final tree, Node 24.21.0 / npm 11.19.0, WSL2:

- `npm ci` (clean, from the new lockfile): exit 0, no ERESOLVE, no peer workarounds; `npm ls` clean.
- `npm run format:check` 0 · `lint` 0 · `check:agents` 0 · `test:env-scripts` 0 · `typecheck` 0 (TypeScript 6.0.3).
- `npm test`: 76 files, 1095 tests passed; coverage 100% statements (1758/1758), branches (1135/1135), functions (597/597), lines (1550/1550).
- `npm run build`: exit 0 (Next.js 16.4.6, Turbopack).
- `npm run audit`: exit 0 (no high/critical in production; 4 moderate, see Audit).
- `npm run check:tokens` 0 · `npm run test:storybook`: 120 files, 928 tests passed (both themes, Playwright Chromium for 1.65.1) · `npm run build-storybook` 0 (only Vite's usual chunk-size notice).
- `npm run test:integration` (with `TMPDIR=/tmp/claude-1000/t AGENT_BROWSER_SOCKET_DIR=/tmp/claude-1000/ab`, lesson 2026-11-05): with the final test changes, 3 consecutive full runs of 20 files / 233 tests passed. Earlier runs on the way are under Problems.
- Standalone and running app: `startApp` (`test/helpers.ts`) boots the standalone server (`packages/app/.next/standalone/packages/app/server.js`, 127.0.0.1), so every integration run exercised the standalone build with sign-in/sign-out, sign-up closed, forbidden and not-found access, tasks and subtasks, estimates and PLN sums (future expenses), completion order and reordering. There was no separate manual walk-through by hand beyond these automated browser flows.
- After rebasing onto `main` 8c60736 (#75 spaces and reorder, #83/#84, #85; no package changes; conflicts only in `.ai/lessons.md` and one completion-test step that `main` had also fixed, so I kept its `dialogClosed()` and `waitForPuts(3)` and used the awaited `toggle`): `format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`, `build`, `audit` 0; `npm test` 84 files / 1245 tests, 100% coverage; `test:integration` 2 consecutive full runs of 24 files / 289 tests passed (includes the new reorder and places browser tests).
- Behaviour changes in the app: none found, so no new regression tests. The test changes fix races in the test harness.

## Problems / open questions

- **agent-browser 0.43.0 failed two browser tests**: `subtasks-browser` AC3 (`Element '… [data-slot="quick-add"] button[type="submit"]' is outside the viewport, so the click would not reach it`) and `completion-browser` AC8–AC12 (`toggle("A")` right after completion moved A to the bottom; the reopen never happened, `shown: B, C, A✓`). Each failed in both full runs with 0.43.0; the completion file passed 3/3 on its own; the full suite was 233/233 with 0.39.1 swapped back (`npm install --no-save`). The refusal string exists in the 0.39.4, 0.40.0, 0.41.2, 0.42.0 and 0.43.0 binaries but not in 0.39.1. The check runs after `scrollIntoViewIfNeeded`, and if the element's click point is still outside the viewport, agent-browser now refuses the click. Before, it clicked an off-screen point and missed silently (the "click on a moving row can miss" lesson of 2026-11-05). This is a race in the tests, not an app regression: they clicked rows that were still opening or moving. The first fix made those two places wait for running animations, as `expand` already does.
- **With those two fixed, other tests failed in their place**: `future-expenses-browser` (menu item "Edit" not found right after opening the menu), `tasks-browser` delete-refused ("More actions for “Fix the door”" not rendered yet), then `unestimated-browser` (the "2 tasks without an estimate" button not rendered yet). Probing a button added after 1.5 s showed that `find role … click` does not wait in either version (0.39.1 fails after 128 ms, 0.43.0 after 9 ms). So 0.43 is about 10× faster per command, and synchronous clicks sent right after a state change now beat React's render. These latent races are the ones the 2026-11-05 lesson describes ("CI passes only because its CLI calls are slower"). Fixing them one by one does not converge, so the browser wrapper now retries an action while agent-browser refuses it as not actionable, which is Playwright's auto-wait behaviour (`act` in `test/helpers.ts`).
- **With the retry, `subtasks-browser` AC3 and "drops the task … deleted in another tab" still failed in one of two full runs**: the subtask form's submit button stayed "outside the viewport" for the full 15 s. A temporary diagnostic (removed) showed a 1280×577 viewport (the same in 0.39.1), `scrollY` 158 of a possible 276, and the button's top at y=573.6, so 3.4 px of it was visible. agent-browser's CSS-selector click calls `scrollIntoViewIfNeeded`, which leaves a partly visible element where it is, and then refuses because the click point (its centre, y≈592) is off-screen. 0.39.1 dispatched that click anyway and it reached the button. Reproduced on a static page (button top 3 px above the bottom edge: `click '#b'` refused on every try; after `scrollIntoView({ block: "center" })` the click works). `find role … click` scrolls such an element itself (scrollY 0 → 33) and clicks, so only CSS-selector actions need the centring. This is an upstream agent-browser bug worth reporting; the wrapper works around it.
- **Then, 2 of 3 full runs were green; the third failed `tasks-browser` "keeps added tasks in order after a reload"**: right after `reload`, `listReady()` returned and `rows()` was `[]`. `listReady` waited for the quick-add field to hydrate and for "no `[data-slot="task-list"][aria-busy="true"]`". That selector never matched anything: `Surface` always sets `data-slot="surface"`, so the loading skeleton and the empty state never carry `task-list`; only the populated `<ul>` (through `asChild`) does. The wait was vacuous all along, and the slower CLI hid it. A first fix (wait for a non-busy `task-list`) timed out on every empty-list test, which is how this came to light. Both copies (`tasks-browser`, `subtasks-browser`) now wait for exactly one of `[data-slot="task-list"], [data-slot="empty-state"]` (the empty state is used only by the task list).
- The `@emnapi/core`/`@emnapi/runtime` 2.0.0-beta.2 prerelease in the lockfile is an exact pin of `@rolldown/binding-wasm32-wasi` 1.2.19 (Vite 8's bundler); it is an optional `wasm32` binding that never installs on x64/arm64. It cannot be avoided without overrides and is not a choice of ours.
- Cezar made an autosave commit (`0952865 cezar autosave (run finalize)`) of the work in progress at 11:41; later changes are on top of it, uncommitted.
- Linked issue for independent infrastructure: #87 (actions/checkout and actions/setup-node v4 → v7). No issue needed for Node.js, npm, PostgreSQL or browser binaries (see Environment dependencies).
- Follow-ups: report the partly-visible-element refusal upstream to agent-browser; on the next update, retry ESLint 10, TypeScript 7 and @types/node with a Node upgrade (see Deferred).

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-16 — agent-browser 0.43 speed, the viewport refusal of CSS-selector clicks, the `act` retry in `createBrowser`, and the vacuous `listReady` selector.
