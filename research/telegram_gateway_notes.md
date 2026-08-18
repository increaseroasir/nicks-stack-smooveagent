# Official Hermes Telegram and Gateway Notes

## Sources

- [Telegram Setup](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/messaging/telegram.md)
- [Messaging Gateway](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/messaging/index.md)
- [API Server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server)

## Current verified requirements

Hermes' messaging gateway is a single background process that connects configured messaging platforms, persists per-chat sessions, runs the cron scheduler, and delivers voice messages. The current Telegram setup documentation requires a BotFather token and a numeric Telegram user ID. It supports either `hermes gateway setup` or manual configuration with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_USERS`, followed by starting `hermes gateway`.

The Telegram adapter uses long polling by default, which is the documented fit for a private always-on Orgo computer. Webhooks are not needed and should remain unset. The official security guidance states that users not in an allowlist or approved through DM pairing are denied by default. The owner-provided numeric user ID should be the sole initial allowlist entry. `GATEWAY_ALLOW_ALL_USERS` must remain unset.

The API Server documentation states that the current local API service is enabled through the messaging gateway and defaults to loopback. The existing separate `hermes serve` process therefore needs a compatibility review before adding the messaging gateway, to avoid duplicate gateway or API processes. The gateway should be tested in a controlled mode before altering the proven Supervisor process layout.

Telegram voice messages are automatically handled by the configured Hermes STT provider, while outgoing text-to-speech uses the configured `tts.provider`. ElevenLabs activation remains a later, separate controlled step after text round-trip validation.
