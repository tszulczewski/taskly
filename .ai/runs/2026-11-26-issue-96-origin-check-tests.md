# Issue #96: integration tests exercise Better Auth's origin check (T-05)

- **Date:** 2026-11-26
- **Spec:** none (bug/coverage issue #96)
- **Outcome:** success

## Goal

Every app `startApp` launches ran with Vitest's inherited `TEST=true`, so Better Auth skipped its origin check (T-05's third CSRF layer), its secret validation and its production client-IP resolution. Clear `TEST` by default and pin the origin check with integration tests.

## Steps taken

1. Triage: confirmed on `main` (a9c0a7f, after #95) that `startApp` spreads `process.env` without clearing `TEST`; only `auth-http` opted out.
2. Read `better-auth/dist/api/middlewares/origin-check.mjs` (1.7.25): sign-in uses `formCsrfMiddleware`, which validates the origin when the request carries a cookie, an `Origin`/`Referer` or `Sec-Fetch-*` header; other POSTs use `originCheckMiddleware` (validates with a cookie).
3. `test/helpers.ts`: `TEST: ""` after `...process.env`, before `...env`; `authRequest` takes an optional `origin`.
4. `test/auth-http.integration.test.ts`: dropped the now-default `TEST: ""`; added cross-origin sign-in (403 `INVALID_ORIGIN`, no cookie, no session row; own origin → 200 + session) and cross-origin sign-out (403, session kept).
5. `test/sign-out-other-devices.integration.test.ts`: removed the stale comment saying the origin check never runs.
6. Threat model T-05 row and §3 integration-test row name the new tests; lessons entry updated.

## Files changed

- `test/helpers.ts`, `test/auth-http.integration.test.ts`, `test/sign-out-other-devices.integration.test.ts`
- `.ai/docs/security/threat-model.md`, `.ai/lessons.md`

## Verification (commands run and results)

- `npm run build`: passed.
- `npm run format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`, `test`, `audit`: all passed.
- `npm run test:integration`, run 1: failed. The `auth-http` app (port 3201) died during the 60 s rate-limit wait, so every later test there got ECONNREFUSED. `places-browser` also failed 4 tests with agent-browser viewport and covered-element refusals. Run alone, `auth-http` passed 14/14.
- `places-browser` alone, 7 runs: without `TEST` 1 pass and 2 failures; with the old `TEST=true` 3 passes and 1 failure. The failure is the same test both ways ("adds places from a row's Add places …": focus is not back on "Add places" after Escape). So it is an existing flake from #92, not caused by this change.
- `npm run test:integration`, run 2: 25 files, 317/317 passed.

## Problems / open questions

- `places-browser` "adds places from a row's Add places, on a task and a subtask, and gives focus back to it" is flaky with or without `TEST` (focus check after Escape). Not fixed here; worth its own issue.
- The `auth-http` app crashed once under full-suite load (no stderr captured). It did not happen again in 2 later runs.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-23 `TEST=true` entry updated: `startApp` clears it since #96; when the origin check fires.
