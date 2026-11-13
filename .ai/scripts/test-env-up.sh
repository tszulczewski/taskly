#!/bin/sh
# om-prepare-test-env: generated entrypoint (contract v2)
# regenerate with: om-prepare-test-env --regenerate
# history:
#   2026-11-06 generated: production standalone build + disposable postgres:16-alpine + demo user (cold 12s, warm 0.2s reused, cache-hit boot 5s)
#   2026-11-06 repair (PR #63 review): failure cleanup removes only what this run created and only under the lock
#     (a lock timeout no longer deletes another bootstrap's database); --force-rebuild rejects reuse;
#     reuse and build cache compare a content-based fingerprint (deletions and same-second edits count)
#   2026-11-06 repair (PR #63 second review): flock(2) lock held for the bootstrap only (app and
#     agent-browser daemon start with 9>&-); a run that waited re-checks reuse before rebuilding
#   2026-11-13 repair: retry the postgres publish on a fresh port (WSL2: Windows-reserved port ranges)
set -eu

# ---------------------------------------------------------------------------
# Project-specific facts (discovered once; tweak here, not in the logic below)
# Shared facts (container scope, build inputs, lock) live in test-env-lib.sh.
# ---------------------------------------------------------------------------
APP_PORT_PREFERRED=3300            # 3000 = dev/prod, 3200 = integration tests
PG_PORT_PREFERRED=55432
PG_PORT_ATTEMPTS=5                 # retries on a fresh port when Docker rejects the publish
PG_IMAGE=postgres:16-alpine        # the image test/global-setup.ts uses
PG_USER=taskly
PG_DB=taskly
HEALTH_PATH=/sign-in               # prerendered shell; answers without the database
DEMO_NAME="QA Demo"
DEMO_EMAIL=qa-demo@taskly.test
PROBE_IP=198.51.100.254            # own rate-limit bucket for the probe sign-in
APP_DIR=packages/app
STANDALONE=$APP_DIR/.next/standalone/packages/app
ARTIFACTS="$STANDALONE/server.js $APP_DIR/.next/static"
TTL=${TEST_ENV_CACHE_TTL_SECONDS:-600}
APP_WAIT_SECONDS=60

# ---------------------------------------------------------------------------
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
. "$ROOT/.ai/scripts/test-env-lib.sh"
ENV_FILE=$QA_DIR/test-env.env
BUILD_CACHE=$QA_DIR/test-env-build-cache.json
APP_LOG=$QA_DIR/test-env-app.log
mkdir -p "$QA_DIR"

FORCE=0
FORCE_REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --force-rebuild) FORCE_REBUILD=1 ;;
    *) echo "unknown flag: $arg (known: --force, --force-rebuild)" >&2; exit 2 ;;
  esac
done

T0=$(date +%s)

free_port() {
  node -e 's=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})'
}
port_free() {
  node -e 's=require("net").createServer();s.once("error",()=>process.exit(1));s.listen(+process.argv[1],"127.0.0.1",()=>s.close())' "$1"
}
pick_port() { if port_free "$1"; then echo "$1"; else free_port; fi; }

# Only what this invocation created, and only while it holds the lock: a caller that never got
# the lock (timeout, bad flag) must not touch a database another bootstrap is still preparing.
APP_PID=
CREATED_PG=0
cleanup_on_failure() {
  status=$?
  if [ "$status" != 0 ] && [ "$LOCK_MINE" = 1 ]; then
    log "bootstrap failed (exit $status); app log: $APP_LOG"
    stop_pid "$APP_PID"
    if [ "$CREATED_PG" = 1 ]; then docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true; fi
    release_lock
  fi
}
trap cleanup_on_failure EXIT

print_result() { # reused
  printf 'TEST_ENV_STATUS=running\nTEST_ENV_BASE_URL=%s\nTEST_ENV_DESCRIPTOR=%s\nTEST_ENV_REUSED=%s\n' \
    "$(json_get "$DESCRIPTOR" baseUrl)" "$DESCRIPTOR" "$1"
  printf 'BROWSER_PROVIDER=%s\nBROWSER_INSTALLED=%s\n' \
    "$(json_get "$DESCRIPTOR" browser.provider)" \
    "$([ "$(json_get "$DESCRIPTOR" browser.installed)" = true ] && echo 1 || echo 0)"
  log "done in $(( $(date +%s) - T0 ))s"
}

# --- reuse check --------------------------------------------------------------
reuse_ok() {
  [ "$FORCE" = 1 ] && { log "--force: not reusing"; return 1; }
  [ "$FORCE_REBUILD" = 1 ] && { log "--force-rebuild: not reusing"; return 1; }
  [ "$(json_get "$DESCRIPTOR" status)" = running ] || return 1
  pid=$(json_get "$DESCRIPTOR" app.pid)
  alive "$pid" || { log "recorded app pid ${pid:-?} is gone"; return 1; }
  docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null | grep -q true \
    || { log "database container is gone"; return 1; }
  url=$(json_get "$DESCRIPTOR" baseUrl)
  curl -fsS -o /dev/null --max-time 5 "$url$HEALTH_PATH" || { log "app shell probe failed"; return 1; }
  curl -fsS -o /dev/null --max-time 5 -H "origin: $url" "$url/api/auth/ok" \
    || { log "unauthenticated API probe failed"; return 1; }
  # Authenticated round trip: the session lookup reads the database.
  probe_cookie=$(sed -n 's/^TEST_ENV_PROBE_COOKIE=//p' "$ENV_FILE" 2>/dev/null)
  curl -fsS --max-time 5 -H "origin: $url" -H "cookie: $probe_cookie" "$url/api/auth/get-session" \
    | grep -q "\"email\":\"$DEMO_EMAIL\"" || { log "authenticated probe failed"; return 1; }
  age=$(( $(date +%s) - $(stat -c %Y "$DESCRIPTOR" 2>/dev/null || stat -f %m "$DESCRIPTOR") ))
  [ "$age" -le "$TTL" ] || { log "environment is ${age}s old (TTL ${TTL}s)"; return 1; }
  [ "$(json_get "$DESCRIPTOR" sourceFingerprint)" = "$(fingerprint)" ] \
    || { log "sources changed since the environment started"; return 1; }
  return 0
}

reuse_exit() {
  log "reusing running environment $(json_get "$DESCRIPTOR" runId)"
  trap - EXIT
  print_result 1
  exit 0
}
if [ -f "$DESCRIPTOR" ] && reuse_ok; then reuse_exit; fi
acquire_lock test-env-up
# After waiting, the run that held the lock has likely produced a reusable environment.
if [ "$waited" -gt 0 ] && reuse_ok; then release_lock; reuse_exit; fi
# Holding the lock: whatever the previous run left behind is ours to clear.
if [ "$(json_get "$DESCRIPTOR" startedByThisRepo)" = true ]; then
  stop_pid "$(json_get "$DESCRIPTOR" app.pid)"
  docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
fi

# --- build cache ----------------------------------------------------------------
build_needed() {
  [ "$FORCE_REBUILD" = 1 ] && return 0
  [ -f "$BUILD_CACHE" ] || return 0
  [ "$(json_get "$BUILD_CACHE" sourceFingerprint)" = "$FP" ] || return 0
  [ "$(json_get "$BUILD_CACHE" projectRoot)" = "$ROOT" ] || return 0
  for a in $ARTIFACTS; do [ -s "$a" ] || [ -d "$a" ] || return 0; done
  return 1
}
FP=$(fingerprint)
REBUILT=0
if build_needed; then
  if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
    log "installing dependencies (npm ci)"
    npm ci --no-audit --no-fund >&2
  fi
  log "building production app (npm run build)"
  npm run build >&2
  printf '{ "builtAt": "%s", "sourceFingerprint": "%s", "projectRoot": "%s", "artifactPaths": "%s" }\n' \
    "$(now)" "$FP" "$ROOT" "$ARTIFACTS" > "$BUILD_CACHE"
  REBUILT=1
else
  log "build cache valid; skipping install and build"
fi

# --- services: disposable PostgreSQL ---------------------------------------------
docker info >/dev/null 2>&1 || { log "Docker is not available (WSL2: enable Docker Desktop's WSL integration)"; exit 1; }
PG_PORT=$(pick_port "$PG_PORT_PREFERRED")
PG_PASSWORD=$(node -e 'console.log(require("crypto").randomBytes(12).toString("hex"))')
start_pg() {
  docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --rm --name "$PG_CONTAINER" -p "127.0.0.1:$1:5432" \
    -e POSTGRES_USER="$PG_USER" -e POSTGRES_PASSWORD="$PG_PASSWORD" -e POSTGRES_DB="$PG_DB" \
    "$PG_IMAGE" >/dev/null
}
log "starting $PG_IMAGE on 127.0.0.1:$PG_PORT"
CREATED_PG=1
attempt=1
# WSL2 + Docker Desktop: Windows reserves port ranges (netsh interface ipv4 show excludedportrange)
# that still look free from inside Linux, so the publish can fail although port_free passed.
until start_pg "$PG_PORT"; do
  [ "$attempt" -lt "$PG_PORT_ATTEMPTS" ] || { log "could not publish a postgres port after $attempt attempts"; exit 1; }
  attempt=$((attempt + 1))
  PG_PORT=$(free_port)
  log "port rejected; retrying on 127.0.0.1:$PG_PORT"
done
ready=0
for _ in $(seq 1 60); do
  # pg_isready over TCP: the init script's temporary server listens on the socket only.
  if docker exec "$PG_CONTAINER" pg_isready -h 127.0.0.1 -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[ "$ready" = 1 ] || { log "postgres did not become ready"; exit 1; }
DATABASE_URL="postgres://$PG_USER:$PG_PASSWORD@127.0.0.1:$PG_PORT/$PG_DB"
export DATABASE_URL

log "migrating (npm run db:migrate)"
npm run db:migrate >&2

# --- app env + demo user -------------------------------------------------------------
APP_PORT=$(pick_port "$APP_PORT_PREFERRED")
BASE_URL="http://127.0.0.1:$APP_PORT"
BETTER_AUTH_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')
BETTER_AUTH_URL=$BASE_URL
# The real key is never read from .env; set TEST_ENV_ANTHROPIC_API_KEY to exercise AI estimates.
ANTHROPIC_API_KEY=${TEST_ENV_ANTHROPIC_API_KEY:-test-key-not-used}
ALLOW_SIGN_UP=${TEST_ENV_ALLOW_SIGN_UP:-false}
DEMO_PASSWORD=$(node -e 'console.log("Qa-"+require("crypto").randomBytes(12).toString("hex"))')
export BETTER_AUTH_SECRET BETTER_AUTH_URL ANTHROPIC_API_KEY ALLOW_SIGN_UP

log "seeding demo user $DEMO_EMAIL"
DEMO_NAME="$DEMO_NAME" DEMO_EMAIL="$DEMO_EMAIL" DEMO_PASSWORD="$DEMO_PASSWORD" \
  npx --no-install tsx --conditions=react-server -e '
    import("@taskly/core/server").then(async ({ createPasswordUser }) => {
      await createPasswordUser({ name: process.env.DEMO_NAME, email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASSWORD });
      process.exit(0);
    }).catch((e) => { console.error("seed failed:", e?.cause?.code ?? e?.name ?? "error"); process.exit(1); });
  ' >&2

# --- app start ----------------------------------------------------------------------
cp -R "$APP_DIR/public/." "$STANDALONE/public/" 2>/dev/null || { mkdir -p "$STANDALONE/public"; cp -R "$APP_DIR/public/." "$STANDALONE/public/"; }
mkdir -p "$STANDALONE/.next/static"
cp -R "$APP_DIR/.next/static/." "$STANDALONE/.next/static/"
log "starting app on $BASE_URL"
(cd "$STANDALONE" && NODE_ENV=production HOSTNAME=127.0.0.1 PORT="$APP_PORT" \
  nohup node server.js > "$ROOT/$APP_LOG" 2>&1 9>&- &
  echo $! > "$ROOT/$QA_DIR/test-env-app.pid")
APP_PID=$(cat "$QA_DIR/test-env-app.pid"); rm -f "$QA_DIR/test-env-app.pid"
healthy=0
for _ in $(seq 1 $((APP_WAIT_SECONDS * 2))); do
  alive "$APP_PID" || { log "app exited during startup"; tail -n 20 "$APP_LOG" >&2; exit 1; }
  if curl -fsS -o /dev/null --max-time 2 "$BASE_URL$HEALTH_PATH" 2>/dev/null; then healthy=1; break; fi
  sleep 0.5
done
[ "$healthy" = 1 ] || { log "app did not become healthy within ${APP_WAIT_SECONDS}s"; exit 1; }

# One sign-in for the probe cookie, so warm-run probes never spend rate-limit attempts.
PROBE_COOKIE=$(curl -fsS -D - -o /dev/null --max-time 10 -X POST "$BASE_URL/api/auth/sign-in/email" \
  -H "origin: $BASE_URL" -H "content-type: application/json" -H "x-forwarded-for: $PROBE_IP" \
  --data "$(DEMO_EMAIL="$DEMO_EMAIL" DEMO_PASSWORD="$DEMO_PASSWORD" node -e 'console.log(JSON.stringify({email:process.env.DEMO_EMAIL,password:process.env.DEMO_PASSWORD}))')" \
  | tr -d '\r' | sed -n 's/^[Ss]et-[Cc]ookie: \(__Secure-better-auth\.session_token=[^;]*\).*/\1/p' | head -n 1)
[ -n "$PROBE_COOKIE" ] || { log "demo sign-in failed"; exit 1; }
curl -fsS --max-time 5 -H "origin: $BASE_URL" -H "cookie: $PROBE_COOKIE" "$BASE_URL/api/auth/get-session" \
  | grep -q "\"email\":\"$DEMO_EMAIL\"" || { log "authenticated probe failed after boot"; exit 1; }

# --- credentials file + descriptor ---------------------------------------------------
umask 077
cat > "$ENV_FILE" <<EOF
# Disposable QA environment values (gitignored). Load with: set -a; . $ENV_FILE; set +a
TEST_DEMO_EMAIL=$DEMO_EMAIL
TEST_DEMO_PASSWORD=$DEMO_PASSWORD
TEST_ENV_DATABASE_URL=$DATABASE_URL
TEST_ENV_PROBE_COOKIE=$PROBE_COOKIE
EOF
umask 022
for entry in /.ai/qa/test-env.env /.ai/qa/test-env-build-cache.json /.ai/qa/test-env.lock/ /.ai/qa/test-env-app.log; do
  grep -qxF "$entry" .gitignore 2>/dev/null || echo "$entry" >> .gitignore
done

case "$(uname -s)" in
  Linux*) grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null && PLATFORM=wsl2 || PLATFORM=linux ;;
  Darwin*) PLATFORM=darwin ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM=win32 ;;
  *) PLATFORM=unknown ;;
esac
AB_BIN=$ROOT/node_modules/.bin/agent-browser
if "$AB_BIN" doctor --json >/dev/null 2>&1 9>&-; then AB_OK=true; AB_NOTES=""; else AB_OK=false; AB_NOTES="agent-browser doctor failed; rerun om-prepare-test-env in repair mode"; fi
AB_VERSION=$("$AB_BIN" --version 2>/dev/null 9>&- | awk '{print $NF}' || echo unknown)
PREV_NOTES=$(json_get "$DESCRIPTOR" timings)
DURATION=$(( $(date +%s) - T0 ))

RUN_ID="$(date -u +%Y%m%d%H%M%S)-$(node -e 'console.log(require("crypto").randomBytes(3).toString("hex"))')"
STARTED_AT=$(now)
export RUN_ID STARTED_AT BASE_URL APP_PORT APP_PID PG_PORT PG_CONTAINER PG_USER PG_DB DEMO_EMAIL \
  PLATFORM AB_BIN AB_OK AB_VERSION AB_NOTES DURATION REBUILT PREV_NOTES HEALTH_PATH DESCRIPTOR FP
node -e '
const e = process.env;
const d = {
  version: 1, runId: e.RUN_ID, status: "running", mode: "ephemeral", baseUrl: e.BASE_URL,
  startedByThisRepo: true,
  startScript: ".ai/scripts/test-env-up.sh", stopScript: ".ai/scripts/test-env-down.sh",
  app: { startCommand: "node packages/app/.next/standalone/packages/app/server.js (NODE_ENV=production)",
         port: +e.APP_PORT, healthPath: e.HEALTH_PATH, pid: +e.APP_PID, log: ".ai/qa/test-env-app.log" },
  services: [{ type: "postgres", image: "postgres:16-alpine", host: "127.0.0.1", port: +e.PG_PORT,
               container: e.PG_CONTAINER, database: e.PG_DB, user: e.PG_USER,
               urlEnv: "TEST_ENV_DATABASE_URL" }],
  credentials: [{ role: "demo", username: e.DEMO_EMAIL, passwordEnv: "TEST_DEMO_PASSWORD" }],
  credentialsFile: ".ai/qa/test-env.env",
  browser: { provider: "agent-browser", installed: e.AB_OK === "true", command: e.AB_BIN,
             version: e.AB_VERSION, descriptor: ".ai/browsers/agent-browser.md", notes: e.AB_NOTES },
  testRunner: { name: "vitest + agent-browser", config: "vitest.integration.config.mts" },
  platform: e.PLATFORM, startedAt: e.STARTED_AT, sourceFingerprint: e.FP,
  timings: e.PREV_NOTES || "",
  lastBoot: { seconds: +e.DURATION, rebuilt: e.REBUILT === "1" },
  notes: "Production standalone build against a fresh, migrated postgres:16-alpine (data is lost on every reboot). " +
    "One demo user (owner of nothing yet); sign-up is closed (TEST_ENV_ALLOW_SIGN_UP=true to open it). " +
    "AI estimates use a dummy key unless TEST_ENV_ANTHROPIC_API_KEY is set. " +
    "Sessions use __Secure- cookies (production mode); http://127.0.0.1 is a secure context in Chromium. " +
    "Requests send X-Forwarded-For per client to avoid sharing the rate-limit bucket. " +
    "Reuse expires after TEST_ENV_CACHE_TTL_SECONDS (default 600) or when sources change. " +
    "Prep chain: npm ci (when lockfile changed) -> npm run build -> docker postgres -> npm run db:migrate -> seed via createPasswordUser -> node server.js."
};
require("fs").writeFileSync(e.DESCRIPTOR, JSON.stringify(d, null, 2) + "\n");
'

release_lock
trap - EXIT
print_result 0
