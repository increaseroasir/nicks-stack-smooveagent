# Public Repository Boundary

This repository contains reusable, public-safe source code and documentation for a Hermes agent running on an Orgo cloud computer. It must remain useful to others without becoming a copy of any one operator’s live environment.

## May be committed

Source code, reproducible deployment scripts, configuration templates with placeholders, architecture diagrams, tests, runbooks, sanitized example logs, and public documentation may be committed. Environment variable names, secret-reference paths, and capability descriptions are allowed; secret values are not.

## Must never be committed

Never commit API keys, OAuth tokens, 1Password service-account tokens, bot tokens, passwords, cookies, browser profiles, VNC passwords, private keys, user transcripts, screenshots containing private data, production database files, runtime session/memory stores, task ledgers, unredacted logs, or environment-specific machine identifiers.

## Runtime boundary

The repository is the build blueprint. The persistent Orgo computer runs the agent and keeps live state. A secret manager such as 1Password supplies narrowly scoped runtime credentials. The dashboard backend brokers privileged connections; no account-level credentials are exposed to browser code.

## Contribution standard

Before every public commit, run a secret scan and review the diff. New integrations should ship disabled or with documented placeholders until the operator deliberately configures and tests them. High-impact actions must retain explicit approval and verification behavior.
