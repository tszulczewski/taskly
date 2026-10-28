# Implementation tracker — sign-in pages

- **Spec:** `.ai/specs/2026-10-16-sign-in-pages.md` (issues #24 Phase A, #25 Phase B)
- **Run log:** `.ai/runs/2026-10-28-sign-in-pages-impl.md`
- **Branch:** `feat/sign-in-pages-phase-a` (Phase B gets its own branch on top)
- **Rule:** one subagent per task, one commit per task, manual test stop after each phase.

Legend: `[x]` done and committed, `[ ]` pending.

## Phase 1 — Auth configuration and server validation (spec steps 1–2)

- [x] 1.1 `ALLOW_SIGN_UP` env flag, `auth.ts` settings (disableSignUp, maxPasswordLength 128, 30-day sessions renewed after 1 day, adapter `transaction: true`, client IP from `x-forwarded-for` behind trusted proxies), one-time warning while sign-up is open
- [x] 1.2 `signUpInput` / `signInInput` schemas and the Better Auth `/sign-up/email` hook (400 `INVALID_SIGN_UP_INPUT`, trimmed name)

**Manual test:** curl against `npm run dev` — sign-up closed by default, open with `ALLOW_SIGN_UP=true`, invalid name rejected.

## Phase 2 — Pages in the browser (spec steps 3–6)

- [x] 2.1 `authCall` and the error-message table in `lib/api-client.ts`
- [x] 2.2 Session guard: `getSessionUser(headers, { disableRefresh })`, `lib/session.ts` (`requireSessionUser`, `redirectIfSignedIn`)
- [x] 2.3 App components: `SignInForm`, `SignUpForm`, `SignUpClosed`, `SignOutButton`, `AppHeader` (wired to `authCall`, router, Query cache)
- [ ] 2.4 Pages `/sign-in`, `/sign-up` (Suspense + `connection()`), protected placeholder `/`

**Manual test:** browser — `/` → `/sign-in`, sign up (flag on), sign out, sign in, closed sign-up (flag off), error messages.

## Phase 3 — Phase A integration tests and finish (spec steps 7A, 8, 9)

- [ ] 3.1 `createPasswordUser` in `password-admin.ts` + its integration tests
- [ ] 3.2 `test/helpers.ts` changes (env/port for `startApp`, `createUser`) + HTTP integration tests
- [ ] 3.3 agent-browser integration tests (sign up, sign out, aborted sign-out retry, sign in, closed sign-up)
- [ ] 3.4 Runbook (client IP, Apache check, owner account) in `AGENTS.md`, full gate, lessons

**Manual test:** `npm run build && npm run test:integration`; create the owner account following the Runbook.

## Phase 4 — Password reset, spec Phase B (spec steps 7B, 10)

- [ ] 4.1 `setPassword` (atomic password change + session revocation) + integration tests with failure injection
- [ ] 4.2 `runSetPassword` CLI, bootstrap entry, `auth:set-password` script, `tsx`, PTY smoke test
- [ ] 4.3 Reset Runbook in `AGENTS.md`, full gate, lessons, move spec to `implemented/`

**Manual test:** reset the password of a disposable dev account with `npm run auth:set-password`.
