#!/usr/bin/env bash
# Lil Smoove — protected 1Password bootstrap for the isolated Orgo runtime.
# This script never prints or accepts a token on the command line.

set -Eeuo pipefail
set +x

readonly ROOT="/home/orgo/lil-smoove"
readonly HERMES_HOME="$ROOT/home/.hermes"
readonly OP_ENV="$HERMES_HOME/.op.env"
readonly CONFIG="$HERMES_HOME/config.yaml"
readonly SERVICE="hermes-gateway"
readonly VAULT="Hermes"
readonly ITEM="Hermes Agent Secrets"

if (( EUID != 0 )); then
  printf '%s\n' 'Run this helper from the Orgo root terminal so it can write the isolated Hermes runtime files.' >&2
  exit 1
fi

if [[ ! -t 0 || ! -t 1 ]]; then
  printf '%s\n' 'An interactive terminal is required; the service-account token is intentionally never accepted through arguments or redirected input.' >&2
  exit 1
fi

if ! command -v op >/dev/null 2>&1; then
  printf '%s\n' 'The 1Password CLI is not installed at the expected runtime path. No files were changed.' >&2
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  printf '%s\n' 'The isolated Hermes configuration is missing. No files were changed.' >&2
  exit 1
fi

umask 077
install -d -m 0700 "$HERMES_HOME"

if [[ -f "$OP_ENV" ]]; then
  read -r -p 'Replace the existing restricted 1Password service-account token? [y/N] ' replace
  [[ "$replace" =~ ^[Yy]$ ]] || { printf '%s\n' 'No change made.'; exit 0; }
fi

printf '%s' 'Paste the restricted 1Password service-account token (input will not echo): '
IFS= read -r -s token
printf '\n'

if [[ -z "$token" ]]; then
  printf '%s\n' 'No token was entered; no file was changed.' >&2
  exit 1
fi

# A service-account token is a bearer credential. Keep it out of shell history,
# command arguments, stdout, and the persistent config file.
tmp_op_env="$(mktemp "$HERMES_HOME/.op.env.XXXXXX")"
cleanup() {
  unset token OP_SERVICE_ACCOUNT_TOKEN
  [[ -n "${tmp_op_env:-}" ]] && rm -f -- "$tmp_op_env"
}
trap cleanup EXIT

printf 'OP_SERVICE_ACCOUNT_TOKEN=%s\n' "$token" > "$tmp_op_env"
chmod 0600 "$tmp_op_env"
mv -f -- "$tmp_op_env" "$OP_ENV"
chmod 0600 "$OP_ENV"
tmp_op_env=''

# Load only the protected bootstrap file for one non-disclosing validation.
set -a
# shellcheck disable=SC1090
. "$OP_ENV"
set +a

if ! op whoami >/dev/null 2>&1; then
  rm -f -- "$OP_ENV"
  printf '%s\n' 'The token could not authenticate to 1Password. The bootstrap file was removed and Hermes was left unchanged.' >&2
  exit 1
fi

# Resolve only approved, non-empty fields. Secret bytes are discarded to /dev/null;
# only field names and pass/fail status are ever displayed or written to config.
declare -A refs=(
  [ORGO_API_KEY]="op://$VAULT/$ITEM/ORGO_API_KEY"
  [ELEVENLABS_API_KEY]="op://$VAULT/$ITEM/ELEVENLABS_API_KEY"
  [COMPOSIO_CONSUMER_KEY]="op://$VAULT/$ITEM/COMPOSIO_CONSUMER_KEY"
  [EXA_API_KEY]="op://$VAULT/$ITEM/EXA_API_KEY"
  [OPENROUTER_API_KEY]="op://$VAULT/$ITEM/OPENROUTER_API_KEY"
  [FIRECRAWL_API_KEY]="op://$VAULT/$ITEM/FIRECRAWL_API_KEY"
  [AGENTMAIL_API_KEY]="op://$VAULT/$ITEM/AGENTMAIL_API_KEY"
  [TELEGRAM_BOT_TOKEN]="op://$VAULT/$ITEM/TELEGRAM_BOT_TOKEN"
)

resolved_envs=()
for env_name in "${!refs[@]}"; do
  if op read -- "${refs[$env_name]}" >/dev/null 2>&1; then
    resolved_envs+=("$env_name")
  fi
done

# The runtime ships with PyYAML as part of the pinned Hermes environment. This
# writes only op:// references and enables the integration after successful auth.
ROOT="$ROOT" HERMES_HOME="$HERMES_HOME" CONFIG="$CONFIG" \
  RESOLVED_ENVS="$(IFS=,; printf '%s' "${resolved_envs[*]}")" \
  /home/orgo/lil-smoove/runtime/venv/bin/python - <<'PY'
import os
from pathlib import Path
import yaml

config_path = Path(os.environ["CONFIG"])
with config_path.open("r", encoding="utf-8") as handle:
    config = yaml.safe_load(handle) or {}

references = {
    "ORGO_API_KEY": "op://Hermes/Hermes Agent Secrets/ORGO_API_KEY",
    "ELEVENLABS_API_KEY": "op://Hermes/Hermes Agent Secrets/ELEVENLABS_API_KEY",
    "COMPOSIO_CONSUMER_KEY": "op://Hermes/Hermes Agent Secrets/COMPOSIO_CONSUMER_KEY",
    "EXA_API_KEY": "op://Hermes/Hermes Agent Secrets/EXA_API_KEY",
    "OPENROUTER_API_KEY": "op://Hermes/Hermes Agent Secrets/OPENROUTER_API_KEY",
    "FIRECRAWL_API_KEY": "op://Hermes/Hermes Agent Secrets/FIRECRAWL_API_KEY",
    "AGENTMAIL_API_KEY": "op://Hermes/Hermes Agent Secrets/AGENTMAIL_API_KEY",
    "TELEGRAM_BOT_TOKEN": "op://Hermes/Hermes Agent Secrets/TELEGRAM_BOT_TOKEN",
}
resolved = [name for name in os.environ.get("RESOLVED_ENVS", "").split(",") if name]
onepassword = config.setdefault("secrets", {}).setdefault("onepassword", {})
onepassword["enabled"] = True
onepassword["env"] = {name: references[name] for name in resolved}
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
PY

unset token OP_SERVICE_ACCOUNT_TOKEN

if ! supervisorctl restart "$SERVICE" >/dev/null 2>&1; then
  printf '%s\n' 'The token and secret references were stored, but the Hermes gateway did not restart. Run the local recovery procedure before using integrations.' >&2
  exit 1
fi

sleep 2
if ! supervisorctl status "$SERVICE" 2>/dev/null | grep -q 'RUNNING'; then
  printf '%s\n' 'The gateway did not reach RUNNING state after restart. Inspect the protected local logs; no secret value was displayed.' >&2
  exit 1
fi

printf '%s\n' '1Password bootstrap succeeded. The isolated token file is protected, approved non-empty secret references are enabled, and Hermes restarted without displaying secret values.'
printf 'Resolved approved field names: %s\n' "${resolved_envs[*]:-none}"
