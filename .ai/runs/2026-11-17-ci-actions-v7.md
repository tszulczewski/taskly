# CI: actions/checkout and actions/setup-node v4 → v7 (#87)

- **Date:** 2026-11-17
- **Spec:** none (issue #87, split out of #74)
- **Outcome:** success

## Goal

Raise `actions/checkout` and `actions/setup-node` in `.github/workflows/ci.yml` from `@v4` to `@v7` in all six jobs, with no other workflow change, after reading the v5–v7 release notes of both actions.

## Steps taken

1. Confirmed `origin/main` (86c08a9) still pins both actions at `@v4` (12 references, the only workflow file) and that no PR or commit addresses #87.
2. Read the GitHub release notes of `actions/checkout` v5.0.0, v6.0.0, v7.0.0, v7.0.1 and `actions/setup-node` v5.0.0, v6.0.0, v7.0.0, v7.1.0.
3. Replaced every `actions/checkout@v4` with `@v7` and every `actions/setup-node@v4` with `@v7`, keeping the floating-major style the file already used.

### Breaking changes read, and whether the workflow needed changes

| Action / version | Breaking change | Effect on `ci.yml` |
| --- | --- | --- |
| checkout v5, setup-node v5 | Action runtime moves to Node 24; needs runner ≥ 2.327.1 | None: GitHub-hosted `ubuntu-latest` runners are newer. The Node used by the jobs is still set by `NODE_VERSION: "24"`. |
| setup-node v5 | Automatic package-manager caching when `package.json` has `packageManager` | None: the repo has no `packageManager` field, and every job sets `cache: npm` explicitly. |
| setup-node v6 | Automatic caching limited to npm | None: the repo uses npm, and caching is explicit. |
| checkout v6 | Persisted credentials move to a separate file under `$RUNNER_TEMP` | None: no job runs authenticated git commands after checkout. `persist-credentials` keeps its default. |
| setup-node v7 | ESM migration; the dummy `NODE_AUTH_TOKEN` export is removed | None: CI never publishes to a registry or reads `NODE_AUTH_TOKEN`. |
| checkout v7 | Refuses to check out fork PR code under `pull_request_target` / `workflow_run` | None: the workflow runs on `pull_request` and `push` only. |
| checkout v7.0.1, setup-node v7.1.0 | Fixes and enhancements only (branch-name trimming, `mise.toml`, node-version validation, manifest fetch retry) | None. |

Conclusion: only the version tags change. Steps, `NODE_VERSION`, `cache: npm`, `permissions: contents: read` and the PostgreSQL image stay as they are.

## Files changed

- `.github/workflows/ci.yml`
- `.ai/runs/2026-11-17-ci-actions-v7.md`

## Verification (commands run and results)

Local, after `npm ci` in the worktree (`TMPDIR=/tmp`):

- ✅ `npm run format:check`, `lint`, `check:agents`, `test:env-scripts`, `typecheck`, `audit`
- ✅ `npm test`: 84 files, 1274 tests, coverage thresholds met
- ✅ `npm run build`
- Skipped locally: `npm run test:integration`. The change touches no application code, and the CI `integration` job runs it with the new actions.

The decisive check is the six CI jobs passing on the PR with the new action versions (a workflow change cannot be exercised locally).

## Problems / open questions

None.

## Lessons recorded (links into .ai/lessons.md)

None: a routine version bump with no surprises.
