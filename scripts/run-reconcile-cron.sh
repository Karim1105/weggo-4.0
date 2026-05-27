#!/usr/bin/env bash
# Nightly LanceDB ↔ Mongo reconciliation. Invoked by cron.
#
# - Sources env from the running pm2 weggo process so we don't duplicate
#   secrets in a separate dotenv file.
# - Logs to logs/reconcile.log (rotated by logrotate or the user).
# - Acquires the same Mongo lease the in-process worker uses, so concurrent
#   runs are safe.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/reconcile.log"

mkdir -p "${LOG_DIR}"

# Extract env from pm2's "weggo" process (id 0 by name lookup).
# pm2 env prints "KEY: VALUE" lines; we filter to the vars reconcile needs
# and reformat as KEY=VALUE for `env`.
if ! command -v pm2 >/dev/null 2>&1; then
  echo "$(date -Iseconds) [reconcile-cron] pm2 not on PATH, aborting" >> "${LOG_FILE}"
  exit 1
fi

PM2_ID="$(pm2 jlist 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next((p["pm_id"] for p in d if p["name"]=="weggo"), ""))')"
if [ -z "${PM2_ID}" ]; then
  echo "$(date -Iseconds) [reconcile-cron] weggo pm2 process not found, aborting" >> "${LOG_FILE}"
  exit 1
fi

ENV_VARS=$(pm2 env "${PM2_ID}" 2>/dev/null \
  | grep -E '^(MONGODB_URI|LANCEDB_API_URL|TRANSLATION_API_URL|CHATBOT_API_URL|INTERNAL_SERVICE_TOKEN|GOOGLE_API_KEY): ' \
  | sed 's/: /=/' \
  | xargs)

cd "${PROJECT_DIR}"

{
  echo "----- $(date -Iseconds) reconcile start -----"
  env ${ENV_VARS} npm run --silent reconcile:lancedb
  echo "----- $(date -Iseconds) reconcile exit=$? -----"
} >> "${LOG_FILE}" 2>&1
