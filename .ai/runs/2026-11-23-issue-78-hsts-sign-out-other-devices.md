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
