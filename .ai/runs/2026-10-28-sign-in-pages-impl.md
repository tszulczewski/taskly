# Implement the sign-in pages spec

- **Date:** 2026-10-28
- **Spec:** .ai/specs/2026-10-16-sign-in-pages.md
- **Outcome:** partial (spec Phase A done; Phase B pending)

## Goal

Implement the spec task by task (tracker: `track.md`), one subagent and one commit per task, stopping after each phase so the owner can test by hand.

## Steps taken

- Read the spec, `.ai/lessons.md` and the Better Auth lesson; checked the current code. The design system already has `SignInForm`, `SignUpForm`, `SignUpClosed`, `AuthCard`, `PasswordInput` and `AppHeader` in `packages/ui`, so the app components wrap them instead of running `shadcn init`.
- Split the spec into four phases (spec Phase A = phases 1–3, spec Phase B = phase 4) and created `track.md` on branch `feat/sign-in-pages-phase-a`.

- **1.1** (subagent, `9096eca`): `ALLOW_SIGN_UP` and the `auth.ts` settings. Option names were checked in Better Auth 1.7.7 (`@better-auth/core/dist/types/init-options.d.mts`). `.env.example` ships `ALLOW_SIGN_UP=false` and not an empty value, because `z.stringbool()` rejects `""` (lesson recorded).
- **1.2** (subagent, `d896c2a`): `signUpInput` / `signInInput` and the `hooks.before` middleware in `sign-up-hook.ts`. It tests through the real `betterAuth` router with the in-memory adapter.
- **Phase 1 manual check** (coordinator): `next dev` on port 3100, then curl with a trusted `Origin` and a unique `X-Forwarded-For`.
  - Closed: a valid body → 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`; whitespace-only name, 101-char name and 9-char password → 400 `INVALID_SIGN_UP_INPUT`.
  - Open: the user was created with the name trimmed, and the warning was logged once. The test user was deleted afterwards.

- **2.1** (subagent, `728601e`): `authCall` with overloads per path and `AUTH_MESSAGES`. Codes were checked in Better Auth 1.7.7; the account-exists code is `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (422). The lookup table is a `Map`, so a prototype key cannot match.
- **2.2** (subagent, `45840e0`): `getSessionUser(headers, { disableRefresh })` sends `query` only when the flag is true. `lib/session.ts` was added to the ESLint server-only ignores.
- **2.3** (subagent, `96b810d`): app wrappers around the design-system `SignInForm` and `SignUpForm`, `useSignOut`, `useTheme` and an app `AppShell`.
  - The spec's `SignOutButton`/`AppHeader` are covered by the ui `AppHeader` (button, busy state, failure alert, retry) through the app `AppShell`. No app `SignUpClosed` wrapper; the page uses the ui one.
  - Files are kebab-case, following the repo; engineering-standards §2 says PascalCase.
- **Owner decisions (2026-10-28):** no user name in the header for now, because the ui `AppHeader` has no slot for it. An inline script in `layout.tsx` applies the stored theme before first paint.
- **2.4** (subagent, `4eaaef6`):
  - Pages `(auth)/sign-in` and `(auth)/sign-up`: a static `AuthCard`, then `<Suspense>` around the `SignInGate`/`SignUpGate` (`redirectIfSignedIn`, `connection()`, `ALLOW_SIGN_UP`).
  - `/` is `<Suspense><SignedInShell>` with the placeholder.
  - `ThemeScript` in `<head>` with `suppressHydrationWarning`; `useTheme` applies the theme in `useLayoutEffect`.
  - The subagent's smoke test on the standalone build and in agent-browser passed: the redirects work and the flag is read per request.
- **Phase 2 check** (coordinator, `next dev`, sign-up open): `/` → 200 with a streamed `NEXT_REDIRECT;replace;/sign-in`; `/sign-in` shows "Create an account"; `/sign-up` shows the form.

- **3.1** (subagent, `4139404`): `createPasswordUser` in `password-admin.ts`. It validates, hashes before the transaction, and runs `createUser` + `linkAccount` inside `runWithTransaction`.
  - New direct dependency `@better-auth/core@1.7.7` (exact, matching better-auth's pin).
  - Negative control: with `transaction: false` the no-orphan integration test fails.
  - At this point 2 old tests in `test/app.integration.test.ts` were failing because of phases 1–2. I had skipped `test:integration` when closing phase 2 (lesson recorded).
- **3.2** (subagent, `c8bfce1`): `startApp` with a port and extra env (sign-up off by default), plus `createUser`, `authRequest` and cookie helpers. HTTP suites run with sign-up off (port 3201) and on (port 3202), and the old browser smoke now opens `/sign-in`.
  - Mutation check: without `disableRefresh` in `lib/session.ts`, the renewal regression fails at the full-HTML step.
  - I stopped my own leftover standalone server on port 3101. Its process is named `next-server` (lesson recorded).
- **3.3** (subagent, `642abbe`): agent-browser suites with sign-up open (port 3203) and closed (port 3204).
  - The sign-out abort and retry uses `network route … --abort` / `network unroute`.
  - Helpers wait for hydration before typing. Without that wait, keystrokes made before hydration were lost.
  - 48/48 integration tests passed on three full runs.
- **Parallel review:** another session is reviewing phases 1–2 (`.ai/runs/2026-10-28-sign-in-phases-1-2-review.md`, not part of this run). Its first finding is that `authCall` has no deadline. Owner decision (2026-10-28): wait for the review, fix its findings as extra phase-3 tasks, then do 3.4.

- **3.4** (subagent, `b530306`): `AUTH_TIMEOUT_MS = 15_000`. One `AbortController` covers the headers and the error-body read; a timeout gives `ApiError(0, "timeout")` with the generic message. `apiCall` is unchanged: it has no callers yet, and a fixed 15 s would be wrong for the future AI estimate call.
- **3.5** (subagent, `08d068b`): `AuthFormSkeleton` takes `variant: "sign-in" | "sign-up"`. Measured card height, fallback vs form, is equal at 320 px and 1280 px for sign-in with sign-up closed and for sign-up with sign-up open. Not covered: sign-in with sign-up open is 38 px taller; closed sign-up is about 289 px shorter.
- **3.6** (subagent, `e4bda31`):
  - The review's one-off failure in `session.test.ts` was the 3.2 subagent's mutation check on the shared tree, which removed `disableRefresh`. The Vitest 5 content cache from 18:30 proves it.
  - The `code.charCodeAt` crash is Vitest 5.0.5 hiding any `globalSetup` error. `global-setup.ts` now rethrows with the cause chain and a plain-string stack.
- **3.7** (subagent, `d7f152d`): client-IP note, Apache check and owner-account Runbook in `AGENTS.md`. Every test the spec requires for the Phase A PR is mapped to an existing test; no gaps.

## Files changed

- Phase 1: `packages/core/src/{env,auth,schemas,sign-up-hook}.ts` + tests, `.env.example`, `.ai/lessons.md`.
- Phase 2: `packages/app/lib/{api-client,session,form-errors}.ts`, `packages/app/components/{auth,shell}/*`, `packages/app/app/{layout,page}.tsx`, `packages/app/app/(auth)/*`, `eslint.config.mjs`, + tests.
- Phase 3: `packages/core/src/password-admin.ts` (+ unit/integration tests), `packages/core/package.json` (`@better-auth/core`), `test/helpers.ts`, `test/global-setup.ts`, `test/{app,auth-http,auth-signup-open,auth-browser-open,auth-browser-closed}.integration.test.ts`, `packages/app/lib/api-client.ts` (deadline), `packages/app/components/auth/auth-form-skeleton.tsx`, `AGENTS.md`.

## Verification (commands run and results)

- Phase 1: `format:check`, `lint` (one existing warning in `.agents/skills/…/prepare-share-bundle.mjs`), `typecheck`, `npm test` (49 files, 292 tests, 100% coverage) all pass.

- Phase 3 full gate (3.7):
  - `format:check`, `typecheck` and `build` pass; `lint` has the same single warning as before.
  - `npm test`: 60 files, 398 tests, 100% coverage.
  - `audit`: exit 0, with 4 moderate findings (esbuild under drizzle-kit).
  - `test:integration` against the local Postgres via `TEST_DATABASE_URL` (no Docker): 9 files, 48 tests.

## Problems / open questions

- Before-hooks run before Better Auth's origin check. An invalid body from an untrusted origin gets 400 `INVALID_SIGN_UP_INPUT`; a valid one gets 403 `INVALID_ORIGIN`. Nothing is written in either case. The 1.2 subagent claimed the origin check came first; the curl run showed otherwise.
- The hook enforces 10–128 characters, so the API contract row "400 password too short or long" can no longer be reached over HTTP; such a request gets `INVALID_SIGN_UP_INPUT`. `authCall` still maps both codes. The spec is unchanged (not approved).
- `next dev` only: the Strict Mode remount clears attributes on `<html>`, so the auth pages, which have no `useTheme`, can show dark for a light-theme user. Production is unaffected. Not fixed.
- In `next dev`, the streamed redirect payload on `/` includes a stack trace (`at requireSessionUser`). The standalone production build sends only the redirect, without a stack trace (checked by the coordinator).
- The local `.env` has an empty `ANTHROPIC_API_KEY` (pre-existing), so auth fails with a ZodError until a value is set. `next dev` runs in `packages/app` and does not read the root `.env`; for the manual check it was sourced into the shell.
## Lessons recorded (links into .ai/lessons.md)

## Session end (2026-10-28)

Stopped after phase 3 at the owner's request; work continues in a new session. Handoff: the "Handoff" section of `track.md`. Clean-up: the dev DB's leftover test users were deleted at the owner's request (`admin@neocraft.eu` and four `acc1792044412199-*` users from 2026-10-15), so the dev DB has no users.

## Session 2026-10-29

- Read the `track.md` handoff, this log, `.ai/lessons.md` and both review reports.
- The full-branch review (`.ai/runs/2026-10-28-sign-in-full-branch-review.md`, through `a6f03c2`) approves with no findings, so phase 3 gets no extra tasks. Since `a6f03c2`, only `track.md` and this log have changed, so the phase 3 gate result still applies to the same code.
- Stopped for the owner's manual test of phase 3.
- Owner's manual test, first finding: sign-up gave "Something went wrong". The page was opened at `http://127.0.0.1:3000`, the URL the standalone server prints, but `BETTER_AUTH_URL` is `http://localhost:3000`, so Better Auth rejected the origin (403 `INVALID_ORIGIN`, confirmed with curl: same request with the `localhost` origin got 401). This was an error in my test steps, not in the code. Also seen: the `ALLOW_SIGN_UP` warning is logged twice (the route handler and the page renders load separate `auth.ts` instances); fixing it is waiting on the owner.
- Owner's manual test, second finding: after sign up → sign out → sign in in the same tab, the sign-in button keeps spinning on `/sign-in` until the page is reloaded. The 3.3 browser tests always sign in after a fresh `browser.open`, so this path had no test. Added as task 3.8.
- Correction from the owner: the spinner is on the header's sign-out button after sign-in, not on the sign-in button. Forwarded to the 3.8 subagent with a hypothesis to verify: Next 16 keeps visited routes in `<Activity>` with their state, so the old `AppHeader` comes back still pending.
- Owner decision: fix the double `ALLOW_SIGN_UP` warning as task 3.9. It runs after 3.8, because two gates running at once in one tree would collide on `.next` and test ports.
- **3.8** (subagent): The hypothesis was confirmed on the production build. `cacheComponents` hides a page the user leaves in React `<Activity>` and shows the same instance on the next visit. The header's sign-out `pending` state survived from before sign-out (`aria-busy="true"` after the next sign-in). The finished sign-in and sign-up forms stayed "done" too, with the password still in their hidden inputs.
  - Fix: a `useLayoutEffect` cleanup (it runs on hide) in `packages/ui/src/lib/use-form.ts` resets a finished form to idle and empty, while unsent drafts are kept. The same in `app-header.tsx` resets `pending` and `failed`. The spec's replace + refresh flow is unchanged. A full page load via `window.location` was rejected.
  - Tests: +4 unit tests with a real `<Activity>` hide and show. +1 browser test: sign up, sign out, sign in, sign out and visit `/sign-up`, all in one tab with no reload. It uses its own `X-Forwarded-For` through the new `setForwardedFor` helper, so it spends nothing from the shared rate-limit bucket.
  - Mutation check in a separate worktree: without the fix, the browser test fails on "Sign out" not enabled; with only the header fixed, it fails on "Sign in" on the revisited `/sign-in`; with the full fix, 5/5 pass.
  - Gate: `format:check`, `typecheck` and `build` pass; `lint` passes with the known warning; `npm test` 60 files, 402 tests, 100% coverage; `test:integration` 9 files, 49 tests.
  - Lessons recorded: Activity state across auth transitions, and the `BETTER_AUTH_URL` origin in manual-test steps.
- Incident while recording the 3.8 lessons: my in-place Python edit truncated `.ai/lessons.md` before reading it, wiping the other session's two uncommitted lines. Restored from this session's saved copy, which matched the original blob hash `200e83e`; the other session's lines stay unstaged. Lesson recorded.
- **3.9** (subagent): Confirmed on the production build. `auth.ts` is bundled twice: once in `.next/server/chunks/` for the auth Route Handler, and once in `chunks/ssr/` for the pages. Each copy has its own Turbopack module cache, so each `getAuth()` instance logged the warning. Reproduced on the old build: 1 warning after `GET /`, 2 after `GET /api/auth/get-session`.
  - Fix: a `Symbol.for("taskly.auth.signUpWarned")` flag on `globalThis`, following the `globalForDb` idiom. The Better Auth instance stays per bundle: only the route handler serves rate-limited requests, and pages only read the session.
  - Tests: a unit regression test checks that two module instances warn once. A new integration test checks one warning in the server's stderr after a page render and an auth API call; `startApp` now collects stderr. The integration test was not run against an unfixed build; the old-build reproduction above shows the same two requests giving 2 warnings.
  - Mutation check in a separate worktree: without the fix, the new unit test fails (warn called 2 times).
  - Gate: `format:check`, `typecheck`, `build` and `audit` pass; `lint` has the known warning; `npm test` 60 files, 403 tests, 100% coverage; `test:integration` 9 files, 50 tests.
- Owner's manual test of phase 3 (after 3.8 and 3.9): everything works. Phase 3 is accepted.
- At the owner's request, the dev DB's registration data was deleted: 3 users (`admin@neocraft.eu`, `admin2@neocraft.eu` and a subagent's `repro-…@example.test`), with their sessions and accounts. The dev DB now has no users. Domain tables have no FK to `user` and were not touched.
- Phase 4 started on `feat/sign-in-pages-phase-b`, created from phase-a at `feba96f`. Neither branch is pushed.
- **4.1** (subagent): `setPassword(email, newPassword)` in `password-admin.ts`.
  - It parses `setPasswordInput`: the email is lowercased, and the password check is the shared `newPasswordField`, 10–128 characters, which `signUpInput` now uses too.
  - It hashes before the transaction. Inside `runWithTransaction` it runs `findUserByEmail`, `findCredentialAccount`, `updatePassword` and `deleteUserSessions`. The API was checked in Better Auth 1.7.7 (`@better-auth/core/dist/types/context.d.mts`, `better-auth/dist/db/internal-adapter.mjs`, `@better-auth/core/dist/context/transaction.mjs`, `@better-auth/drizzle-adapter/dist/index.mjs:559`).
  - My decision, since the spec is silent: a user with no credential account gets `NotFoundError("Credential account")` and nothing changes. `updatePassword` would otherwise change no row while sessions were still revoked and the command reported success. Better Auth's own reset endpoint would create the account instead. Today every account is email + password, so this only matters once Google login exists.
  - No row lock: the reset is an offline step with the service stopped (spec).
  - Tests: +6 unit tests, plus schema and barrel tests. +6 integration tests: the new password works, the old one fails, sessions are gone, unknown email, short password, no credential account, and rollback when the injected failure comes before or after both writes.
  - Negative control in a separate worktree: with the writes outside the transaction, 2 rollback tests fail; with `transaction: false`, 3 fail (the earlier `createPasswordUser` orphan test included).
  - Gate: `format:check`, `typecheck`, `build` and `audit` pass; `lint` has the known warning; `npm test` 60 files, 411 tests, 100% coverage; `test:integration` 9 files, 56 tests.
- Owner question about Google accounts: my recommendation is that the reset keeps refusing a user without a password account rather than creating one, since that would silently add a sign-in method. An explicit flag (e.g. `--add-password`) can be decided in the Google-login spec. The CLI got a distinct message for this case.
- **4.2** (subagent): `runSetPassword(argv, deps)` in `packages/core/src/cli/set-password.ts`, and `readHidden` (raw mode, Node built-ins only) in `cli/prompt-hidden.ts`.
  - Order: arguments → TTY check → `loadEnvFile` → `getEnv()` → two hidden prompts → `setPassword` → success line → DB pool closed in `finally`.
  - Exit codes: 0 on success, 2 for usage errors, 1 for every other failure. The two not-found cases are told apart by a new `NotFoundError.resource` and `SET_PASSWORD_NOT_FOUND`. Error output names settings but never shows values, the password, or raw DB errors.
  - Bootstrap: `packages/core/scripts/set-password.ts`, two lines, type-checked through `packages/core/tsconfig.json`, outside coverage. Root script `auth:set-password` = `tsx --conditions=react-server …`; `tsx` 4.23.15 is an exact root devDependency.
  - Spec vs reality: Node itself rejects a missing or unreadable `--env-file` (exit 9, `node: <path>: not found`) before our code runs. I reproduced this with a plain `node script.mjs --env-file /nonexistent`. The spec's requirement still holds (fails before prompting or writing, no values shown); only the message comes from Node. Our own check stays as a guard. The flag name is unchanged (spec).
  - Notes: the npm banner echoes the command line, with the email and the env-file path but never the password; a relative `--env-file` resolves against the repo root.
  - Tests: unit tests for every case in spec 7B bullet 3, including exported `DATABASE_URL` winning over the file. A PTY smoke test (`test/auth-set-password.integration.test.ts`) runs through `script -qec` in a clean `/bin/sh` environment, with a 0600 temp env file whose `DATABASE_URL` is unreachable, so the run only succeeds because the exported override wins. It covers success (no echo, prompt exit, sessions gone, old password 401, new 200), unknown email, piped stdin refused with nothing changed, and a missing env file.
  - Negative controls in a separate worktree: without the TTY check, success printed before commit, raw mode removed, or the pool not closed, each fails the expected tests.
  - Gate: `format:check`, `typecheck`, `build` and `audit` pass; `lint` has the known warning; `npm test` 62 files, 448 tests, 100% coverage; `test:integration` 10 files, 60 tests.
  - Manual rehearsal on a disposable dev user (deleted afterwards): exit 0 after 1.4 s, the password did not appear in the transcript, the old password 401, the new one 200.
- Owner decision (2026-10-29): no changes to the reset or to Google-account handling for now, since there is no Google sign-in. The current refusal for a user with no password account stays as built in 4.1–4.2, and nothing is recorded for the Google spec.
- **4.3** (subagent):
  - The reset Runbook in `AGENTS.md` replaces the placeholder. It adds what 4.2 learned: an absolute env-file path, Node's exit 9 for a bad path, piped input refused, an account without a password refused, npm echoing the command line, and that an already-exported variable (even an empty one) wins over the file. `auth:set-password` is now on the Commands line.
  - Every Phase B requirement is mapped to code or a test, and no gaps were found.
  - The spec was moved with `git mv` to `implemented/`, with Status set to implemented. Live references were updated in the tasks-and-subtasks spec and the Storybook docs (`StartHere.mdx`, `WhatIsMissing.mdx`, `epics/SignIn.mdx`); history files were left as they are.
  - Gate: `format:check`, `typecheck`, `build` and `audit` pass; `lint` has the known warning; `npm test` 62 files, 448 tests, 100% coverage; `test:integration` 10 files, 60 tests.
- Stopped for the owner's manual test of phase 4.
