# om-prepare-test-env — Taskly overrides

The entrypoint is `.ai/scripts/test-env-up.sh` (teardown `.ai/scripts/test-env-down.sh`, shared helpers `.ai/scripts/test-env-lib.sh`); the descriptor is `.ai/qa/test-env.json`. Run the script; do not boot the app by hand. After changing the scripts, run `npm run test:env-scripts` (command doubles, no Docker, ~4s; CI runs it in the lint job), then one real cold and one warm run.

## Working command chain (what the script does)

1. `npm ci` only when `package-lock.json` is newer than `node_modules/.package-lock.json`, then `npm run build`. Both are skipped when the build cache fingerprint matches. The fingerprint is content-based (`git hash-object` over the sources under `packages/` minus tests/stories, plus the root manifests and `tsconfig.base.json`), so deleted files and same-second edits count; it is stored in the descriptor and compared on reuse.
2. `docker run --rm postgres:16-alpine` on `127.0.0.1:55432` (or a free port). The container name is scoped to the checkout path. Readiness is checked with `pg_isready -h 127.0.0.1` over TCP: the init-time server listens on the socket only, so a socket check passes too early.
3. `npm run db:migrate` with the exported `DATABASE_URL`.
4. Seed one demo user with `createPasswordUser` through `npx tsx --conditions=react-server -e` (sign-up stays closed, and seeding spends no rate-limit attempt).
5. Copy `public/` and `.next/static` into the standalone dir, then start `node server.js` with `NODE_ENV=production HOSTNAME=127.0.0.1 PORT=3300` (3000 is dev/prod, 3200 is the integration tests).
6. Sign in once from `X-Forwarded-For: 198.51.100.254` and store the session cookie for the warm-run authenticated probe (`/api/auth/get-session`), so probes never spend sign-in rate-limit attempts.

## Gotchas

- Never read the real `ANTHROPIC_API_KEY` from `.env`. Set `TEST_ENV_ANTHROPIC_API_KEY` to exercise AI estimates; set `TEST_ENV_ALLOW_SIGN_UP=true` to open sign-up.
- Reuse expires after `TEST_ENV_CACHE_TTL_SECONDS` (default 600) or when a source file changes. A reboot gives you a fresh, empty database.
- Browser: the repo's own `node_modules/.bin/agent-browser` (0.39.1, the same one `test/helpers.ts` uses). The descriptor's pinned 0.35.2 download is not needed.
- Locking: the lock directory is created complete (with `owner.json`) and renamed into place, so it never exists without an owner. Failure cleanup removes only what that run created, and only while it holds the lock. The down script takes the same lock. A caller that times out waiting (`TEST_ENV_LOCK_WAIT_SECONDS`, default 300) changes nothing.
