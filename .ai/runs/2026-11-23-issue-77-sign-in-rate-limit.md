# Issue #77: stricter sign-in rate limit (T-03)

- **Date:** 2026-11-23
- **Spec:** none (security issue #77, threat model T-03)
- **Outcome:** success (PR opened; owner decision on a per-account limit left open)

## Goal

Close #77: confirm the effective sign-in limit of the installed Better Auth from its source, add an explicit stricter sign-in rule (about 5 per minute per IP), prove 429 and recovery after the window with an integration test, and describe the operator side (XFF check, optional fail2ban) in the runbook. Run via `om-auto-fix-issue 77`, dispatched by cezar run 147a3813; in-chain review and QA skipped by order (the parent runs an independent review).

## Steps taken

1. Read AGENTS.md, `.ai/lessons.md`, issue #77, `packages/core/src/auth.ts`, `test/auth-http.integration.test.ts`, the runbook and the threat model. Branch `fix/issue-77-sign-in-rate-limit` from `origin/main` (f6d33e4); `npm ci`.
2. Confirmed from source (`node_modules/better-auth/dist/api/rate-limiter/index.mjs`, version 1.7.25 per `package-lock.json`; the issue said 1.7.7):
   - `resolveRateLimitConfig` starts from the global `window`/`max` (ours: 60 s / 30), then `getDefaultSpecialRules()` overrides it for `/sign-in*`, `/sign-up*`, `/change-password*`, `/change-email*` with **3 per 10 s**; plugin rules and then `customRules` override that.
   - Key: `<client ip>|<path>` (`createRateLimitKey`); memory storage by default (`create-context.mjs`: `storage: … || "memory"`), so per process and reset on restart.
   - The window restarts at each allowed request (`decideConsume` sets `lastRequest = now`), a refused request changes nothing, and `X-Retry-After = ceil(lastRequest + window - now)`.
   - So before this change the effective sign-in limit was 3 per 10 s per IP, at most about 18 per minute: weaker than the issue's 5 per minute. The global 30/60 s never applied to sign-in.
   - IP: `getIP` (`@better-auth/core/dist/utils/ip.mjs`) strips trusted proxies (127.0.0.1, ::1) from the right of `X-Forwarded-For`. Next 16.4.6 sets `x-forwarded-for ??= socket.remoteAddress` (`base-server.js:604`), so when Apache appends nothing the header is `127.0.0.1`, which is stripped; in production that gives `null`, every client lands in one `no-trusted-ip|<path>` bucket, and Better Auth logs "Rate limiting could not determine a client IP …" once per process.
3. `auth.ts`: `customRules: { "/sign-in/email": SIGN_IN_RATE_LIMIT }` with `{ window: 60, max: 5 }`; comment corrected (the global rule never covered sign-in).
4. Tests: unit (`auth.test.ts`) pins the whole `rateLimit` config; integration (`auth-http`) now expects the 6th wrong sign-in to get 429 with `X-Retry-After` above 10 s (so the custom rule, not the built-in one, applies), buckets by the appended address with 5 attempts, refuses even the right password while limited and accepts it after `X-Retry-After` (about 60 s wait), and checks the warning the runbook greps for when no client address is forwarded. `auth-browser-open` comment updated to the new numbers.
5. Runbook: journal check that the app sees client addresses, the sign-in limit and how a restart clears it, an optional fail2ban jail on Apache's 401/429 answers for `POST /api/auth/*` (regex checked against sample combined-log lines).
6. Threat model: T-03 row and one changelog line only (PRs #93/#94 edit T-07/T-08 and the changelog).

## Files changed

- `packages/core/src/auth.ts`, `packages/core/src/auth.test.ts`
- `test/auth-http.integration.test.ts`, `test/auth-browser-open.integration.test.ts` (comment)
- `.ai/docs/runbook.md`, `.ai/docs/security/threat-model.md` (T-03 row, changelog)
- `.ai/lessons.md`, this log

## Verification (commands run and results)

All with `TMPDIR=/tmp`, in this worktree, on the branch tip:

- `npm run format:check` — exit 0, "All matched files use Prettier code style!"
- `npm run lint` — exit 0
- `npm run check:agents` — exit 0, "30 routed paths exist; every AGENTS.md is routed and within budget"
- `npm run test:env-scripts` — exit 0, "all test-env script checks passed"
- `npm run typecheck` — exit 0 (re-run after the last test edit: exit 0)
- `npm test` — exit 0, 84 files, 1274 tests, coverage 100% (Statements 2172/2172)
- `npm run build` — exit 0
- `npm run audit` — exit 0 (4 moderate advisories in dev-only drizzle-kit → esbuild, below the `high` threshold; unchanged from main)
- `npm run test:integration` (alone, `AGENT_BROWSER_SOCKET_DIR=/tmp/ab77`) — first run: 23 files passed, 304 tests passed, **1 failed**: the new "logs that all clients share one bucket …" test, because the server inherited Vitest's `TEST=true` (lesson). Fixed by starting auth-http's app with `TEST=""`; re-ran `test/auth-http.integration.test.ts` alone: 12/12 passed (the window-recovery test waits about 60 s). The full suite was not re-run after that test-only change; the build was unchanged.
- Regression reasoning: on main's config the 4th wrong sign-in gets 429, so the new "6th … 429" test (5 × 401 first, `X-Retry-After` > 10) fails there.

## Problems / open questions

- **Per-account limit (owner decision):** not added. The issue's Done-when does not require it, and a per-account counter lets anyone lock the owner out from any address. Documented in T-03 and the PR.
- **Shared bucket when XFF is lost:** not solvable in the app (it cannot tell clients apart). Mitigated by the runbook's journal check after every deploy and fail2ban, which reads Apache's own client address. The stricter limit makes this failure mode more visible (5 per minute shared).
- The threat model's §3 "Integration tests (to add)" row still lists "sign-in rate limit → 429" for T-03; left as is to keep this PR's edit to the T-03 row (order), worth moving to the "existing" row in a later edit.
- Adding lines to `auth.ts` shifts the line refs `auth.ts:38` (T-04) and `auth.ts:42` (T-06) by 9 lines; left for the same reason.

## Lessons recorded (links into .ai/lessons.md)

- 2026-11-23: Better Auth's built-in sign-in rule overrides the global rate limit; only `customRules` replaces it (index only).
- 2026-11-23: Vitest's `TEST=true` reaches the app under test and changes Better Auth's no-address fallback (index only).
