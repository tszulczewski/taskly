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
- [x] 2.4 Pages `/sign-in`, `/sign-up` (Suspense + `connection()`), protected placeholder `/`

**Manual test:** browser — `/` → `/sign-in`, sign up (flag on), sign out, sign in, closed sign-up (flag off), error messages.

## Phase 3 — Phase A integration tests, review fixes and finish (spec steps 7A, 8, 9)

Review of phases 1–2: `.ai/runs/2026-10-28-sign-in-phases-1-2-review.md` (request changes: 1 major, 1 minor).

- [x] 3.1 `createPasswordUser` in `password-admin.ts` + its integration tests
- [x] 3.2 `test/helpers.ts` changes (env/port for `startApp`, `createUser`) + HTTP integration tests
- [x] 3.3 agent-browser integration tests (sign up, sign out, aborted sign-out retry, sign in, closed sign-up)
- [x] 3.4 Review fix (major): `authCall` deadline covering headers and body; timeout → existing error state; hung response then retry; sign-out timeout keeps cache and route
- [x] 3.5 Review fix (minor): sign-up-specific form skeleton matching the open form's geometry (320 px and desktop)
- [x] 3.6 Review follow-up: find the cause of the one-off `npm test` failure (4 session-guard assertions) and of the default `test:integration` startup error (`code.charCodeAt is not a function`, Testcontainers path used by CI)
- [ ] 3.7 Runbook (client IP, Apache check, owner account) in `AGENTS.md`, full gate, lessons

**Manual test:** `npm run build && npm run test:integration`; create the owner account following the Runbook.

## Phase 4 — Password reset, spec Phase B (spec steps 7B, 10)

- [ ] 4.1 `setPassword` (atomic password change + session revocation) + integration tests with failure injection
- [ ] 4.2 `runSetPassword` CLI, bootstrap entry, `auth:set-password` script, `tsx`, PTY smoke test
- [ ] 4.3 Reset Runbook in `AGENTS.md`, full gate, lessons, move spec to `implemented/`

**Manual test:** reset the password of a disposable dev account with `npm run auth:set-password`.
