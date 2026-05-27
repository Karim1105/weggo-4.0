#!/usr/bin/env bash

set -euo pipefail

REMOTE="${REMOTE:-web@100.78.155.72}"
REMOTE_TMP_DIR="${REMOTE_TMP_DIR:-/tmp/weggo-setup}"
MODE="${1:-key}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<EOF
Usage:
  $(basename "$0") key
  $(basename "$0") deploy

Environment:
  REMOTE=web@100.78.155.72
  REPO_SSH_URL=git@github-weggo:OWNER/REPO.git
  BRANCH=main
  APP_NAME=weggo
  APP_DIR=/home/web/apps/weggo
  MONGODB_URI=...
  JWT_SECRET=...
  NEXT_PUBLIC_SITE_URL=https://example.com
  NEXT_PUBLIC_APP_URL=https://example.com
  NEXT_PUBLIC_API_URL=https://example.com

Examples:
  $(basename "$0") key
  REPO_SSH_URL=git@github-weggo:OWNER/REPO.git JWT_SECRET=... MONGODB_URI=... NEXT_PUBLIC_SITE_URL=https://example.com $(basename "$0") deploy
EOF
}

require_env() {
  local name
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      echo "Missing required environment variable: $name" >&2
      exit 1
    fi
  done
}

upload_scripts() {
  ssh "$REMOTE" "mkdir -p '$REMOTE_TMP_DIR'"
  scp \
    "$ROOT_DIR/scripts/setup-github-deploy-key.sh" \
    "$ROOT_DIR/scripts/setup-server.sh" \
    "$REMOTE:$REMOTE_TMP_DIR/"
  ssh "$REMOTE" "chmod +x '$REMOTE_TMP_DIR/setup-github-deploy-key.sh' '$REMOTE_TMP_DIR/setup-server.sh'"
}

run_key_mode() {
  upload_scripts
  ssh "$REMOTE" "KEY_COMMENT='Youssef.AbdElNaby.FCI22349@sadatacademy.edu.eg' '$REMOTE_TMP_DIR/setup-github-deploy-key.sh'"
}

run_deploy_mode() {
  require_env REPO_SSH_URL MONGODB_URI JWT_SECRET NEXT_PUBLIC_SITE_URL
  upload_scripts

  ssh "$REMOTE" \
    "APP_NAME='${APP_NAME:-weggo}' \
APP_DIR='${APP_DIR:-/home/web/apps/weggo}' \
BRANCH='${BRANCH:-main}' \
REPO_SSH_URL='$REPO_SSH_URL' \
MONGODB_URI='$MONGODB_URI' \
JWT_SECRET='$JWT_SECRET' \
NEXT_PUBLIC_SITE_URL='$NEXT_PUBLIC_SITE_URL' \
NEXT_PUBLIC_APP_URL='${NEXT_PUBLIC_APP_URL:-$NEXT_PUBLIC_SITE_URL}' \
NEXT_PUBLIC_API_URL='${NEXT_PUBLIC_API_URL:-$NEXT_PUBLIC_SITE_URL}' \
SMTP_HOST='${SMTP_HOST:-}' \
SMTP_PORT='${SMTP_PORT:-}' \
SMTP_USER='${SMTP_USER:-}' \
SMTP_PASS='${SMTP_PASS:-}' \
SEED_ADMIN_SECRET='${SEED_ADMIN_SECRET:-}' \
SEED_FEATURED_SECRET='${SEED_FEATURED_SECRET:-}' \
SEED_SELLER_EMAIL='${SEED_SELLER_EMAIL:-}' \
SEED_SELLER_PASSWORD='${SEED_SELLER_PASSWORD:-}' \
SEED_SELLER_NAME='${SEED_SELLER_NAME:-}' \
DEBUG_COOKIES_SECRET='${DEBUG_COOKIES_SECRET:-}' \
DEBUG='${DEBUG:-}' \
'$REMOTE_TMP_DIR/setup-server.sh'"
}

case "$MODE" in
  key)
    run_key_mode
    ;;
  deploy)
    run_deploy_mode
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
