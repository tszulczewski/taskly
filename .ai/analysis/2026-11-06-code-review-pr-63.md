# Code Review: PR #63

**Verdict: request changes.** Reviewed `a65040f1ae5dcae7e104796667128edf92051adf` against `main` in `/tmp/taskly-review-63`.

The launcher prepares a disposable PostgreSQL database and standalone app for QA. The previous cleanup-on-timeout, force-rebuild and fingerprint findings are resolved at this head; their committed regressions pass. The earlier test-coverage finding has regression coverage and documented author scope narrowing in the PR run log.

## Major

- **`.ai/scripts/test-env-lib.sh:44–48` — stale-lock recovery can displace a live owner's lock.** Two waiters can read the same dead PID. After the first reclaims the lock and a bootstrap acquires it, the second still calls `lock_break` with the dead PID. It renames the current live lock before checking ownership. A third caller can successfully acquire the now-empty lock path; the attempted restore then fails, and line 48 deletes the original live owner's directory. Two bootstraps now believe they hold the lock and can remove each other's database through the shared container name. A controlled interleaving of the actual `lock_break` helper reproduced this: snapshot owner 111, replacement owner 222, acquisition by owner 333 immediately after rename; only owner 333's lock remains. The competing acquisition was injected at the filesystem boundary, rather than observed in a production run. **Fix:** serialize stale-lock reclamation with acquisition/release (prefer an OS-backed lock whose ownership ends with the process); do not rename a potentially live lock as an ownership check. Add a deterministic regression with two stale observers, a newly acquired live lock and a competing acquisition, asserting that only one bootstrap enters resource cleanup.

## Validation Gate

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run format:check` | PASS | All matched files formatted |
| `npm run lint` | PASS | Exit 0 |
| `npm run check:agents` | PASS | 29 routed paths valid |
| `npm run test:env-scripts` | PASS | All committed launcher checks pass |
| `npm run typecheck` | PASS | All workspaces and test types |
| `npm test` | PASS | 100% statements, branches, functions and lines |
| `npm run build` | PASS | Production standalone build |
| `npm run audit` | PASS | Four moderate advisories; below configured failure threshold |
| `npm run test:integration` | PASS | 19 files, 199 tests |

Evidence: `/tmp/taskly-review63-results/retry-{0..8}.log` and `retry-results.txt`. Initial attempts with shared dependencies failed module resolution/build-root checks; the complete gate was rerun successfully with local dependency copies, including workspace-local dependencies. Initial failures are retained in the same directory, not attributed to PR code.

## Contracts and coverage

No application API, schema, authorization semantics, money representation or production deployment contract changed. The additive QA descriptor/scripts and `test:env-scripts` command are the new tooling surfaces. No product decision contradiction found. The changed code is shell tooling, so TypeScript coverage does not measure its concurrency behavior; the race above needs its own regression.

This is a local review report. No GitHub review, comment, labels, commits or pushes were made.

## Real lifecycle verification

Cold start passed in 28s, including dependency installation, production build, migrations, seed and authenticated probe. Warm start reused the same run in under one reported second. Teardown passed twice; recorded app PID is gone and this worktree's scoped database container was removed. Evidence: `/tmp/taskly-review63-results/{cold,warm,down,down2}.{out,log}`. This sequential lifecycle check does not cover the competing stale-lock reclamation described above.
