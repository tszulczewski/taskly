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
- [x] 3.7 Runbook (client IP, Apache check, owner account) in `AGENTS.md`, full gate, lessons

Full-branch review (through `a6f03c2`): `.ai/runs/2026-10-28-sign-in-full-branch-review.md` — verdict approve, no findings, so no extra tasks.

**Manual test:** `npm run build && npm run test:integration`; create the owner account following the Runbook.

## Phase 4 — Password reset, spec Phase B (spec steps 7B, 10)

- [ ] 4.1 `setPassword` (atomic password change + session revocation) + integration tests with failure injection
- [ ] 4.2 `runSetPassword` CLI, bootstrap entry, `auth:set-password` script, `tsx`, PTY smoke test
- [ ] 4.3 Reset Runbook in `AGENTS.md`, full gate, lessons, move spec to `implemented/`

**Manual test:** reset the password of a disposable dev account with `npm run auth:set-password`.

## Handoff (2026-10-28, end of session)

- **State:** phases 1–3 (spec Phase A) done and committed on `feat/sign-in-pages-phase-a`, **not pushed**. Full gate green (398 unit tests, 100% coverage; 48 integration tests via `TEST_DATABASE_URL`, no Docker locally).
- **Next, in this order:**
  1. Owner's manual test of phase 3 (steps in the run log / last session).
  2. Push the branch and open the Phase A PR (risk-high: second-person review, `needs-qa`, no self-QA). The phases 1–2 review is in `.ai/runs/2026-10-28-sign-in-phases-1-2-review.md`; phase 3 code has not been reviewed yet.
  3. Phase 4 on its own branch on top of Phase A (`feat/sign-in-pages-phase-b`), task by task: one subagent and one commit per task, a manual-test stop at the end.
- **Open owner decisions (non-blocking):** component file naming (kebab-case as in the repo vs PascalCase in engineering-standards §2); the dead API-contract row "400 password too short or long" in the spec; the sign-up skeleton when sign-up is closed; keep or drop the "Reset a password" placeholder in the `AGENTS.md` Runbook until phase 4; user name in the header (needs a ui `AppHeader` slot, later).
- **Local dev notes:** `next dev` does not read the root `.env` and `ANTHROPIC_API_KEY` is empty there, so source the env and set a dummy key (`set -a; . ./.env; set +a; export ANTHROPIC_API_KEY=dummy`). The standalone server's process is `next-server`: kill it by PID. Do mutation checks in a separate worktree, never in the shared tree.
