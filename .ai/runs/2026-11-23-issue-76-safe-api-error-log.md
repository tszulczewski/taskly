# Issue #76: don't log raw DB errors from apiHandler (T-08)

- **Date:** 2026-11-23
- **Spec:** none (bug fix; threat model T-08 in `.ai/docs/security/threat-model.md`)
- **Outcome:** success

## Goal

Stop `apiHandler` from logging a whole unhandled error. An unmapped `DrizzleQueryError` (deadlock 40P01, serialization failure 40001, lost connection, an unmapped constraint) printed its message, which holds the SQL params (task titles, descriptions, user ids), and its `cause` into journald. Log only safe facts: the error class, the pg `code`, the method and the route path. `default-list.ts` follows the same pattern.

## Steps taken

1. `om-auto-fix-issue 76` driven by a cezar dispatch (run 79fd708a). Verified on `origin/main` f6d33e4: `packages/app/lib/api.ts:39` ran `console.error("Unhandled API error", error)`. No open or merged PR referenced #76 (only the threat-model PR #81).
2. Claimed #76 (claim comment + `in-progress` + assignee). The GitHub tracker descriptor has no atomic lock operations (`get-lock`/`acquire-lock`), so the claim used the comment fallback.
3. Root cause: `translateDbError` (`packages/core/src/tasks.ts`) maps only 23503/23505/23514, so any other DB error reaches `mapError` as a 500, and `logFailure` logged the error object.
4. Fix: a new `server-only` helper `describeError` (`packages/app/lib/log-error.ts`) returns the class name (`DrizzleQueryError` via `instanceof`, otherwise `constructor.name`) and an identifier-like `code` from the error or its `cause`, for example `DrizzleQueryError (code 40P01)`. It never returns the message, params, query or `cause`. Codes and class names must match `^[A-Za-z0-9_]{1,64}$`, so a hostile value cannot carry data. `apiHandler` logs `Unhandled API error: <METHOD> <path>: <describeError>`. `openDefaultList` logs `Could not open the default task list: <describeError>`.
5. Tests: a regression test in `api.test.ts` throws a real `DrizzleQueryError` whose params and pg cause hold a marker; the marker never reaches `console.error` and the response is the generic 500. `log-error.test.ts` covers code and class filtering. `default-list.test.ts` was updated. Run against the old `api.ts`, the regression and the two updated `api.test.ts` cases fail (3 failures); with the fix they pass.
6. Build check: the first version used `constructor.name` only. `npm run build` showed that the production server bundle is minified and turns `DrizzleQueryError` into `class e` (the name appears only in `.js.map` files), so the log would have read `e (code 40P01)`. `describeError` now matches `DrizzleQueryError` by `instanceof`. After a rebuild the chunk holds the literal `"DrizzleQueryError"` behind `instanceof t.l`, where `t` is module 71783, the same drizzle-orm errors module the query path throws from. That needed `drizzle-orm` as a runtime `dependency` of `@taskly/app` (same `^0.45.4` range as core/db; already in the bundle through core/db).
7. Threat model: T-08 row marked mitigated, with the control and the test named; the T-08 line in §3 Test scope moved from "to add" to "existing".

## Files changed

- `packages/app/lib/log-error.ts` (new), `packages/app/lib/log-error.test.ts` (new)
- `packages/app/lib/api.ts`, `packages/app/lib/api.test.ts`
- `packages/app/lib/default-list.ts`, `packages/app/lib/default-list.test.ts`
- `packages/app/package.json`, `package-lock.json` (`drizzle-orm` dependency)
- `.ai/docs/security/threat-model.md` (T-08 row, §3 test scope)
- `.ai/lessons.md` (extended the 2026-10-28 entry)

## Verification (commands run and results)

Local, after `npm ci` in the worktree, on the final code:

- `npm run format:check`: exit 0
- `npm run lint`: exit 0
- `npm run check:agents`: exit 0 (30 routed paths exist)
- `npm run test:env-scripts`: exit 0
- `npm run typecheck`: exit 0
- `npm test`: exit 0. 85 files, 1289 tests; coverage 100% statements (2184/2184), branches (1362/1362), functions (754/754), lines (1902/1902)
- `npm run build`: exit 0. The server chunk holds `instanceof t.l ? "DrizzleQueryError"`, where `t.l` is the drizzle-orm errors module's `DrizzleQueryError`
- `npm run audit`: exit 0 (4 moderate advisories, below the `high` threshold; none new from this change)
- `npm run test:integration`: the first run failed: 61 tests in the 11 browser files, all with Chrome "Socket path too long" under the cezar `TMPDIR` (lesson 2026-11-12; the 13 HTTP/DB files passed). The rerun with `TMPDIR=/tmp/t76` passed: 24 files, 303 tests, exit 0.
- Regression check: the new and updated `api.test.ts` cases fail against the `origin/main` `api.ts` (3 failed) and pass with the fix.

## Problems / open questions

- The tracker descriptor lacks atomic claim operations; the claim used comment + label + assignee only.

## Lessons recorded (links into .ai/lessons.md)

- Extended 2026-10-28 (`DrizzleQueryError` message holds SQL params): log caught errors only through `describeError`. `DrizzleQueryError` sets no `name`, and production minification renames classes, so match it with `instanceof`.
