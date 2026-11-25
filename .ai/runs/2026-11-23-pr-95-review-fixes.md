# PR #95 review fixes (issue #77 sign-in rate limit)

- **Date:** 2026-11-23
- **Spec:** none (issue #77; previous run `.ai/runs/2026-11-23-issue-77-sign-in-rate-limit.md`)
- **Outcome:** success

## Goal

Address the CHANGES REQUESTED review on PR #95 (head `f606781`, review comment 7106884771) via `om-auto-continue-pr 95`, dispatched by cezar run 147a3813: fix the fail2ban `failregex`, extend the `TEST=true` lesson, fix a stale test comment and the stale threat-model refs. The other integration apps keep inheriting `TEST=true`; the parent files that follow-up.

## Steps taken

1. Branch already contained `origin/main`; no merge needed.
2. fail2ban regex: reproduced the review with the real `fail2ban-regex` on 7 combined-log lines (401, 429, IPv6 401 → should match; 200, GET 401, a forged request inside the User-Agent, a non-auth 401 → should not). Ran it with Ubuntu 24.04's own package (`apt-get download fail2ban` → `fail2ban_1.0.2-3ubuntu0.1_all.deb`, extracted with `dpkg-deb -x`) and with upstream 1.1.0 source. Old regex: `7 lines, 0 ignored, 0 matched, 7 missed` on both. New regex `^<HOST> -[^"]*"POST /api/auth/\S+ HTTP/[^"]+" (?:401|429)\s`: `3 matched, 4 missed` on both, exactly the expected lines, inline and as a filter file loaded by name (`-c <dir> access.log taskly-auth`, as in the runbook's self-check).
3. Runbook: new regex, a note that fail2ban removes the timestamp first, and "at least one match" in the self-check (a real log can hold more than the one deliberate attempt).
4. Lessons: the `TEST=true` entry now names `isTest()`'s `skipOriginCheck` (`create-context.mjs:211`) and skipped `validateSecret` (`:41`), confirmed in the installed better-auth 1.7.25; new entry for the fail2ban timestamp trap and how to run the real tool without installing it.
5. `password-admin.integration.test.ts:124`: comment says 5 per 60 s.
6. Threat model: §1 entry-point row (stale "30 per 60 s", `auth.ts:28`), T-04 `auth.ts:23`, T-06 `auth.ts:51`, §3 moves "sign-in rate limit → 429" (T-03) to the existing tests; the #77 changelog line mentions it.

## Files changed

- `.ai/docs/runbook.md`
- `.ai/lessons.md`
- `.ai/docs/security/threat-model.md`
- `packages/core/src/password-admin.integration.test.ts` (comment only)
- `.ai/runs/2026-11-23-pr-95-review-fixes.md`

## Verification (commands run and results)

Local, `TMPDIR=/tmp`, on this change:

- `fail2ban-regex` 1.0.2 (Ubuntu deb) and 1.1.0 (upstream source): old regex 0/7 matched, new regex 3 matched / 4 missed as expected (step 2).
- `npm run format:check`, `lint`, `check:agents` (30 routed paths), `test:env-scripts`, `typecheck`, `build`: pass.
- `npm test`: 84 files, 1274 tests, 100% statements/branches/functions/lines.
- `npm run audit`: pass (4 pre-existing moderate advisories, below `high`).
- `npm run test:integration` (run alone): 24 files, 305 tests passed.

## Problems / open questions

- #93 rewrites §3's "Unit tests (to add)" row, the line right below the "to add" row this fix edits, so whichever PR merges second gets a trivial conflict there (as with the `lessons.md` index top and the changelog).
- The upstream fail2ban 1.0.2 tarball needs 2to3 and does not run on this machine's Python 3.12 (no `lib2to3`); Ubuntu's package was used for 1.0.2 instead.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-23: fail2ban strips the timestamp before `failregex`; test filters only with `fail2ban-regex` (index only).
- 2026-11-23: the `TEST=true` entry extended with the origin-check and secret-validation effects (index only).
