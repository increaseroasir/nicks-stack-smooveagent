#!/usr/bin/env bash
# Lil Smoove — supervised Hermes messaging gateway for owner-only Telegram.
# The existing loopback TUI backend remains a separate, unchanged process.

set -Eeuo pipefail
set +x

readonly ROOT="/home/orgo/lil-smoove"
readonly HERMES_HOME="$ROOT/home/.hermes"
readonly HERMES_BIN="$ROOT/runtime/venv/bin/hermes"
readonly OWNER_TELEGRAM_ID="5565447574"
readonly LOCK_FILE="$ROOT/run/messaging-gateway.lock"

export HOME="$ROOT/home"
export HERMES_HOME
export PATH="$ROOT/runtime/venv/bin:/usr/local/bin:/usr/bin:/bin"
export PYTHONUNBUFFERED=1

mkdir -p "$ROOT/logs" "$ROOT/workspace" "$ROOT/run"

if [[ ! -x "$HERMES_BIN" || ! -s "$HERMES_HOME/config.yaml" || ! -s "$HERMES_HOME/auth.json" || ! -s "$HERMES_HOME/.op.env" ]]; then
  printf '%s\n' 'Lil Smoove messaging gateway prerequisites are incomplete.' >&2
  exit 1
fi

if [[ ! -f "$HERMES_HOME/.env" ]] || ! grep -qx "TELEGRAM_ALLOWED_USERS=$OWNER_TELEGRAM_ID" "$HERMES_HOME/.env"; then
  printf '%s\n' 'Owner-only Telegram allowlist is missing or incorrect.' >&2
  exit 1
fi

# Hold a lifetime non-blocking lock in the Hermes process itself. This prevents
# two Supervisor instances or manual launches from creating duplicate Telegram
# dispatchers while leaving the independent TUI backend untouched.
exec 9>"$LOCK_FILE"
locked=0
for _ in $(seq 1 30); do
  if flock -n 9; then
    locked=1
    break
  fi
  sleep 1
done
if (( locked == 0 )); then
  printf '%s\n' 'A Lil Smoove messaging gateway already owns the process lock.' >&2
  exit 1
fi

exec "$HERMES_BIN" gateway run --replace --external-supervisor
