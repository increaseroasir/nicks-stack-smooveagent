# Lil Smoove — Orgo Local Gateway Deployment

This directory contains the **credential-free** deployment artifacts for Lil Smoove’s initial persistent Hermes runtime.

## Scope

The gateway runs the Hermes JSON-RPC/WebSocket backend on **`127.0.0.1:9119`** only. It is managed by the Orgo image’s existing **Supervisor** process manager, starts at boot, and restarts after an unexpected failure. It does not expose a public endpoint and does not configure Telegram, ElevenLabs, Composio, cron, autonomous jobs, or any external write channel.

The persistent model is `anthropic/claude-sonnet-5` through existing Nous Portal OAuth. The OAuth state belongs only in the target machine’s isolated `auth.json`; it is never committed.

> The Orgo image does not provide systemd. Do not install or retrofit it. The image starts `supervisord` at boot and reloads Supervisor drop-ins through its native `orgo-init` path.

## Install

Copy the deployment files into `/home/orgo/lil-smoove` on the target, preserving executable modes for `gateway-run.sh` and `recover.sh`. Before replacement, save the generated `/etc/supervisor/conf.d/orgo.conf` as a local recovery copy inside `/home/orgo/lil-smoove/recovery/`. Then replace the existing `hermes-gateway` program definition in `/etc/supervisor/conf.d/orgo.conf` with `lil-smoove-gateway.conf`, run `supervisorctl reread`, then `supervisorctl update`.

Use `recover.sh` for the local-only liveness check. It verifies the active Supervisor program, local health, and the absence of a non-loopback listener on port 9119.

## Do not commit

Do not commit `.env`, `auth.json`, any Orgo credential, session databases, logs, recovery snapshots, generated voice files, or integration secrets.
