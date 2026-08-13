#!/usr/bin/env bash
# Lil Smoove - controlled Telegram foreground activation and text-test helper.
# The bot token is resolved by Hermes from 1Password. It is never printed.

set -Eeuo pipefail
set +x

readonly ROOT="/home/orgo/lil-smoove"
readonly HERMES_HOME="$ROOT/home/.hermes"
readonly CONFIG="$HERMES_HOME/config.yaml"
readonly DOTENV="$HERMES_HOME/.env"
readonly HERMES_BIN="$ROOT/runtime/venv/bin/hermes"
readonly PYTHON_BIN="$ROOT/runtime/venv/bin/python"
readonly OWNER_TELEGRAM_ID="5565447574"

if (( EUID != 0 )); then
  printf '%s\n' 'Run this helper from the Orgo root terminal.' >&2
  exit 1
fi

if [[ ! -x "$HERMES_BIN" || ! -x "$PYTHON_BIN" || ! -f "$CONFIG" || ! -f "$HERMES_HOME/.op.env" ]];
then

  printf '%s\n' 'The isolated Hermes runtime is incomplete. No configuration was changed.' >&2
  exit 1
fi

# Confirm only that the protected 1Password map contains the Telegram token.
if ! LS_CONFIG_PATH="$CONFIG" "$PYTHON_BIN" - <<'PY'
import os
from pathlib import Path
import yaml

with Path(os.environ["LS_CONFIG_PATH"]).open("r", encoding="utf-8") as handle:
    config = yaml.safe_load(handle) or {}
onepassword = (config.get("secrets") or {}).get("onepassword") or {}
if not onepassword.get("enabled") or "TELEGRAM_BOT_TOKEN" not in (onepassword.get("env") or {}):
    raise SystemExit(1)
PY
then
  printf '%s\n' 'TELEGRAM_BOT_TOKEN is not yet present in the protected Hermes 1Password map. Refresh 1Password bootstrap first; no configuration was changed.' >&2
  exit 1
fi

umask 077
install -d -m 0700 "$HERMES_HOME"
touch "$DOTENV"
chmod 0600 "$DOTENV"
# Numeric allowlist only. No bot token or other secret is written to .env.
grep -v '^TELEGRAM_ALLOWED_USERS=' "$DOTENV" > "$DOTENV.tmp" 2>/dev/null || true
printf 'TELEGRAM_ALLOWED_USERS=%s\n' "$OWNER_TELEGRAM_ID" >> "$DOTENV.tmp"
mv -f -- "$DOTENV.tmp" "$DOTENV"
chmod 0600 "$DOTENV"

# Configure a single private owner DM, preserving all existing security controls.
LS_CONFIG_PATH="$CONFIG" LS_OWNER_TELEGRAM_ID="$OWNER_TELEGRAM_ID" "$PYTHON_BIN" - <<'PY'
import os
from pathlib import Path
import yaml

config_path = Path(os.environ["LS_CONFIG_PATH"])
owner = os.environ["LS_OWNER_TELEGRAM_ID"]
with config_path.open("r", encoding="utf-8") as handle:
    config = yaml.safe_load(handle) or {}

telegram_tools = [
    "browser", "clarify", "computer_use", "delegation", "file", "memory",
    "orgo_desktop", "session_search", "skills", "terminal", "todo", "vision", "web",
]
config.setdefault("platform_toolsets", {})["telegram"] = telegram_tools
platform = config.setdefault("gateway", {}).setdefault("platforms", {}).setdefault("telegram", {})
platform["enabled"] = True
extra = platform.setdefault("extra", {})
extra["allow_from"] = [owner]
extra["allow_admin_from"] = [owner]

temporary = config_path.with_suffix(".yaml.tmp")
with temporary.open("w", encoding="utf-8") as handle:
    yaml.safe_dump(config, handle, default_flow_style=False, sort_keys=False, allow_unicode=True)
os.chmod(temporary, 0o600)
os.replace(temporary, config_path)
os.chmod(config_path, 0o600)
PY

readonly LOCK_FILE="$ROOT/run/messaging-gateway.lock"
install -d -m 0700 "$ROOT/run"

if supervisorctl status lil-smoove-messaging-gateway 2>/dev/null | grep -q 'RUNNING'; then
  printf '%s\n' 'Supervised messaging gateway is RUNNING. Stop it before a foreground test.' >&2
  exit 1
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  printf '%s\n' 'Messaging gateway lock is held. Another dispatcher is already running.' >&2
  exit 1
fi

printf '%s\n' 'Telegram configuration is staged for the sole owner allowlist. Starting Hermes messaging gateway in the foreground for one text round-trip test.'
printf '%s\n' 'In Telegram, message the bot: Lil Smoove text test. After it replies, return here and press Ctrl-C.'
set -a
# shellcheck disable=SC1090
. "$HERMES_HOME/.op.env"
set +a
exec env HOME="$ROOT/home" HERMES_HOME="$HERMES_HOME" "$HERMES_BIN" gateway
