#!/bin/sh
# Regression test for test-env-up.sh / test-env-down.sh (PR #63 review findings).
# Runs the real scripts in a throwaway sandbox with command doubles for docker, curl and npm:
# no Docker, no network, no build. Usage: sh .ai/scripts/test-env.test.sh
set -u

SRC=$(cd "$(dirname "$0")" && pwd)
WORK=$(mktemp -d)
FAILED=0
PIDS=""
cleanup() {
  for p in $PIDS; do kill "$p" 2>/dev/null || true; done
  rm -rf "$WORK"
}
trap cleanup EXIT

pass() { printf 'ok   - %s\n' "$1"; }
fail() { printf 'FAIL - %s\n' "$1"; FAILED=1; }
check() { if eval "$2"; then pass "$1"; else fail "$1"; fi; }
live_pid() { sleep 300 >/dev/null 2>&1 & LIVE=$!; PIDS="$PIDS $LIVE"; } # sets LIVE
dead_pid() { sh -c 'exit 0' & p=$!; wait "$p"; echo "$p"; }

# A fresh fake checkout plus doubles on PATH. Sets R, CALLS and PATH.
sandbox() {
  R=$WORK/$1
  mkdir -p "$R/.ai/scripts" "$R/.ai/qa" "$R/packages/app/src" "$R/bin"
  cp "$SRC/test-env-lib.sh" "$SRC/test-env-up.sh" "$SRC/test-env-down.sh" "$R/.ai/scripts/"
  printf 'export const a = 1;\n' > "$R/packages/app/src/a.ts"
  printf 'export const b = 2;\n' > "$R/packages/app/src/b.ts"
  printf '{}\n' > "$R/package.json"
  printf '{}\n' > "$R/package-lock.json"
  CALLS=$R/calls.log
  : > "$CALLS"
  cat > "$R/bin/docker" <<'EOF'
#!/bin/sh
echo "docker $*" >> "$CALLS"
case "$1" in
  inspect) [ "${FAKE_PG_RUNNING:-0}" = 1 ] || exit 1; [ "$2" = -f ] && echo true; exit 0 ;;
  info) exit "${FAKE_DOCKER_INFO_STATUS:-0}" ;;
esac
exit 0
EOF
  cat > "$R/bin/curl" <<'EOF'
#!/bin/sh
echo "curl $*" >> "$CALLS"
case "$*" in *get-session*) echo '{"user":{"email":"qa-demo@taskly.test"}}' ;; esac
exit 0
EOF
  cat > "$R/bin/npm" <<'EOF'
#!/bin/sh
echo "npm $*" >> "$CALLS"
case "$*" in *"${FAKE_NPM_FAIL:-<none>}"*) exit 1 ;; esac
exit 0
EOF
  chmod +x "$R/bin/"*
  export CALLS
  PATH=$R/bin:$ORIG_PATH
}
ORIG_PATH=$PATH

fp_in() { (cd "$1" && ROOT=$1 && . .ai/scripts/test-env-lib.sh && fingerprint); }
descriptor() { # dir app-pid fingerprint
  printf '{ "status": "running", "startedByThisRepo": true, "runId": "r1", "baseUrl": "http://127.0.0.1:3300", "app": { "pid": %s }, "sourceFingerprint": "%s" }\n' \
    "$2" "$3" > "$1/.ai/qa/test-env.json"
  printf 'TEST_ENV_PROBE_COOKIE=x=y\n' > "$1/.ai/qa/test-env.env"
}
lock_by() { mkdir -p "$1/.ai/qa/test-env.lock"; printf '{ "pid": %s }\n' "$2" > "$1/.ai/qa/test-env.lock/owner.json"; }

# 1. A caller that times out on another bootstrap's lock must not touch its database.
sandbox lock-timeout
live_pid; OTHER=$LIVE
descriptor "$R" "$(dead_pid)" none
lock_by "$R" "$OTHER"
TEST_ENV_LOCK_WAIT_SECONDS=1 sh "$R/.ai/scripts/test-env-up.sh" > "$R/out" 2> "$R/err"; status=$?
check "up: lock timeout exits non-zero" '[ "$status" != 0 ]'
check "up: lock timeout removes no container" '! grep -q "docker rm" "$CALLS"'
check "up: lock timeout keeps the other owner's lock" 'grep -q "\"pid\": $OTHER" "$R/.ai/qa/test-env.lock/owner.json"'
TEST_ENV_LOCK_WAIT_SECONDS=1 sh "$R/.ai/scripts/test-env-down.sh" > "$R/out" 2> "$R/err"; status=$?
check "down: waits for a bootstrap and changes nothing" \
  '[ "$status" != 0 ] && ! grep -q "docker rm" "$CALLS" && grep -q "\"pid\": $OTHER" "$R/.ai/qa/test-env.lock/owner.json"'

# 2. A failed bootstrap removes the container it created and releases its lock.
sandbox own-cleanup
FAKE_NPM_FAIL=db:migrate sh "$R/.ai/scripts/test-env-up.sh" > "$R/out" 2> "$R/err"; status=$?
check "up: failed bootstrap exits non-zero" '[ "$status" != 0 ]'
check "up: failed bootstrap removes its own container last" '[ "$(tail -n 1 "$CALLS" | cut -d" " -f1-3)" = "docker rm -f" ]'
check "up: failed bootstrap releases its lock" '[ ! -e "$R/.ai/qa/test-env.lock" ]'

# 3. A healthy env is reused, but never with --force-rebuild.
sandbox force-rebuild
live_pid; APP=$LIVE
descriptor "$R" "$APP" "$(fp_in "$R")"
lock_by "$R" "$APP"
FAKE_PG_RUNNING=1 sh "$R/.ai/scripts/test-env-up.sh" > "$R/out" 2> "$R/err"; status=$?
check "up: healthy env is reused" '[ "$status" = 0 ] && grep -q "^TEST_ENV_REUSED=1" "$R/out"'
FAKE_PG_RUNNING=1 FAKE_DOCKER_INFO_STATUS=1 sh "$R/.ai/scripts/test-env-up.sh" --force-rebuild > "$R/out" 2> "$R/err"
check "up: --force-rebuild rejects reuse" '! grep -q "^TEST_ENV_REUSED=1" "$R/out" && grep -q "force-rebuild: not reusing" "$R/err"'
check "up: --force-rebuild runs the build" 'grep -q "^npm run build" "$CALLS"'

# 4. The fingerprint follows file contents: deletions and same-size, same-mtime edits count.
sandbox fingerprint
FP1=$(fp_in "$R")
rm "$R/packages/app/src/b.ts"
FP2=$(fp_in "$R")
check "fingerprint: changes when a source file is deleted" '[ "$FP1" != "$FP2" ]'
touch -r "$R/packages/app/src/a.ts" "$R/ref"
printf 'export const a = 9;\n' > "$R/packages/app/src/a.ts"
touch -r "$R/ref" "$R/packages/app/src/a.ts"
FP3=$(fp_in "$R")
check "fingerprint: changes on a same-size edit with the same mtime" '[ "$FP2" != "$FP3" ]'
live_pid; APP=$LIVE
descriptor "$R" "$APP" "$FP3"
rm "$R/packages/app/src/a.ts"
FAKE_PG_RUNNING=1 FAKE_DOCKER_INFO_STATUS=1 sh "$R/.ai/scripts/test-env-up.sh" > "$R/out" 2> "$R/err"
check "up: a deleted source file rejects reuse" '! grep -q "^TEST_ENV_REUSED=1" "$R/out" && grep -q "sources changed" "$R/err"'

[ "$FAILED" = 0 ] && echo "all test-env script checks passed"
exit "$FAILED"
