#!/usr/bin/env bash
# Lil Smoove — protected 1Password bootstrap for the isolated Orgo runtime.
# This script never prints or accepts a token on the command line.

set -Eeuo pipefail
set +x

readonly ROOT="/home/orgo/lil-smoove"
readonly HERMES_HOME="$ROOT/home/.hermes"
readonly OP_ENV="$HERMES_HOME/.op.env"
readonly CONFIG="$HERMES_HOME/config.yaml"
readonly HERMES_BIN="$ROOT/runtime/venv/bin/hermes"
readonly PYTHON_BIN="$ROOT/runtime/venv/bin/python"
readonly SERVICE="hermes-gateway"
readonly ITEM_TITLE="Hermes Agent Secrets"

tmp_op_env=''
backup_op_env=''
backup_config=''
token_replaced=0
token_created=0

cleanup() {
  unset token OP_SERVICE_ACCOUNT_TOKEN
  [[ -n "$tmp_op_env" ]] && rm -f -- "$tmp_op_env"
}
trap cleanup EXIT

restore_previous_state() {
  if [[ -n "$backup_config" && -f "$backup_config" ]]; then
    mv -f -- "$backup_config" "$CONFIG"
    backup_config=''
  fi
  if (( token_replaced == 1 )); then
    if [[ -n "$backup_op_env" && -f "$backup_op_env" ]]; then
      mv -f -- "$backup_op_env" "$OP_ENV"
      backup_op_env=''
    else
      rm -f -- "$OP_ENV"
    fi
  elif (( token_created == 1 )); then
    rm -f -- "$OP_ENV"
  fi
}

if (( EUID != 0 )); then
  printf '%s\n' 'Run this helper from the Orgo root terminal so it can write the isolated Hermes runtime files.' >&2
  exit 1
fi

if [[ ! -t 0 || ! -t 1 ]]; then
  printf '%s\n' 'An interactive terminal is required; the service-account token is intentionally never accepted through arguments or redirected input.' >&2
  exit 1
fi

if ! command -v op >/dev/null 2>&1; then
  read -r -p 'The 1Password CLI is missing. Install it now from the official 1Password download? [y/N] ' install_op
  [[ "$install_op" =~ ^[Yy]$ ]] || { printf '%s\n' 'No changes made.'; exit 1; }

  architecture="$(dpkg --print-architecture)"
  case "$architecture" in
    amd64|386|arm64) op_arch="$architecture" ;;
    armhf) op_arch="arm" ;;
    *) printf 'Unsupported architecture for the official 1Password CLI package: %s\n' "$architecture" >&2; exit 1 ;;
  esac

  package_file="$(mktemp /tmp/1password-cli.XXXXXX.deb)"
  if ! curl -fsSL "https://downloads.1password.com/linux/debian/$op_arch/stable/1password-cli-$op_arch-latest.deb" -o "$package_file" || ! dpkg -i "$package_file" >/dev/null; then
    rm -f -- "$package_file"
    printf '%s\n' 'The official 1Password CLI installation did not complete. No secret file or Hermes configuration was changed.' >&2
    exit 1
  fi
  rm -f -- "$package_file"
  command -v op >/dev/null 2>&1 || { printf '%s\n' 'The 1Password CLI is still unavailable after installation.' >&2; exit 1; }
fi

if [[ ! -x "$HERMES_BIN" || ! -x "$PYTHON_BIN" || ! -f "$CONFIG" ]]; then
  printf '%s\n' 'The isolated Hermes runtime is incomplete. No secret file or Hermes configuration was changed.' >&2
  exit 1
fi

umask 077
install -d -m 0700 "$HERMES_HOME"

if [[ -f "$OP_ENV" ]]; then
  read -r -p 'A protected service-account token already exists. Reuse it and continue verification? [Y/n] ' reuse_existing
  reuse_existing="${reuse_existing:-Y}"
  if [[ ! "$reuse_existing" =~ ^[Yy]$ ]]; then
    read -r -p 'Replace the existing restricted 1Password service-account token? [y/N] ' replace
    [[ "$replace" =~ ^[Yy]$ ]] || { printf '%s\n' 'No change made.'; exit 0; }
    token_replaced=1
    backup_op_env="$(mktemp "$HERMES_HOME/.op.env.previous.XXXXXX")"
    mv -f -- "$OP_ENV" "$backup_op_env"
  fi
fi

if [[ ! -f "$OP_ENV" ]]; then
  printf '%s' 'Paste the restricted 1Password service-account token (input will not echo): '
  IFS= read -r -s token
  printf '\n'
  if [[ -z "$token" ]]; then
    restore_previous_state
    printf '%s\n' 'No token was entered; the previous state was retained.' >&2
    exit 1
  fi
  tmp_op_env="$(mktemp "$HERMES_HOME/.op.env.XXXXXX")"
  printf 'OP_SERVICE_ACCOUNT_TOKEN=%s\n' "$token" > "$tmp_op_env"
  chmod 0600 "$tmp_op_env"
  mv -f -- "$tmp_op_env" "$OP_ENV"
  chmod 0600 "$OP_ENV"
  tmp_op_env=''
  token_created=1
fi

set -a
# shellcheck disable=SC1090
. "$OP_ENV"
set +a

if ! op whoami >/dev/null 2>&1; then
  restore_previous_state
  printf '%s\n' 'The protected service-account token could not authenticate to 1Password. The previous isolated runtime state was retained.' >&2
  exit 1
fi

backup_config="$(mktemp "$HERMES_HOME/config.yaml.previous.XXXXXX")"
cp -p -- "$CONFIG" "$backup_config"

# The service account has deliberately restricted access. It must see exactly
# one vault and that vault must contain the exact target item. The 1Password
# JSON is held only in process memory; this parser extracts only op:// reference
# strings and approved field labels, never field values.
if ! "$PYTHON_BIN" - "$CONFIG" "$ITEM_TITLE" <<'PY'
import json
import os
import subprocess
import sys
from pathlib import Path
import yaml

config_path = Path(sys.argv[1])
item_title = sys.argv[2]
wanted = {
    "ORGO_API_KEY", "ELEVENLABS_API_KEY", "COMPOSIO_CONSUMER_KEY",
    "EXA_API_KEY", "OPENROUTER_API_KEY", "FIRECRAWL_API_KEY",
    "AGENTMAIL_API_KEY", "TELEGRAM_BOT_TOKEN",
}

def op_json(*args):
    completed = subprocess.run(
        ["op", *args], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        check=True, text=True,
    )
    return json.loads(completed.stdout)

try:
    vaults = op_json("vault", "list", "--format=json")
    if len(vaults) != 1:
        raise RuntimeError("expected exactly one service-account-visible vault")
    vault_id = vaults[0]["id"]
    items = op_json("item", "list", "--vault", vault_id, "--format=json")
    matches = [item for item in items if item.get("title") == item_title]
    if len(matches) != 1:
        raise RuntimeError("expected exactly one item with the required title")
    item = op_json("item", "get", matches[0]["id"], "--vault", vault_id, "--format=json")
except Exception:
    raise SystemExit(1)

references = {
    field.get("label"): field.get("reference")
    for field in item.get("fields", [])
    if field.get("label") in wanted and field.get("reference")
}
if not references:
    raise SystemExit(1)

with config_path.open("r", encoding="utf-8") as handle:
    config = yaml.safe_load(handle) or {}
onepassword = config.setdefault("secrets", {}).setdefault("onepassword", {})
onepassword["enabled"] = True
onepassword["env"] = dict(sorted(references.items()))
onepassword["service_account_token_env"] = "OP_SERVICE_ACCOUNT_TOKEN"
onepassword["binary_path"] = "/usr/bin/op"
onepassword["cache_ttl_seconds"] = 0
onepassword["override_existing"] = True

temporary = config_path.with_suffix(".yaml.tmp")
with temporary.open("w", encoding="utf-8") as handle:
    yaml.safe_dump(config, handle, default_flow_style=False, sort_keys=False, allow_unicode=True)
os.chmod(temporary, 0o600)
os.replace(temporary, config_path)
os.chmod(config_path, 0o600)
print("reference_map_field_names=" + ",".join(sorted(references)))
PY
then
  restore_previous_state
  printf '%s\n' 'The service account could not derive approved references from its visible vault and exact item. The previous isolated runtime state was retained.' >&2
  exit 1
fi

# Hermes itself must resolve the non-secret op:// references before the change
# is retained. All provider-specific output is discarded.
if ! env HOME="$ROOT/home" HERMES_HOME="$HERMES_HOME" "$HERMES_BIN" secrets onepassword sync >/dev/null 2>&1; then
  restore_previous_state
  printf '%s\n' 'Hermes could not resolve the configured 1Password references. The previous isolated runtime state was retained.' >&2
  exit 1
fi

unset token OP_SERVICE_ACCOUNT_TOKEN
rm -f -- "$backup_config" "$backup_op_env"
backup_config=''
backup_op_env=''

if ! supervisorctl restart "$SERVICE" >/dev/null 2>&1; then
  printf '%s\n' '1Password resolution passed, but the Hermes gateway did not restart. Run the local recovery procedure before using integrations.' >&2
  exit 1
fi

sleep 2
if ! supervisorctl status "$SERVICE" 2>/dev/null | grep -q 'RUNNING'; then
  printf '%s\n' 'The gateway did not reach RUNNING state after restart. Inspect the protected local logs; no secret value was displayed.' >&2
  exit 1
fi

printf '%s\n' '1Password bootstrap succeeded. The isolated token file is protected, Hermes resolved the approved references without disclosure, and the local gateway restarted.'
