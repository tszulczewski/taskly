# Generate the QA test-environment entrypoint

- **Date:** 2026-11-06
- **Spec:** none
- **Outcome:** success

## Goal

Run `om-prepare-test-env` for the first time: generate a repeatable up/down script pair for a disposable QA environment, with the descriptor that QA and integration-test skills attach to.

## Steps taken

- Discovery: root `package.json`, `.github/workflows/ci.yml`, `test/global-setup.ts`, `test/helpers.ts`, `packages/app/AGENTS.md`, `packages/core/src/auth.ts`, `.ai/browsers/agent-browser.md`. Mode: ephemeral (production standalone build plus a disposable `postgres:16-alpine`, the same setup as the integration tests).
- Wrote `.ai/scripts/test-env-up.sh` and `.ai/scripts/test-env-down.sh`: PID-checked lock that is handed to the app for its lifetime, reuse check (PID, container, shell/API/authenticated probes, TTL, source freshness), build cache, migrations, demo-user seed, descriptor and gitignored credentials file.
- Moved lock acquisition before teardown, so a concurrent bootstrap cannot remove a container another run is still starting.
- Browser provider: `node_modules/.bin/agent-browser doctor` passed (0.39.1).

## Files changed

- `.ai/scripts/test-env-up.sh`, `.ai/scripts/test-env-down.sh` (new)
- `.ai/skills/om-prepare-test-env/SKILL.md` (new; repo-local notes)
- `.gitattributes` (new; LF line endings for `*.sh`)
- `.gitignore` (QA working-state files: build cache, lock, app log)

## Verification (commands run and results)

- Cold run (`sh .ai/scripts/test-env-up.sh`): 12s including `next build`; healthy at http://127.0.0.1:3300.
- Warm run: 0.2s, same `runId`, `TEST_ENV_REUSED=1`.
- Touching `packages/core/src/password-admin.ts` made the next run reject reuse and rebuild (9s); the run after that reused again.
- Down twice: both runs exited 0 and left no container. The next up hit the build cache and booted in 5s.
- agent-browser signed in as the demo user and landed on `/` ("My renovation").
- Not run: the repo gate (lint, test, build). No application code changed.

## Problems / open questions

- `docker rm -f` exits 0 for a missing container, so the down script reported "removed" on its second run. Fixed with a `docker inspect` guard.

## Lessons recorded (links into .ai/lessons.md)

- None. The gotchas are in `.ai/skills/om-prepare-test-env/SKILL.md`.

## Follow-up: PR #63 review fixes (same day)

The author-account review requested changes. Findings 1–3 were confirmed in the code and fixed. Finding 4 (a full test suite) was narrowed to one regression test, as the user asked.

- Cleanup on failure now runs only while this run holds the lock, and removes only the container it created, so a lock timeout no longer deletes another bootstrap's database. The lock is created atomically with its owner, and the down script takes it too. The shared helpers moved to `.ai/scripts/test-env-lib.sh`.
- `--force-rebuild` now rejects reuse.
- Reuse and the build cache compare a content-based fingerprint (`git hash-object`) stored in the descriptor. This replaces `find -newer` and the size:mtime check.
- Added `.ai/scripts/test-env.test.sh`: 13 checks with command doubles, about 4s. Against the old scripts from `786fca5` it fails 5 checks, which cover exactly findings 1–3. Against the fixed scripts all 13 pass.
- Real runs: restart of the stale env 11.7s, warm reuse 0.2s, `--force-rebuild` rebuilt (9s), down twice left no container, cache-hit start 4.9s, then warm reuse.
- A mistake in the test along the way: `$(live_pid)` hung because the backgrounded `sleep` held the substitution pipe. Fixed by redirecting its output and returning the PID through a variable.
