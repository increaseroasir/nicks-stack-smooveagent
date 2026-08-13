# Lil Smoove Orb Dashboard

This directory is the source-controlled deployment package for the existing Lil Smoove voice dashboard at [smoove.increaseroas.ai](https://smoove.increaseroas.ai).

## What this Worker does

The Cloudflare Worker named `lil-smoove-orb` serves only the custom dashboard shell at `/` and immutable frontend assets under `/ui/*`. It intentionally returns `404` for every other route so the existing Cloudflare routing can pass Hermes traffic to the persistent Orgo computer.

| Route | Owner |
|---|---|
| `/` and `/ui/*` | `lil-smoove-orb` Worker in this directory |
| `/api/audio/transcribe` | Hermes dashboard backend on Orgo |
| `/api/audio/speak` | Hermes dashboard backend and ElevenLabs on Orgo |
| `/api/auth/ws-ticket` | Hermes dashboard backend on Orgo |
| `/api/ws` | Secure Hermes WebSocket bridge on Orgo |
| `/chat` | Native Hermes dashboard on Orgo |

## Recovery provenance

The live Worker was originally deployed directly through the Cloudflare API from a prior Manus build environment and was not connected to GitHub. On 2026-08-13, the active production Worker package was downloaded through Cloudflare's authenticated Workers API and decomposed into:

| Path | Purpose |
|---|---|
| `public/` | Exact active dashboard shell, compiled UI, styles, and media |
| `src/worker-template.js` | Readable static-shell Worker boundary |
| `scripts/build-worker.mjs` | Deterministic Worker packager |
| `scripts/verify-production.mjs` | Asset and Worker integrity verification |
| `recovery/production-active-worker.js` | Byte-exact active Worker package at recovery time |
| `recovery/dashboard-bundle.pretty.js` | Beautified compiled React bundle with original source-location markers |
| `recovery/production-*.json` | Non-secret hashes and deployment provenance |

The original React/TypeScript project directory was not present in GitHub. The exact deployed behavior is preserved here first; future source refactoring should happen separately and must pass visual, voice, API-route, and production-parity tests before deployment.

## Commands

```bash
npm install
npm run check
npm run deploy
```

`npm run check` rebuilds the Worker and verifies every recovered production asset before any deployment. `wrangler.jsonc` uses `keep_vars: true` so an ordinary deployment does not remove the existing encrypted Cloudflare secret.

## Security boundaries

**Never commit secrets.** The `HERMES_DASHBOARD_SESSION_TOKEN` value remains an encrypted Cloudflare Worker secret and is not present in this repository. ElevenLabs and Hermes credentials remain on the server side. Browser code uses same-origin endpoints and never receives privileged Orgo credentials.

Do not add handlers for `/api/*`, `/chat`, or WebSocket upgrades to this Worker. Those routes belong to Hermes on Orgo and are part of the existing production connection model.
