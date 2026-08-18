# Lil Smoove — Orgo Local Gateway Deployment

This directory contains the **credential-free** deployment artifacts for Lil Smoove’s initial persistent Hermes runtime.

## Scope

The gateway runs the Hermes JSON-RPC/WebSocket backend on **`127.0.0.1:9119`** only. It is managed by the Orgo image’s existing **Supervisor** process manager, starts at boot, and restarts after an unexpected failure. It does not expose a public endpoint and does not configure Telegram, ElevenLabs, Composio, cron, autonomous jobs, or any external write channel.

The persistent model is `anthropic/claude-sonnet-5` through existing Nous Portal OAuth. The OAuth state belongs only in the target machine’s isolated `auth.json`; it is never committed.

> The Orgo image does not provide systemd. Do not install or retrofit it. The image starts `supervisord` at boot and reloads Supervisor drop-ins through its native `orgo-init` path.

## Install

Copy the deployment files into `/home/orgo/lil-smoove` on the target, preserving executable modes for `gateway-run.sh` and `recover.sh`. Before replacement, save the generated `/etc/supervisor/conf.d/orgo.conf` as a local recovery copy inside `/home/orgo/lil-smoove/recovery/`. Then replace the existing `hermes-gateway` program definition in `/etc/supervisor/conf.d/orgo.conf` with `lil-smoove-gateway.conf`, run `supervisorctl reread`, then `supervisorctl update`.

Use `recover.sh` for the local-only liveness check. It verifies the active Supervisor program, local health, and the absence of a non-loopback listener on port 9119.

## 1Password Bootstrap

`bootstrap-1password.sh` is the only supported token-entry helper for this isolated runtime. Run it from the Orgo **root** terminal after this deployment directory is present on the target:

```bash
/home/orgo/lil-smoove/bootstrap-1password.sh
```

The helper reads `OP_SERVICE_ACCOUNT_TOKEN` through a hidden terminal prompt rather than an argument, environment export, pasted shell command, or a history-bearing file. It writes only `/home/orgo/lil-smoove/home/.hermes/.op.env` with mode `0600`, validates the restricted service account without displaying any value, maps only approved non-empty fields from `Hermes / Hermes Agent Secrets`, enables Hermes’ 1Password source, and restarts the local Supervisor-managed gateway. It uses a zero-second 1Password cache to avoid persisting resolved secret values in Hermes’ cache.

The service account must have **read-only access** to the `Hermes` vault and the `Hermes Agent Secrets` item. The bootstrap file, its token, and all resolved values must never be copied into Git, logs, project documents, screenshots, terminal commands, or the dashboard.

## Do not commit

Do not commit `.env`, `.op.env`, `auth.json`, any Orgo credential, session databases, logs, recovery snapshots, generated voice files, or integration secrets.
