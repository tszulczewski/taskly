# om-prepare-test-env: shared helpers for test-env-up.sh and test-env-down.sh (sourced, not run)
# history:
#   2026-11-06 created: atomic lock with owner, content-based source fingerprint (PR #63 review)
#   2026-11-06 repair (PR #63 second review): flock(2) instead of a rename-based directory lock; stale-lock
#     recovery could delete a live owner's lock when two waiters saw the same dead pid
# Expects ROOT (repo root, current directory) to be set by the caller.

QA_DIR=.ai/qa
DESCRIPTOR=$QA_DIR/test-env.json
LOCK_WAIT_SECONDS=${TEST_ENV_LOCK_WAIT_SECONDS:-300}
# Scope container names to this checkout so worktrees never collide.
SCOPE=$(printf '%s' "$ROOT" | cksum | awk '{print $1}')
PG_CONTAINER=taskly-test-env-pg-$SCOPE
# Build cache and freshness: inputs, and env vars that shape the build.
BUILD_INPUTS="packages package.json package-lock.json tsconfig.base.json"
BUILD_ENV_VARS="NODE_ENV"

log() { printf '[test-env] %s\n' "$*" >&2; }
now() { date -u +%FT%TZ; }
alive() { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }
json_get() { # file key.path -> value or empty
  [ -f "$1" ] || return 0
  node -e 'try{let v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));for(const k of process.argv[2].split("."))v=v?.[k];if(v!==undefined&&v!==null)console.log(v)}catch{}' "$1" "$2"
}

# --- lock -------------------------------------------------------------------------
# An OS lock (flock(2) on fd 9, taken through perl, which ships with Linux, macOS and Git for
# Windows). The kernel releases it when the holder and every child that inherited fd 9 exit, so
# there is no stale-lock recovery to race. It covers one bootstrap or teardown, not the
# environment's lifetime: long-lived children (the app, the agent-browser daemon) start with 9>&-.
LOCK_FILE=$QA_DIR/test-env.flock
LOCK_MINE=0
lock_try() {
  perl -e 'use Fcntl qw(:flock); open(my $f, ">&=", 9) or exit 2; exit(flock($f, LOCK_EX | LOCK_NB) ? 0 : 1)'
}
release_lock() {
  if [ "$LOCK_MINE" = 1 ]; then exec 9>&-; fi
  LOCK_MINE=0
}
# acquire_lock source: waits up to LOCK_WAIT_SECONDS; returns 1 without changing anything on timeout.
acquire_lock() {
  mkdir -p "$QA_DIR"
  exec 9>>"$LOCK_FILE"
  waited=0
  while ! lock_try; do
    if [ "$waited" -ge "$LOCK_WAIT_SECONDS" ]; then
      exec 9>&-
      log "another bootstrap or teardown ($(cat "$LOCK_FILE.owner" 2>/dev/null || echo unknown)) still holds $LOCK_FILE after ${LOCK_WAIT_SECONDS}s"
      return 1
    fi
    [ "$waited" = 0 ] && log "waiting for $(cat "$LOCK_FILE.owner" 2>/dev/null || echo another run)"
    sleep 1; waited=$((waited + 1))
  done
  LOCK_MINE=1
  # Informational only (log messages); the kernel lock is the source of truth.
  printf 'pid %s (%s) since %s\n' $$ "$1" "$(now)" > "$LOCK_FILE.owner"
}

stop_pid() {
  alive "$1" || return 0
  kill "$1" 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do alive "$1" || return 0; sleep 0.5; done
  kill -9 "$1" 2>/dev/null || true
}

# --- source fingerprint ----------------------------------------------------------------
# Content-based (git hash-object), so deletions and same-size edits within one second count.
source_files() {
  for p in $BUILD_INPUTS; do
    if [ -d "$p" ]; then
      find "$p" -type f \
        ! -path '*/node_modules/*' ! -path '*/.next/*' ! -path '*/coverage/*' \
        ! -path '*/storybook-static/*' ! -path '*/.storybook/public/prototypes/*' \
        ! -name '*.test.ts' ! -name '*.test.tsx' ! -name '*.stories.tsx' \
        ! -name '*.tsbuildinfo' ! -name 'next-env.d.ts' ! -name 'AGENTS.md'
    elif [ -f "$p" ]; then echo "$p"; fi
  done | LC_ALL=C sort
}
fingerprint() {
  files=$(source_files)
  {
    if [ -n "$files" ]; then
      printf '%s\n' "$files"
      printf '%s\n' "$files" | git hash-object --stdin-paths
    fi
    for v in $BUILD_ENV_VARS; do eval "printf 'env:%s=%s\n' \"$v\" \"\${$v:-}\""; done
  } | cksum | awk '{print $1"-"$2}'
}
