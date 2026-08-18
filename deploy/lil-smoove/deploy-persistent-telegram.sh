#!/usr/bin/env bash
# Deploy Lil Smoove's supervised owner-only Telegram messaging gateway.

set -Eeuo pipefail
set +x

readonly ROOT="/home/orgo/lil-smoove"
readonly HERMES_HOME="$ROOT/home/.hermes"
readonly CONFIG="$HERMES_HOME/config.yaml"
readonly DOTENV="$HERMES_HOME/.env"
readonly OWNER_TELEGRAM_ID="5565447574"
readonly SOURCE_DIR="${1:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)}"
readonly STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
readonly BACKUP_DIR="$ROOT/recovery/persistent-telegram-$STAMP"

if (( EUID != 0 )); then
  printf '%s\n' 'Run this deployment as root on the Lil Smoove Orgo computer.' >&2
  exit 1
fi

for path in \
  "$SOURCE_DIR/messaging-gateway-run.sh" \
  "$SOURCE_DIR/lil-smoove-messaging-gateway.conf" \
  "$CONFIG" \
  "$HERMES_HOME/.op.env" \
  "$ROOT/runtime/venv/bin/hermes" \
  "$ROOT/runtime/venv/bin/python"; do
  [[ -e "$path" ]] || { printf 'Missing prerequisite: %s\n' "$path" >&2; exit 1; }
done

bash -n "$SOURCE_DIR/messaging-gateway-run.sh"
install -d -m 0700 "$BACKUP_DIR"
cp -a "$CONFIG" "$BACKUP_DIR/config.yaml.before"
[[ -f "$DOTENV" ]] && cp -a "$DOTENV" "$BACKUP_DIR/dotenv.before" || true
[[ -f /etc/supervisor/conf.d/lil-smoove-messaging-gateway.conf ]] && \
  cp -a /etc/supervisor/conf.d/lil-smoove-messaging-gateway.conf "$BACKUP_DIR/supervisor.before" || true

LS_CONFIG_PATH="$CONFIG" LS_OWNER_TELEGRAM_ID="$OWNER_TELEGRAM_ID" \
  "$ROOT/runtime/venv/bin/python" - <<'PY'
import os
from pathlib import Path
import yaml

path = Path(os.environ["LS_CONFIG_PATH"])
owner = os.environ["LS_OWNER_TELEGRAM_ID"]
with path.open("r", encoding="utf-8") as handle:
    config = yaml.safe_load(handle) or {}

onepassword = (config.get("secrets") or {}).get("onepassword") or {}
if not onepassword.get("enabled"):
    raise SystemExit("1Password is not enabled in the Lil Smoove config")
if "TELEGRAM_BOT_TOKEN" not in (onepassword.get("env") or {}):
    raise SystemExit("TELEGRAM_BOT_TOKEN is absent from the protected 1Password map")

approvals = config.setdefault("approvals", {})
approvals["mode"] = "smart"
approvals["timeout"] = 300
approvals["cron_mode"] = "deny"
approvals["mcp_reload_confirm"] = True
approvals["destructive_slash_confirm"] = True

telegram_tools = [
    "browser", "clarify", "computer_use", "delegation", "file", "memory",
    "orgo_desktop", "session_search", "skills", "terminal", "todo", "vision", "web",
]
config.setdefault("platform_toolsets", {})["telegram"] = telegram_tools
gateway = config.setdefault("gateway", {})
gateway["delivery_ledger"] = True
platform = gateway.setdefault("platforms", {}).setdefault("telegram", {})
platform["enabled"] = True
extra = platform.setdefault("extra", {})
extra["allow_from"] = [owner]
extra["allow_admin_from"] = [owner]

temporary = path.with_suffix(".yaml.telegram-new")
with temporary.open("w", encoding="utf-8") as handle:
    yaml.safe_dump(config, handle, default_flow_style=False, sort_keys=False, allow_unicode=True)
os.chmod(temporary, 0o600)
os.replace(temporary, path)
os.chmod(path, 0o600)
PY

umask 077
touch "$DOTENV"
grep -v '^TELEGRAM_ALLOWED_USERS=' "$DOTENV" > "$DOTENV.new" 2>/dev/null || true
printf 'TELEGRAM_ALLOWED_USERS=%s\n' "$OWNER_TELEGRAM_ID" >> "$DOTENV.new"
mv -f -- "$DOTENV.new" "$DOTENV"
chmod 0600 "$DOTENV" "$HERMES_HOME/.op.env" "$CONFIG"

install -m 0755 "$SOURCE_DIR/messaging-gateway-run.sh" "$ROOT/messaging-gateway-run.sh"
install -m 0644 "$SOURCE_DIR/lil-smoove-messaging-gateway.conf" \
  /etc/supervisor/conf.d/lil-smoove-messaging-gateway.conf

supervisorctl reread
supervisorctl update
supervisorctl start lil-smoove-messaging-gateway >/dev/null 2>&1 || true

for _ in $(seq 1 30); do
  if supervisorctl status lil-smoove-messaging-gateway | grep -q 'RUNNING'; then
    break
  fi
  sleep 1
done

supervisorctl status lil-smoove-messaging-gateway | grep -q 'RUNNING'
install -d -m 0700 "$ROOT/run"
if flock -n "$ROOT/run/messaging-gateway.lock" true; then
  printf '%s\n' 'Telegram GO failed: messaging gateway lock is not held.' >&2
  exit 1
fi
printf '%s\n' 'TELEGRAM_GO=1 messaging-gateway RUNNING and lock held'

tui_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:9119/api/status || true)"
if [[ "$tui_code" != "200" ]]; then
  printf '%s\n' "TUI non-regression failed: :9119/api/status returned HTTP ${tui_code:-000}." >&2
  exit 1
fi
ss -ltn | awk '$4 ~ /:9119$/ {print $4}' | grep -qx '127.0.0.1:9119' || {
  printf '%s\n' 'TUI non-regression failed: :9119 is not loopback-only.' >&2
  exit 1
}

printf 'Persistent Telegram deployment complete. Backup: %s\n' "$BACKUP_DIR"
