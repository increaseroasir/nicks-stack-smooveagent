#!/usr/bin/env bash
set -Eeuo pipefail

UNIT=lil-smoove-gateway.service
HOST=127.0.0.1
PORT=9119

systemctl daemon-reload
systemctl enable "$UNIT"
systemctl restart "$UNIT"
systemctl is-active --quiet "$UNIT"

# The gateway is intentionally loopback-only. This endpoint is a local
# liveness probe and does not expose any model credential.
curl --fail --silent --show-error "http://${HOST}:${PORT}/health" >/dev/null

# Reject a listener on a non-loopback address for the gateway port.
if ss -ltnp "sport = :${PORT}" | grep -Eq '(^|[[:space:]])(0\.0\.0\.0|\[::\]):'; then
  echo "Gateway is not loopback-only" >&2
  exit 1
fi

echo "LIL_SMOOVE_GATEWAY_RECOVERY_OK"
