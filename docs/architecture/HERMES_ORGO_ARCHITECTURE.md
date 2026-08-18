# Master Architecture

## Locked V1 architecture

```text
OWNER
  |
  +-- Private Orb Dashboard
  |      |
  |      +-- microphone / realtime STT
  |      +-- live transcript
  |      +-- Hermes streaming events
  |      +-- approval UI
  |      +-- tool/subagent status
  |      +-- ElevenLabs streaming TTS
  |      +-- optional embedded Orgo desktop viewer
  |
  +-- Telegram
          |
          v
       HERMES
          |
          +-- sessions
          +-- memory
          +-- skills
          +-- terminal/files
          +-- browser tools
          +-- delegation
          +-- cron
          +-- Kanban
          +-- MCP/plugins
          +-- approvals
          |
          +-- Nick's Stack orgo-desktop-local
          |
          v
       ORGO COMPUTER
          |
          +-- visible Linux desktop
          +-- Chrome
          +-- local Desktop API
          +-- persistent disk
          +-- VNC/noVNC
          +-- 1Password secret plane
          +-- Composio and approved integrations
```

## Custom dashboard protocol
For a rich custom UI, prefer Hermes TUI Gateway JSON-RPC over WebSocket because it exposes fine-grained sessions, streaming events, approvals, slash commands and multi-agent state. Use the OpenAI-compatible HTTP/SSE API only for surfaces where that simpler protocol is a better fit.

## Computer-use hierarchy
1. Native API/MCP when reliable and authorized.
2. Structured Hermes browser/DOM tools for web tasks.
3. Terminal/script when deterministic.
4. Same-box Orgo local desktop control for visible GUI work and universal fallback.
5. Cloud Orgo API/MCP for lifecycle and other Orgo computers.

## Why this hierarchy
GUI clicking is flexible but less deterministic than structured APIs. It must exist as a fallback, not replace better interfaces.

## One-agent rule
Do not create separate brains for Telegram, dashboard, ElevenLabs, or computer use. They are interfaces/tools around the same persistent Hermes assistant.
