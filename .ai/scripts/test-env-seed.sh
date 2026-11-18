#!/bin/sh
# Seeds sample renovation lists into the running test env (run after test-env-up.sh).
# Values come from the gitignored env file and are never printed.
set -eu
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
ENV_FILE=.ai/qa/test-env.env
[ -f "$ENV_FILE" ] || { echo "no $ENV_FILE: run sh .ai/scripts/test-env-up.sh first" >&2; exit 1; }
set -a; . "$ENV_FILE"; set +a
DATABASE_URL=$TEST_ENV_DATABASE_URL DEMO_EMAIL=$TEST_DEMO_EMAIL \
  npx --no-install tsx --conditions=react-server .ai/scripts/test-env-seed.ts
