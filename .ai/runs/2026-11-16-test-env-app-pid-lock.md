# Fix: test env keeps its lock and leaves next-server running (#82)

- **Date:** 2026-11-16
- **Spec:** none (bug fix, issue #82)
- **Outcome:** success

## Goal

After `test-env-up.sh` returns, nothing may hold `.ai/qa/test-env.flock`, the descriptor's `app.pid` must be the node server, and `test-env-down.sh` must run at once and leave no `next-server`.

## Steps taken

1. Reproduced the root cause with a minimal script. `(cd /tmp && nohup sleep 30 9>&- &); echo $!` gives `sleep 30` under dash. Under bash it gives `bash script.sh`, a forked subshell that still holds fd 9. The existing tests run under `sh` (dash on Ubuntu), so they could not see it.
2. `test-env-up.sh`: `cd "$STANDALONE"`, background only the `nohup node server.js … 9>&- &` simple command, take `APP_PID=$!`, `cd "$ROOT"`. This removes the pid file round trip. `APP_PID` is now set right away, so the failure-cleanup trap and the health loop's `alive "$APP_PID"` both use node's pid.
3. `test-env.test.sh`: a curl double that returns the sign-in cookie, an `npx` double, and case 5. Case 5 runs a full bootstrap with a fake long-lived `server.js` that records its own pid, under both `sh` and `bash`. It checks that the bootstrap succeeds, that `app.pid` is the server, that the lock is free after up, that the next run reuses the environment, that teardown runs with a 1 s lock wait, and that the server is gone afterwards.

## Files changed

- `.ai/scripts/test-env-up.sh`: app start, history line
- `.ai/scripts/test-env.test.sh`: doubles, case 5
- `.ai/lessons.md`: two entries

## Verification (commands run and results)

- `npm run test:env-scripts` with the fix: all checks pass, including 12 new ones (6 under sh, 6 under bash).
- The same suite against `git show HEAD:.ai/scripts/test-env-up.sh`: 4 failures, all under bash. They are "app.pid is the node server", "the lock is free once bootstrap returns", "down runs at once" and "no server is left running".
- Real cold run (`bash .ai/scripts/test-env-up.sh`). The first attempt ran `npm ci` and the build, then failed at the seed step: tsx `listen EINVAL` on a pipe under the long cezar `TMPDIR`. This is unrelated, and the failure cleanup removed the container. The second attempt with `TMPDIR=/tmp` passed in 15 s (build cache hit). `app.pid` was `next-server`, the lock was free, and the server held no fd on the flock.
- Real warm run: `TEST_ENV_REUSED=1` in 0.6 s.
- Teardown with `TEST_ENV_LOCK_WAIT_SECONDS=5`: `stopped app pid …`, container removed, 1.3 s. Afterwards port 3300 was closed, no `next-server` was left, and no container was left.
- Gate (with `TMPDIR=/tmp`): `format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`, `build` and `audit` pass (audit reports 4 moderate findings and exits 0; no dependency changed). The first `npm test` run had 2 UI tests time out at 5 s under load (`task-list-screen`, `places`). Both files pass on their own, and the full rerun passes: 1245 tests, 100% coverage. The first `test:integration` run had 23 of 24 files pass. The 24th, `future-expenses-browser`, failed with "Port 3209 is already in use", most likely from another worktree's run. The port was free afterwards, and a rerun of that file passed 4/4.

## Problems / open questions

- The cezar agent `TMPDIR` is too long for tsx's IPC socket (recorded as a lesson). This is not a script bug.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-16: background a simple command, never a list; test shell scripts under sh and bash.
- 2026-11-16: under cezar, a long `TMPDIR` breaks tsx's IPC pipe.
