# Security and Authority

## Default principle
Observation can be broad within authorized systems. Material external effects require explicit authority.

## Hermes baseline
Use current Hermes smart approvals, not global YOLO/off mode.

Target:
```yaml
approvals:
  mode: smart
  timeout: 300
  cron_mode: deny
  mcp_reload_confirm: true
  destructive_slash_confirm: true
```

## Allowed without repeated owner confirmation, once the system is connected and policy allows
- read/search approved systems
- inspect files/logs
- research public web
- summarize information
- take screenshots
- harmless navigation
- local test-file creation/deletion inside a designated test/work area
- read-only integration smoke tests

## Must request explicit owner approval unless the owner changes this policy
- send email/messages to real people
- publish posts/content
- spend money
- create paid resources
- launch/modify live ad campaigns
- delete production data
- force-push or destructive Git operations
- change account permissions/security
- approve OAuth scopes with unexpectedly broad access
- submit legal/financial forms
- irreversible external changes

## Cron policy
Headless scheduled work should fail closed on dangerous commands. Do not auto-approve destructive actions in cron context.

## Secrets
Never put raw secrets in:
- project markdown
- Git commits
- dashboard frontend
- screenshots shared publicly
- logs
- final reports

## Browser/dashboard
- Authenticate the dashboard.
- Keep `ORGO_API_KEY` server-side.
- Keep `ELEVENLABS_API_KEY` server-side.
- If browser-side realtime STT needs provider access, use short-lived/single-use tokens where supported.

## Computer-use guardrail
Computer control is allowed, but credentials, 2FA, payments and privileged permission dialogs require owner participation unless explicitly authorized.
