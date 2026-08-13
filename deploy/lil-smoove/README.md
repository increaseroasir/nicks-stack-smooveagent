# Lil Smoove — Local Gateway Deployment

This directory contains the **credential-free** deployment artifacts for Lil Smoove’s initial persistent Hermes runtime.

## Scope

The service runs the Hermes JSON-RPC/WebSocket backend on **`127.0.0.1:9119`** only. It is supervised by systemd, starts after boot, and restarts after an unexpected failure. It does not expose a public endpoint and does not configure Telegram, ElevenLabs, Composio, cron, autonomous jobs, or external write channels.

The persistent model is `anthropic/claude-sonnet-5` through existing Nous Portal OAuth. The OAuth state belongs only in the target machine’s isolated `auth.json`; it is never committed.

## Install

Copy these files into `/home/orgo/lil-smoove` on the target, preserving executable modes for `gateway-run.sh` and `recover.sh`. Install the systemd unit as `/etc/systemd/system/lil-smoove-gateway.service`, run `systemctl daemon-reload`, then `systemctl enable --now lil-smoove-gateway.service`.

Use `recover.sh` for a local-only liveness recovery check. It verifies service state, local health, and the absence of a non-loopback listener on port 9119.

## Do not commit

Do not commit `.env`, `auth.json`, any Orgo credential, session databases, logs, recovery snapshots, generated voice files, or integration secrets.
