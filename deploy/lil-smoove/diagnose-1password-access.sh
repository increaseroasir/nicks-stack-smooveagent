#!/usr/bin/env bash
# Lil Smoove — metadata-only 1Password vault and item visibility diagnostic.
# It never prints secret values and never changes the runtime configuration.

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

if ! op vault list --format=json 2>/dev/null | "$PYTHON_BIN" -c '
import json
import sys
try:
    vaults = json.load(sys.stdin)
except Exception:
    raise SystemExit(1)
print("vault_list_access=pass")
print("hermes_vault_visible=" + str(any(v.get("name") == "Hermes" for v in vaults)).lower())
print("visible_vault_count=" + str(len(vaults)))
'; then
  printf '%s\n' 'vault_list_access=failed'
  exit 1
fi

if ! op item list --vault "$VAULT" --format=json 2>/dev/null | "$PYTHON_BIN" -c '
import json
import sys
try:
    items = json.load(sys.stdin)
except Exception:
    raise SystemExit(1)
print("hermes_vault_item_list_access=pass")
print("exact_item_visible=" + str(any(i.get("title") == "Hermes Agent Secrets" for i in items)).lower())
print("visible_item_count=" + str(len(items)))
'; then
  printf '%s\n' 'hermes_vault_item_list_access=failed'
  exit 1
fi
