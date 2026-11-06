# om-prepare-test-env: shared helpers for test-env-up.sh and test-env-down.sh (sourced, not run)
# history:
#   2026-11-06 created: atomic lock with owner, content-based source fingerprint (PR #63 review)
# Expects ROOT (repo root, current directory) to be set by the caller.

QA_DIR=.ai/qa
DESCRIPTOR=$QA_DIR/test-env.json
LOCK_DIR=$QA_DIR/test-env.lock
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
# The lock directory is created complete (owner.json inside) and renamed into place, so it never
# exists without an owner. rename(2) onto an existing non-empty directory fails: only one wins.
LOCK_MINE=0
lock_try() { # pid source
  node -e '
    const fs = require("fs"), path = require("path");
    const [lock, pid, source, at] = process.argv.slice(1);
    const tmp = fs.mkdtempSync(path.join(path.dirname(lock), ".lock-"));
    fs.writeFileSync(path.join(tmp, "owner.json"), JSON.stringify({ pid: +pid, source, acquiredAt: at }) + "\n");
    try { fs.renameSync(tmp, lock); } catch { fs.rmSync(tmp, { recursive: true, force: true }); process.exit(1); }
  ' "$LOCK_DIR" "$1" "$2" "$(now)"
}
lock_owner() { json_get "$LOCK_DIR/owner.json" pid; }
lock_break() { # dead-pid: removes the lock only if that pid still owns it
  node -e '
    const fs = require("fs");
    const [lock, dead] = process.argv.slice(1);
    const moved = `${lock}.stale.${process.pid}`;
    try { fs.renameSync(lock, moved); } catch { process.exit(0); }
    let owner;
    try { owner = JSON.parse(fs.readFileSync(`${moved}/owner.json`, "utf8")).pid; } catch {}
    if (String(owner) !== dead) { try { fs.renameSync(moved, lock); process.exit(0); } catch {} }
    fs.rmSync(moved, { recursive: true, force: true });
  ' "$LOCK_DIR" "$1"
}
lock_handover() { # new-pid source: owner.json replaced atomically
  node -e '
    const fs = require("fs");
    const [lock, pid, source, at] = process.argv.slice(1);
    fs.writeFileSync(`${lock}/owner.json.tmp`, JSON.stringify({ pid: +pid, source, acquiredAt: at }) + "\n");
    fs.renameSync(`${lock}/owner.json.tmp`, `${lock}/owner.json`);
  ' "$LOCK_DIR" "$1" "$2" "$(now)"
}
release_lock() {
  if [ "$LOCK_MINE" = 1 ]; then rm -rf "$LOCK_DIR"; fi
  LOCK_MINE=0
}
# acquire_lock source on_env_lock: on_env_lock is called when the owner is the running app of
# the recorded environment (the lock is handed to it for its lifetime); it must stop that app or exit.
acquire_lock() {
  mkdir -p "$QA_DIR"
  waited=0
  while ! lock_try $$ "$1"; do
    owner=$(lock_owner)
    if ! alive "$owner"; then
      log "removing stale lock (owner ${owner:-unknown} is gone)"
      lock_break "$owner"; continue
    fi
    if [ "$owner" = "$(json_get "$DESCRIPTOR" app.pid)" ]; then
      "$2" "$owner"; continue
    fi
    if [ "$waited" -ge "$LOCK_WAIT_SECONDS" ]; then
      log "another bootstrap (pid $owner) still holds $LOCK_DIR after ${LOCK_WAIT_SECONDS}s"; return 1
    fi
    [ "$waited" = 0 ] && log "waiting for bootstrap pid $owner"
    sleep 1; waited=$((waited + 1))
  done
  LOCK_MINE=1
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
