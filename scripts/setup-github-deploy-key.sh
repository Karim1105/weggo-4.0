#!/usr/bin/env bash

set -euo pipefail

KEY_NAME="${KEY_NAME:-id_ed25519_github_weggo}"
KEY_PATH="${KEY_PATH:-$HOME/.ssh/$KEY_NAME}"
KEY_COMMENT="${KEY_COMMENT:-Youssef.AbdElNaby.FCI22349@sadatacademy.edu.eg}"
SSH_HOST_ALIAS="${SSH_HOST_ALIAS:-github-weggo}"
SSH_HOSTNAME="${SSH_HOSTNAME:-github.com}"
SSH_DIR="$HOME/.ssh"
CONFIG_PATH="$SSH_DIR/config"
BLOCK_START="# >>> weggo github deploy key >>>"
BLOCK_END="# <<< weggo github deploy key <<<"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

upsert_config_block() {
  local tmp
  tmp="$(mktemp)"

  if [[ -f "$CONFIG_PATH" ]]; then
    awk -v start="$BLOCK_START" -v end="$BLOCK_END" '
      $0 == start { skip=1; next }
      $0 == end { skip=0; next }
      !skip { print }
    ' "$CONFIG_PATH" >"$tmp"
  fi

  cat >>"$tmp" <<EOF2
$BLOCK_START
Host $SSH_HOST_ALIAS
  HostName $SSH_HOSTNAME
  User git
  IdentityFile $KEY_PATH
  IdentitiesOnly yes
$BLOCK_END
EOF2

  mv "$tmp" "$CONFIG_PATH"
}

require_cmd ssh-keygen

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

if [[ ! -f "$KEY_PATH" ]]; then
  ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "$KEY_COMMENT" >/dev/null
  echo "Created deploy key at $KEY_PATH"
else
  echo "Deploy key already exists at $KEY_PATH"
fi

upsert_config_block

chmod 600 "$CONFIG_PATH" "$KEY_PATH"
chmod 644 "$KEY_PATH.pub"

echo
echo "Add this public key to GitHub, then grant it access to the repo:"
cat "$KEY_PATH.pub"
echo
echo "Git SSH alias: $SSH_HOST_ALIAS"
echo "Use repo URLs like: git@$SSH_HOST_ALIAS:OWNER/REPO.git"
