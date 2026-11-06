#!/bin/sh
# om-prepare-test-env: generated entrypoint (contract v2) — teardown
# regenerate with: om-prepare-test-env --regenerate
# history:
#   2026-11-06 generated: stops the app PID and the scoped postgres container; safe to run twice
#   2026-11-06 repair: only report "removed" when the container existed (docker rm -f exits 0 for a missing one)
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
QA_DIR=.ai/qa
DESCRIPTOR=$QA_DIR/test-env.json
LOCK_DIR=$QA_DIR/test-env.lock
SCOPE=$(printf '%s' "$ROOT" | cksum | awk '{print $1}')
PG_CONTAINER=taskly-test-env-pg-$SCOPE

json_get() {
  [ -f "$1" ] || return 0
  node -e 'try{let v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));for(const k of process.argv[2].split("."))v=v?.[k];if(v!==undefined&&v!==null)console.log(v)}catch{}' "$1" "$2"
}
alive() { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }

if [ ! -f "$DESCRIPTOR" ]; then echo "[test-env] no descriptor; nothing to stop" >&2; exit 0; fi
if [ "$(json_get "$DESCRIPTOR" startedByThisRepo)" != true ]; then
  echo "[test-env] descriptor was not started by this repo; leaving it alone" >&2; exit 0
fi

PID=$(json_get "$DESCRIPTOR" app.pid)
if alive "$PID"; then
  kill "$PID" 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do alive "$PID" || break; sleep 0.5; done
  alive "$PID" && kill -9 "$PID" 2>/dev/null || true
  echo "[test-env] stopped app pid $PID" >&2
fi
if docker inspect "$PG_CONTAINER" >/dev/null 2>&1 && docker rm -f "$PG_CONTAINER" >/dev/null 2>&1; then echo "[test-env] removed $PG_CONTAINER" >&2; fi
OWNER=$(json_get "$LOCK_DIR/owner.json" pid)
if [ -d "$LOCK_DIR" ] && ! alive "$OWNER"; then rm -rf "$LOCK_DIR"; fi

node -e 'const f=process.argv[1],fs=require("fs");const d=JSON.parse(fs.readFileSync(f,"utf8"));d.status="stopped";d.stoppedAt=new Date().toISOString();fs.writeFileSync(f,JSON.stringify(d,null,2)+"\n")' "$DESCRIPTOR"
echo "TEST_ENV_STATUS=stopped"
