# Implementation tracker — sign-in pages

- **Spec:** `.ai/specs/implemented/2026-10-16-sign-in-pages.md` (issues #24 Phase A, #25 Phase B)
- **Run log:** `.ai/runs/2026-10-28-sign-in-pages-impl.md`
- **Branch:** `feat/sign-in-pages-phase-a` (phases 1–3); phase 4 on `feat/sign-in-pages-phase-b`, created from phase-a on 2026-10-29
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

Owner's manual test of phase 3 (2026-10-29):

- [x] 3.8 Bug: after sign up → sign out → sign in in the same tab, the signed-in user sees the header's sign-out button spinning forever; only a page reload clears it (corrected report). Root cause, fix (header and both forms), browser regression test without a reload between steps
- [x] 3.9 The `ALLOW_SIGN_UP` warning is logged twice (route handler and page renders load separate `auth.ts` instances); log it once per process, with a regression test

**Manual test:** `npm run build && npm run test:integration`; create the owner account following the Runbook.

## Phase 4 — Password reset, spec Phase B (spec steps 7B, 10)

- [x] 4.1 `setPassword` (atomic password change + session revocation) + integration tests with failure injection
- [x] 4.2 `runSetPassword` CLI, bootstrap entry, `auth:set-password` script, `tsx`, PTY smoke test
- [x] 4.3 Reset Runbook in `AGENTS.md`, full gate, lessons, move spec to `implemented/`

**Manual test:** reset the password of a disposable dev account with `npm run auth:set-password`.

## Handoff (2026-10-29)

- **State:** all phases done.
  - Phases 1–3 (spec Phase A, plus fixes 3.8 and 3.9) were accepted by the owner on `feat/sign-in-pages-phase-a`.
  - Phase 4 (spec Phase B) is committed on `feat/sign-in-pages-phase-b`, created from phase-a. Its full gate is green (448 unit tests with 100% coverage, 60 integration tests via `TEST_DATABASE_URL`).
  - The spec is in `implemented/`. Neither branch is pushed.
- **Next:**
  1. Owner's manual test of phase 4: reset a disposable dev account with `npm run auth:set-password`.
  2. With the owner's consent: push and open the Phase A PR (closes #24) and the Phase B PR on top of it (closes #25). Both are risk-high: they need a second-person review, `needs-qa`, and no self-QA.
- **Open owner decisions (non-blocking):**
  - component file naming: kebab-case, as in the repo, vs PascalCase in engineering-standards §2;
  - the dead API-contract row "400 password too short or long" in the spec;
  - the user name in the header, which needs a slot in the ui `AppHeader` (later);
  - the spec TLDR still says "proposes (not yet built)", which is requirement prose.
- **Local dev notes:**
  - Open the app at `http://localhost:3000`, the `BETTER_AUTH_URL`, not 127.0.0.1.
  - `next dev` does not read the root `.env`: `set -a; . ./.env; set +a; export ANTHROPIC_API_KEY=dummy`.
  - agent-browser in the sandbox needs `AGENT_BROWSER_SOCKET_DIR=/tmp/claude-1000/ab`.
  - Mutation checks go in a separate worktree, with `node_modules` linked at the root and in each `packages/*`.
