#!/usr/bin/env bash
set -Eeuo pipefail

PROGRAM=hermes-gateway
HOST=127.0.0.1
PORT=9119

healthy() {
  supervisorctl status "$PROGRAM" | grep -Eq '^hermes-gateway[[:space:]]+RUNNING' \
    && curl --fail --silent --show-error --max-time 5 \
      "http://${HOST}:${PORT}/api/status" >/dev/null
}

if healthy; then
  if ss -ltnp "sport = :${PORT}" | grep -Eq '(^|[[:space:]])(0\.0\.0\.0|\[::\]):'; then
    echo "Gateway is not loopback-only" >&2
    exit 1
  fi
  echo "LIL_SMOOVE_GATEWAY_RECOVERY_OK"
  exit 0
fi

supervisorctl restart "$PROGRAM"
sleep 3
supervisorctl status "$PROGRAM" | grep -Eq '^hermes-gateway[[:space:]]+RUNNING'

# The gateway is intentionally loopback-only. This endpoint is a local
# liveness probe and does not expose any model credential.
curl --fail --silent --show-error --max-time 5 \
  "http://${HOST}:${PORT}/api/status" >/dev/null

# Reject a listener on a non-loopback address for the gateway port.
if ss -ltnp "sport = :${PORT}" | grep -Eq '(^|[[:space:]])(0\.0\.0\.0|\[::\]):'; then
  echo "Gateway is not loopback-only" >&2
  exit 1
fi

echo "LIL_SMOOVE_GATEWAY_RECOVERY_OK"
