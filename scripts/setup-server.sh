#!/usr/bin/env bash

set -euo pipefail

APP_NAME="${APP_NAME:-weggo}"
APP_DIR="${APP_DIR:-$HOME/apps/$APP_NAME}"
BRANCH="${BRANCH:-main}"
REPO_SSH_URL="${REPO_SSH_URL:-}"
NODE_MAJOR="${NODE_MAJOR:-20}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
RUN_SYSTEM_SETUP="${RUN_SYSTEM_SETUP:-1}"
RUN_NPM_INSTALL="${RUN_NPM_INSTALL:-1}"
RUN_BUILD="${RUN_BUILD:-1}"
RUN_PM2="${RUN_PM2:-1}"
FORCE_ENV="${FORCE_ENV:-0}"
WRITE_ENV="${WRITE_ENV:-1}"

log() {
  printf '[setup] %s\n' "$1"
}

fail() {
  printf '[setup] %s\n' "$1" >&2
  exit 1
}

have() {
  command -v "$1" >/dev/null 2>&1
}

run_privileged() {
  if have sudo; then
    sudo "$@"
  else
    "$@"
  fi
}

install_base_packages() {
  if have apt-get; then
    export DEBIAN_FRONTEND=noninteractive
    run_privileged apt-get update
    run_privileged apt-get install -y git curl nginx openssh-client

    if ! have node || ! node -v | grep -q "^v$NODE_MAJOR\\."; then
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | run_privileged bash -
      run_privileged apt-get install -y nodejs
    fi
  elif have pacman; then
    run_privileged pacman -Sy --noconfirm git curl nginx openssh nodejs npm
  elif have dnf; then
    run_privileged dnf install -y git curl nginx openssh-clients nodejs npm
  else
    fail "Unsupported package manager. Install git, curl, nginx, nodejs, npm, and openssh-client manually."
  fi
}

install_pm2() {
  if ! have npm; then
    fail "npm is not installed."
  fi

  if ! have pm2; then
    log "Installing pm2 globally"
    run_privileged npm install -g pm2
  fi
}

ensure_repo() {
  mkdir -p "$(dirname "$APP_DIR")"

  if [[ -d "$APP_DIR/.git" ]]; then
    log "Updating existing repo in $APP_DIR"
    git -C "$APP_DIR" remote set-url origin "$REPO_SSH_URL"
    git -C "$APP_DIR" fetch origin
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
    return
  fi

  [[ -n "$REPO_SSH_URL" ]] || fail "REPO_SSH_URL is required to clone the repository."

  log "Cloning repo into $APP_DIR"
  git clone --branch "$BRANCH" "$REPO_SSH_URL" "$APP_DIR"
}

write_env_file() {
  local site_url api_url

  [[ -n "${MONGODB_URI:-}" ]] || fail "MONGODB_URI must be set to write $ENV_FILE."
  [[ -n "${JWT_SECRET:-}" ]] || fail "JWT_SECRET must be set to write $ENV_FILE."
  [[ -n "${NEXT_PUBLIC_SITE_URL:-}" ]] || fail "NEXT_PUBLIC_SITE_URL must be set to write $ENV_FILE."

  site_url="${NEXT_PUBLIC_SITE_URL}"
  api_url="${NEXT_PUBLIC_API_URL:-$site_url}"

  mkdir -p "$(dirname "$ENV_FILE")"

  if [[ -f "$ENV_FILE" && "$FORCE_ENV" != "1" ]]; then
    log "Keeping existing env file at $ENV_FILE"
    return
  fi

  cat >"$ENV_FILE" <<EOF
MONGODB_URI=$MONGODB_URI
JWT_SECRET=$JWT_SECRET
NEXT_PUBLIC_SITE_URL=$site_url
NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-$site_url}
NEXT_PUBLIC_API_URL=$api_url
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SEED_ADMIN_SECRET=${SEED_ADMIN_SECRET:-}
SEED_FEATURED_SECRET=${SEED_FEATURED_SECRET:-}
SEED_SELLER_EMAIL=${SEED_SELLER_EMAIL:-}
SEED_SELLER_PASSWORD=${SEED_SELLER_PASSWORD:-}
SEED_SELLER_NAME=${SEED_SELLER_NAME:-}
DEBUG_COOKIES_SECRET=${DEBUG_COOKIES_SECRET:-}
DEBUG=${DEBUG:-}
EOF

  chmod 600 "$ENV_FILE"
  log "Wrote env file to $ENV_FILE"
}

build_app() {
  if [[ "$RUN_NPM_INSTALL" == "1" ]]; then
    log "Installing npm dependencies"
    (cd "$APP_DIR" && npm install)
  fi

  if [[ "$RUN_BUILD" == "1" ]]; then
    log "Building app"
    (cd "$APP_DIR" && npm run build)
  fi
}

start_pm2() {
  log "Starting app with pm2"

  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$APP_NAME" --update-env
  else
    pm2 start npm --name "$APP_NAME" --cwd "$APP_DIR" -- start
  fi

  pm2 save

  if have systemctl; then
    pm2 startup systemd -u "$USER" --hp "$HOME" >/tmp/pm2-startup-"$APP_NAME".log 2>&1 || true
    log "pm2 startup output saved to /tmp/pm2-startup-$APP_NAME.log"
  fi
}

main() {
  if [[ "$RUN_SYSTEM_SETUP" == "1" ]]; then
    log "Installing system dependencies"
    install_base_packages
  fi

  install_pm2
  ensure_repo

  if [[ "$WRITE_ENV" == "1" ]]; then
    write_env_file
  else
    log "Skipping env file generation"
  fi

  build_app

  if [[ "$RUN_PM2" == "1" ]]; then
    start_pm2
  else
    log "Skipping pm2 start"
  fi

  log "Setup complete"
}

main "$@"
