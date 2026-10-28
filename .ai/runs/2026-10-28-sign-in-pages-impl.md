# Implement the sign-in pages spec

- **Date:** 2026-10-28
- **Spec:** .ai/specs/2026-10-16-sign-in-pages.md
- **Outcome:** in progress

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

## Files changed

- Phase 1: `packages/core/src/{env,auth,schemas,sign-up-hook}.ts` + tests, `.env.example`, `.ai/lessons.md`.

## Verification (commands run and results)

- Phase 1: `format:check`, `lint` (one existing warning in `.agents/skills/…/prepare-share-bundle.mjs`), `typecheck`, `npm test` (49 files, 292 tests, 100% coverage) all pass.

## Problems / open questions

- Before-hooks run before Better Auth's origin check. An invalid body from an untrusted origin gets 400 `INVALID_SIGN_UP_INPUT`; a valid one gets 403 `INVALID_ORIGIN`. Nothing is written in either case. The 1.2 subagent claimed the origin check came first; the curl run showed otherwise.
- The hook enforces 10–128 characters, so the API contract row "400 password too short or long" can no longer be reached over HTTP; such a request gets `INVALID_SIGN_UP_INPUT`. `authCall` still maps both codes. The spec is unchanged (not approved).
- The local `.env` has an empty `ANTHROPIC_API_KEY` (pre-existing), so auth fails with a ZodError until a value is set. `next dev` runs in `packages/app` and does not read the root `.env`; for the manual check it was sourced into the shell.
## Lessons recorded (links into .ai/lessons.md)
