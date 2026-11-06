#!/bin/sh
# om-prepare-test-env: generated entrypoint (contract v2) — teardown
# regenerate with: om-prepare-test-env --regenerate
# history:
#   2026-11-06 generated: stops the app PID and the scoped postgres container; safe to run twice
#   2026-11-06 repair: only report "removed" when the container existed (docker rm -f exits 0 for a missing one)
#   2026-11-06 repair (PR #63 review): takes the bootstrap lock, so teardown never races a bootstrap in progress
#   2026-11-06 repair (PR #63 second review): the lock is flock(2) (test-env-lib.sh)
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
. "$ROOT/.ai/scripts/test-env-lib.sh"

if [ ! -f "$DESCRIPTOR" ]; then log "no descriptor; nothing to stop"; exit 0; fi
if [ "$(json_get "$DESCRIPTOR" startedByThisRepo)" != true ]; then
  log "descriptor was not started by this repo; leaving it alone"; exit 0
fi

trap release_lock EXIT
acquire_lock test-env-down || { log "teardown skipped; nothing was changed"; exit 1; }

PID=$(json_get "$DESCRIPTOR" app.pid)
if alive "$PID"; then stop_pid "$PID"; log "stopped app pid $PID"; fi
if docker inspect "$PG_CONTAINER" >/dev/null 2>&1 && docker rm -f "$PG_CONTAINER" >/dev/null 2>&1; then
  log "removed $PG_CONTAINER"
fi
node -e 'const f=process.argv[1],fs=require("fs");const d=JSON.parse(fs.readFileSync(f,"utf8"));d.status="stopped";d.stoppedAt=new Date().toISOString();fs.writeFileSync(f,JSON.stringify(d,null,2)+"\n")' "$DESCRIPTOR"
echo "TEST_ENV_STATUS=stopped"
