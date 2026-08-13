#!/usr/bin/env bash
set -Eeuo pipefail

ROOT=/home/orgo/lil-smoove
export HOME="$ROOT/home"
export HERMES_HOME="$HOME/.hermes"
export PATH="$ROOT/runtime/venv/bin:/usr/local/bin:/usr/bin:/bin"

mkdir -p "$ROOT/logs" "$ROOT/workspace"

# This is the local Hermes JSON-RPC/WebSocket gateway only. It has no
# messaging-channel setup, no public bind, no cron activation, and no
# autonomous task trigger. OAuth credentials remain in HERMES_HOME/auth.json
# and are never copied into this launcher.
exec "$ROOT/runtime/venv/bin/hermes" serve \
  --host 127.0.0.1 \
  --port 9119 \
  --isolated \
  --skip-build
