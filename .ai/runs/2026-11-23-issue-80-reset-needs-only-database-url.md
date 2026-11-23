# Issue #80: the password reset needs only DATABASE_URL (T-10)

- **Date:** 2026-11-23
- **Spec:** none (security fix from threat model T-10; `.ai/specs/implemented/2026-10-16-sign-in-pages.md` defines the CLI)
- **Outcome:** success

## Goal

Fix #80: the offline password reset (`npm run auth:set-password`) copied `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `ANTHROPIC_API_KEY` to a dev machine because the CLI validated the full app env schema. Pick option (a) run on the VPS from the deployed artifact, or (b) a CLI that needs only the variables it uses. Update the runbook so it ends by deleting the copied env file, and cover the new env requirement in `test/auth-set-password.integration.test.ts`.

## Steps taken

1. Verified on `origin/main` (f6d33e4): `nodeDeps().validateEnv` called `getEnv()` (full schema), and `setPassword` used `getAuth()`, whose `createAuth` also calls `getEnv()`. A unit test literally asserted that an env file with only `DATABASE_URL` fails with "BETTER_AUTH_SECRET, BETTER_AUTH_URL, ANTHROPIC_API_KEY". No open PR or claim on #80.
2. Chose **option (b)**:
   - The deploy artifact is the Next standalone output (`packages/app/AGENTS.md`); it ships neither `packages/core/scripts/set-password.ts` nor `tsx` (a devDependency), and the repo has no deploy pipeline that could add a CLI bundle. Option (a) would need a new build step and a deployment-contract change, or `npm ci` of the whole workspace on the VPS, which the binding resource rules (1 GB RAM, no swap, build elsewhere and ship the artifact) rule out.
   - With (b) the copied file holds one line, a `DATABASE_URL` pointing at `127.0.0.1:5433`, which works only through the operator's SSH tunnel; the secrets that work from anywhere (`ANTHROPIC_API_KEY`) and the cookie secret stay on the VPS. Moving the URL from the command line into the file also keeps the database password out of shell history.
3. Better Auth 1.7.25 throws without a secret (except under `NODE_ENV=test`) and warns without a base URL. Added `getMaintenanceAuth()` in `core/src/auth.ts`: the app's database adapter (transactions on) and password settings, shared through `database()` and `PASSWORD_SIGN_IN` so the two instances hash and check alike; a per-process random secret (the instance serves no requests and issues no cookies or tokens); the logger disabled (the CLI owns its output; adapter logs can carry SQL parameters). `setPassword` uses it; `createPasswordUser` stays on `getAuth()`.
4. `core/src/env.ts`: `parseDatabaseEnv` validates `DATABASE_URL` and `DATABASE_POOL_MAX` only (picked from the full schema). The CLI's `validateEnv` uses it.
5. Tests: unit tests for `parseDatabaseEnv`, the maintenance instance (lazy, reads no app setting, shared settings, nothing request-related, fresh random secret), `setPassword` using the maintenance instance and not the app instance, and the CLI resetting with an env file holding only `DATABASE_URL` (regression), plus precedence of an exported `DATABASE_URL`. Integration: `auth-set-password` now starts the command in a clean shell whose env file holds only `DATABASE_URL`; the `password-admin` rollback tests spy on the maintenance instance's adapter.
6. Docs: runbook "Reset a password" (one-line env file, plain command, step 7 deletes the file), threat model T-10 row (mitigated, impact H → M, option (a) not chosen and why) and one changelog line, lessons index line.

## Files changed

- `packages/core/src/env.ts`, `env.test.ts`
- `packages/core/src/auth.ts`, `auth.test.ts`
- `packages/core/src/password-admin.ts`, `password-admin.test.ts`, `password-admin.integration.test.ts`
- `packages/core/src/cli/set-password.ts`, `set-password.test.ts`
- `test/auth-set-password.integration.test.ts`
- `.ai/docs/runbook.md` (Reset a password only), `.ai/docs/security/threat-model.md` (T-10 row, changelog), `.ai/lessons.md`, this log

## Verification (commands run and results)

All run from the worktree on 2026-11-23, after `npm run format`:

- `npm run format:check` — exit 0, "All matched files use Prettier code style!"
- `npm run lint` — exit 0
- `npm run check:agents` — exit 0, "30 routed paths exist; every AGENTS.md is routed and within budget"
- `npm run test:env-scripts` — exit 0, "all test-env script checks passed"
- `npm run typecheck` — exit 0
- `npm test` — exit 0, 84 files / 1281 tests passed, 100% coverage thresholds met
- `npm run build` — exit 0
- `npm run audit` (`npm audit --omit=dev --audit-level=high`) — exit 0; 4 moderate advisories reported, none high (unchanged by this PR: no dependency changes)
- `TMPDIR=/tmp npm run test:integration` (alone; ports 3200+ were free) — exit 0, 24 files / 303 tests passed in 250 s
- Manual check: not run against a running app; the end-to-end path (real PTY, real PostgreSQL, env file holding only `DATABASE_URL`, clean shell) is what `test/auth-set-password.integration.test.ts` exercises. No production system or real secret was touched.

## Problems / open questions

- First integration run: the two `password-admin` rollback tests failed because they spied on `getAuth().$context.internalAdapter`, which `setPassword` no longer uses. Fixed by spying on `getMaintenanceAuth()`.
- Threat model §3 (Test scope) still says "reset runbook keeps secrets on the VPS"; left untouched to avoid conflicts with open PRs editing that row (#95). With option (b) only the database URL leaves the VPS; worth rewording in a later docs pass.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-23 — Better Auth maintenance instance needs a secret; spy on the instance the code uses.
