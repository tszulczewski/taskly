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
