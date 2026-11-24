# Issue #78: HSTS and "sign out everywhere" (T-06)

- **Date:** 2026-11-23
- **Spec:** none (the issue asks for a short story first; the story is in the PR body for the owner's approval)
- **Outcome:** success (PR #98 opened, `Refs #78`; deployed-host checks left to the owner)

## Goal

Close threat T-06 as far as the repository can: HSTS on every HTTPS response (Apache, documented in the runbook), the production session cookie's `Secure; HttpOnly; SameSite=Lax` confirmed and recorded, and a signed-in "sign out everywhere" action that ends the user's other sessions, with integration tests. Run as `om-auto-fix-issue 78` from cezar task e6cae480 (parent 147a3813); in-chain review and QA skipped on the parent's order.

## Steps taken

1. Read AGENTS.md (root, core, app, ui, test), the design system summary, runbook, lessons, threat model and the issue. Open PRs #93/#94/#95 checked for overlapping files (runbook top, threat-model rows, lessons top, `test/auth-browser-open`, `test/browser-suite.ts`).
2. Verified in `node_modules/better-auth` (1.7.25, from the lockfile) that `POST /api/auth/revoke-other-sessions` exists and is already served by the catch-all route: authoritative DB read of the caller's session, deletes the user's other unexpired sessions, keeps the current one, answers `{ status: true }`. No `core` change needed; authorization stays in Better Auth as configured by `core`.
3. Root cause: the issue is a missing capability, not a defect: nothing in the UI called that endpoint, the runbook had no HSTS or cookie check, and no test pinned the cookie's flags.
4. UI (`packages/ui`): the header's "Sign out" ghost button became a menu trigger (same label and width, so the bar still fits 320px, decision E10) with "Sign out of this device" and "Sign out of other devices". Success of the second shows a `role="status"` notice under the bar; failure an `Alert`. A busy trigger opens no menu (controlled `open`). Stories (Playground, SignOutFailed, new SignedOutOtherDevices and SignOutOtherDevicesFailed, Polish text), AppShell/Menu/SignIn docs and the DS summary updated.
5. App (`packages/app`): `authCall` overload for `/api/auth/revoke-other-sessions`, `signOutOtherDevices()` (resolves false on failure; no cache clear, no navigation), wired in `AppShell` with the app's failure text.
6. Tests: unit (ui shell, app-shell, task-page mock); integration: new `test/sign-out-other-devices.integration.test.ts` (cookie flags on the production build, HTTP revoke keeps this session and other users', 401 without/with a signed-out session, two concurrent revokes, header flow, aborted request + retry); `auth-browser-open` clicks go through the menu; `useSignedInBrowserSuite` gained `newSession(slug)`.
7. Runbook: new section at the end (kept away from #94/#95's inserts) for Apache HSTS (`Header always set Strict-Transport-Security "max-age=31536000"` in the 443 vhost), the curl checks, the DevTools `Set-Cookie` check, and when to use "Sign out of other devices" vs the password reset. Threat model: T-06 row + one changelog line.

## Files changed

- `packages/ui/src/product/shell/app-header.tsx`, `shell.test.tsx`; `packages/ui/src/components/ui/menu.tsx` (doc comment)
- `packages/ui/.storybook/blocks/Catalog.tsx`, `docs/product/shell/AppShell.{stories.tsx,mdx}`, `docs/product/shell/Screens.stories.tsx`, `docs/product/tasks/Screens.stories.tsx`, `docs/primitives/Menu.mdx`, `docs/system/epics/SignIn.mdx`
- `packages/app/components/auth/use-sign-out.ts`, `components/shell/app-shell.{tsx,test.tsx}`, `components/tasks/task-page.test.tsx`, `lib/api-client.ts`
- `test/sign-out-other-devices.integration.test.ts` (new), `test/auth-browser-open.integration.test.ts`, `test/browser-suite.ts`
- `.ai/docs/runbook.md`, `.ai/docs/security/threat-model.md`, `.ai/docs/design-system.md`, `.ai/lessons.md`, this log

## Verification (commands run and results)

All from the worktree, on the final tree:

- `npm run format:check`: all files use Prettier code style.
- `npm run lint`: exit 0, no output.
- `npm run check:agents`: "30 routed paths exist; every AGENTS.md is routed and within budget".
- `npm run test:env-scripts`: "all test-env script checks passed".
- `npm run typecheck`: exit 0 (first run failed: `.storybook/blocks/Catalog.tsx` lacked the new required prop; fixed).
- `npm test`: 84 files, 1281 tests passed; coverage 100% statements/branches/functions/lines.
- `npm run build`: success.
- `npm run audit`: exit 0; 4 moderate advisories (esbuild via drizzle-kit, dev tooling), pre-existing, below the `high` threshold.
- `npm run check:tokens`: no values outside the token system. `npm run test:storybook`: 120 files, 944 tests passed. `npm run build-storybook`: completed.
- `TMPDIR=/tmp/t78 AGENT_BROWSER_SOCKET_DIR=/tmp/ab78 npm run test:integration` (alone): 25 files, 309 tests passed, exit 0. The new file alone first: 6/6.
- Manual: the built Storybook's Phone story at 320px, light theme, with the menu open and after "Sign out of other devices": the bar stays one row, `scrollWidth` 320 (screenshots in the cezar task's artifacts).

## Problems / open questions

- Deployed host (owner): HSTS header and the production `Set-Cookie` flags can only be confirmed there; the PR uses `Refs #78` and lists the checks. The runbook's step 4 waits for the date.
- Owner decisions: "Sign out" is now one menu choice away (two taps instead of one); no confirmation dialog before "Sign out of other devices"; the current session stays signed in.
- An integration app inherits Vitest's `TEST=true`, which makes Better Auth skip its origin check, so no cross-origin test was added for the new endpoint (T-05 territory; noted in #95's lessons).
- Expected trivial merge conflicts with #94 (T-07 row is next to T-06) and #93/#95 (threat-model changelog top, lessons index top).

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-23: Better Auth 1.7.25 already serves the session-revocation endpoints; `revoke-other-sessions` is not atomic (index only).
- 2026-11-23: a Radix DropdownMenu trigger opens on pointerdown/keydown, so `Button loading` does not stop it (index only).

## Resume 2026-11-24: review findings (CHANGES REQUESTED on 1f10a60)

Review: PR #98 comment 7119865370. Run by cezar task 89e494d0 via `om-auto-continue-pr`.

- Finding 1 (red Integration job): a row-menu flake in `future-expenses-browser`, not this diff. Re-run 45273068439 on 1f10a60 went green, every job included. Not fixed here (another task owns the row-menu flakes).
- Finding 2 (401 showed "Try again"): `useSignOutOtherDevices` (was `signOutOtherDevices`) treats a 401 as "this session already ended". It clears the Query cache and goes to `/sign-in`, as `QueryProvider` does for any 401 (sign-in spec, Edge cases, "Session expired while the tasks screen is open"). `AppHeader`'s `onSignOutOtherDevices` now resolves `"done" | "failed" | "sessionEnded"`. `sessionEnded` keeps the button busy until the page changes, as after `onSignOut`. Added unit tests (app and ui) and a browser integration test: another device signs this one out first, then "Sign out of other devices" lands on `/sign-in` with no alert.
- Finding 3 (success notice vs `design-system.md` "Success → nothing"): kept the rule and removed the notice and its `signedOutOtherDevices` text. The design-system rule is unchanged. Success shows nothing: the menu closes and the button is ready again. The browser tests now wait for the server-side effect (`expect.poll` on the other session's 401), then for the ready button.
- Nits: the Polish story strings are now "Wyloguj się na tym urządzeniu" / "Wyloguj się na innych urządzeniach", and the odd notice string is gone with the notice. The runbook HSTS step 1 says the certbot vhost is `…-le-ssl.conf` and that `certbot --hsts` may already have added the header (don't add a second one). The cookie test does `expect(header).toBeDefined()` before parsing.
- Lesson: the 401 handler covers only TanStack queries and mutations, so an `authCall` for a signed-in action needs its own 401 branch. "Success → nothing" also holds when the effect is on another device.

### Verification (final tree)

- `npm run format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`: exit 0.
- `npm test`: 84 files, 1284 tests; 100% statements (2193), branches (1351), functions (758), lines (1910).
- `npm run build`: exit 0. `npm run audit`: exit 0 (the same 4 moderate dev-tool advisories as before).
- `npm run check:tokens`: exit 0. `test:storybook`: 120 files, 944 tests. `build-storybook`: exit 0.
- `TMPDIR=/tmp AGENT_BROWSER_SOCKET_DIR=/tmp/ab89 npm run test:integration` (alone, after the sibling task's run freed the ports): 25 files, 310 tests passed, exit 0, 297 s.
- Not done: a manual check of the running app. The 401 path and the "nothing shown on success" path are covered by the new browser integration tests against the production build.

## Resume 2026-11-24: the re-review's optional nits (APPROVED on a64ae7e)

Re-review: PR #98 comment 7120910352. Run by cezar task 5a09c248 via `om-auto-continue-pr`. No behaviour change.

- Nit 1 (story wording): the PR-body story said "nothing is signed out" on failure. Better Auth's `revoke-other-sessions` deletes the other sessions one at a time without a transaction, so a timeout or a dropped connection can arrive after some or all of them have already ended. The story now says that some other devices may already be signed out, and it adds the 401 case (this device already signed out → cache cleared, `/sign-in`). The code comments (`use-sign-out.ts`, `app-header.tsx`) already said this correctly; the integration test "says so when the request fails, ends nothing" aborts the request before it reaches the server, so "ends nothing" is true there and stays.
- Nit 2: new `SessionEnded` story in `AppShell.stories.tsx` with a play test (busy after "Sign out of other devices", no alert, a click opens no menu). `AppShell.mdx` §6 points the "This session already ended" row at it (was "(app)"), and §7 names the test.
- First Storybook run failed: the play test clicked the busy button, and a busy `Button` has `pointer-events: none`. The story now focuses it and presses Enter (it stays focusable while busy), which is the input that could still open the menu.

### Verification (this resume)

- `npm run format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`, `check:tokens`: exit 0.
- `npm test`: 84 files, 1284 tests, exit 0 (100% coverage thresholds hold; no unit-tested code changed).
- `TMPDIR=/tmp npm run test:storybook`: 120 files, 946 tests (944 + `SessionEnded` in both themes), exit 0. `build-storybook`: exit 0.
- Not run: `build`, `audit`, `test:integration`. Only Storybook stories, Storybook docs and this log changed; no app code, dependency or route.
