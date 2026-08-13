#!/usr/bin/env bash
# Lil Smoove — metadata-only 1Password diagnostic.
# It never prints secret values or writes to the runtime configuration.

set -Eeuo pipefail
set +x

readonly ROOT="/home/orgo/lil-smoove"
readonly HERMES_HOME="$ROOT/home/.hermes"
readonly OP_ENV="$HERMES_HOME/.op.env"
readonly VAULT="Hermes"
readonly ITEM="Hermes Agent Secrets"
readonly PYTHON_BIN="$ROOT/runtime/venv/bin/python"

if (( EUID != 0 )); then
  printf '%s\n' 'Run this diagnostic from the Orgo root terminal.' >&2
  exit 1
fi

if [[ ! -f "$OP_ENV" ]] || ! command -v op >/dev/null 2>&1 || [[ ! -x "$PYTHON_BIN" ]]; then
  printf '%s\n' 'diagnostic_prerequisites=failed'
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$OP_ENV"
set +a

if ! op whoami >/dev/null 2>&1; then
  printf '%s\n' 'service_account_auth=failed'
  exit 1
fi
printf '%s\n' 'service_account_auth=pass'

# The JSON response is consumed only in-memory by the parser below. The parser
# emits selected field labels and types, never any field values.
if ! op item get "$ITEM" --vault "$VAULT" --format=json 2>/dev/null | "$PYTHON_BIN" -c '
import json
import sys

wanted = {
    "ORGO_API_KEY", "ELEVENLABS_API_KEY", "COMPOSIO_CONSUMER_KEY",
    "EXA_API_KEY", "OPENROUTER_API_KEY", "FIRECRAWL_API_KEY",
    "AGENTMAIL_API_KEY", "TELEGRAM_BOT_TOKEN",
}
try:
    item = json.load(sys.stdin)
except Exception:
    raise SystemExit(1)

fields = item.get("fields", [])
present = sorted(
    f.get("label") for f in fields
    if f.get("label") in wanted
)
print("vault_and_item_access=pass")
print("approved_fields_present=" + (",".join(present) if present else "none"))
print("field_count=" + str(len(fields)))
'; then
  printf '%s\n' 'vault_and_item_access=failed'
  exit 1
fi
