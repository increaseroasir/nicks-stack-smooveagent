# Hermes / Orgo Reliability Benchmark

**Purpose:** Compare the planned Hermes/Orgo assistant with public operator patterns that make persistent AI agents reliable in everyday use.  
**Research date:** 17 August 2026  
**Current project state:** **Design stage only**. The build status is “not started / waiting for owner interview,” so this report evaluates the planned architecture and the selected Nick’s Stack template rather than a live deployment.

## Executive conclusion

Your **core architecture is directionally right**. The strongest choices are already in the blueprint: one Hermes brain rather than several competing assistants, a persistent isolated Orgo computer, Telegram as a fallback interface, 1Password for secrets, and visible desktop control kept as a universal fallback rather than the default for everything. The selected Nick’s Stack fork also brings several valuable operational patterns: a supervised gateway, an authentication/configuration startup gate, a duplicate-process lock, and staged secret activation.

The main difference between a promising “Jarvis setup” and a system that operates smoothly is not a different model or more MCPs. It is the **reliability envelope** around the agent: explicit service supervision, health layers, a durable record for every task and side effect, action-specific approval records, narrow tool permissions by channel, safe retry rules, redacted tracing, and recovery drills.

> The smooth operators do not treat chat history as the system of record. They treat the LLM as a decision-maker inside a controlled execution system with durable state, observable progress, and bounded recovery.

| Area | Your planned direction | What mature operators add | Priority |
|---|---|---|---|
| Agent brain | One persistent Hermes runtime | Keep this; do **not** add another agent brain | Retain |
| Runtime | Persistent Orgo computer | `systemd` supervision, restart policy, readiness checks, and reboot smoke tests | Must add |
| Task execution | Hermes sessions, cron, delegation | Durable task ledger, leases, attempt counts, idempotency keys, and receipts | Must add |
| Tools | Broad Hermes/MCP/browser/desktop capability | Least-privilege tools per channel and action class | Must add |
| Approvals | Smart approvals planned | Persisted, action-bound approvals with expiry and default-deny replay behavior | Must add |
| Computer use | Screenshot → act → verify loop planned | Fresh observations, postconditions, and no blind retry of GUI actions | Must add |
| Observability | Dashboard/tool status planned | Correlated run IDs, redacted traces, health metrics, incident bundles | Add after core |
| Long workflows | Cron and delegation planned | Queue/workflow boundary only when concurrent or multi-hour workflows justify it | Add later |

## What other operators are doing differently

### 1. They operate the agent as a supervised service bundle, not a terminal session

Reliable implementations do not rely on a visible desktop, `tmux`, or a manually launched gateway as proof that the agent is alive. Hermes can run as a Linux service, and the current Orgo agent guide likewise installs a user-level `systemd` service that starts the gateway after boot. Orgo’s guide then verifies the installed runtime with a diagnostic and a gateway-status command rather than simply checking that the VM is online. [1] [3]

Your selected template already demonstrates the right mechanics: it blocks the gateway until configuration and model authentication exist, then takes a lifetime `flock` to prevent duplicate gateways from fighting each other. It documents a real reboot failure caused by a hand-run terminal process and a duplicate-service race. [5] [6]

**What to do differently:** retain this wrapper pattern, but add a formal service contract around it: bounded restart backoff, startup grace period, resource limits, logs in the system journal, and explicit liveness, readiness, and functional probes. A supervisor alone is not enough: an endlessly restarting service is not healthy.

| Health layer | Question it answers | Example check | Automated response |
|---|---|---|---|
| Liveness | Is Hermes process/event loop alive? | Local no-LLM health endpoint or watchdog heartbeat | Restart Hermes gateway only |
| Readiness | Can Hermes accept new work safely? | Model auth loaded; required config present; no migration in progress | Mark unavailable; do not accept work |
| Functional | Can it complete a safe real task? | Telegram ping, read-only MCP call, secret-store read, voice-provider reachability | Alert and isolate failed integration |
| Orgo desktop | Can the computer actually act? | Desktop proxy health plus screenshot smoke test | Restart computer only if desktop health fails |

### 2. They make task state durable and separate it from memory and chat

Current production-oriented agent systems retain more than a conversation transcript. OpenClaw persists scheduler state and run history, detects duplicate runs, uses watchdogs, and reconciles lost or timed-out work. LangGraph separately models resumable checkpoints and long-term stores because in-memory state disappears across restarts. [7] [9]

Your design calls for memory, cron, and delegation, but it does not yet define the operational record that answers: “Was this job completed?”, “Did the CRM update happen?”, “Which approval applies?”, and “Can we safely retry this?” Without that record, a VM restart or network timeout turns real-world side effects into guesswork.

**Add a small durable task ledger before enabling business integrations.** For V1 it can be SQLite on the persistent Orgo disk, in WAL mode with tested backups; this does not require a second agent or a heavy workflow engine. Each inbound Telegram request, dashboard request, cron run, delegated job, and external write should receive a durable `run_id` and a separate `operation_id` for each side effect.

| Record | Minimum fields | Why it matters |
|---|---|---|
| Run | `run_id`, source/channel, owner, request summary, status, timestamps, session link | Reconstructs a task after restart and correlates evidence |
| Tool operation | `operation_id`, tool, target, argument summary, retry class, attempts, result/receipt | Stops duplicate sends and documents what actually happened |
| Approval | `approval_id`, exact action summary, action hash, approver, expiry, decision | Prevents an old or vague “yes” from authorizing a changed action |
| Scheduled job | schedule ID, scheduled fire time, run ID, lease, outcome, next run | Prevents overlap and makes missed executions visible |
| Delegated job | parent/child IDs, budget, timeout, result route, cancellation state | Keeps the main chat responsive and prevents orphan work |

### 3. They classify retries; they do not blindly retry all failures

Durable workflow guidance is clear that a crash or timeout can occur after an external system accepted an action but before the agent recorded success. Temporal therefore treats external activities as effectively at-least-once in many real failures and recommends stable idempotency keys or downstream uniqueness constraints for writes. [8]

This applies directly to Telegram messages, GoHighLevel lead updates, Meta changes, file uploads, and any later Cloudflare deployment. A timeout is an **unknown outcome**, not proof that nothing happened. Orgo’s own MCP guidance follows the same distinction: actions such as shell commands and mouse clicks should receive one attempt because repeating them can be harmful, while provably idempotent reads can be retried with backoff. [4]

| Action class | Examples | Default retry rule | Protection |
|---|---|---|---|
| Safe read | Fetch campaign metrics, check calendar, retrieve page text | Bounded exponential retry | Timeouts and backoff |
| Idempotent write | Set a known field to a known value, create by unique external ID | Retry only with stable idempotency key | Operation ID + reconciliation |
| Unknown outcome | Send a message, create lead/opportunity, upload file | Do not retry automatically | Query destination by operation ID first |
| Non-idempotent/high impact | Spend money, launch ads, delete, change permissions | Never auto-retry | Owner approval + post-action receipt |
| GUI action | Click, type, drag, submit | No blind retry | Fresh screen/DOM observation and verified postcondition |

### 4. They keep the mobile/chat channel deliberately narrow

The selected Nick’s Stack configuration gives Telegram essentially the same broad tool surface as the local CLI: terminal, code execution, browser, desktop control, file access, delegation, and more. It also ships with approvals disabled and hook acceptance enabled. [5] That may be convenient for an advanced single-user demo, but it is not the right default for an agency operator managing messages, ad accounts, CRM data, and revenue-impacting systems.

Hermes’s current documentation instead makes `smart` approval the default, has approvals fail closed on timeout, and defaults headless cron work to denial when it reaches a dangerous command. It also provides channel allowlists, file-write controls, MCP credential filtering, and other layered controls. [2]

**The smooth approach is channel-specific capability, not global autonomy.** Telegram should be fast and useful for read/search, daily briefings, task intake, and approval decisions. High-impact computer control, terminal access, broad filesystem work, credential-adjacent operations, and administrative MCPs should require an explicit approval and preferably be initiated or reviewed from the dashboard/desktop operator channel.

| Channel or role | Default tools | Explicitly gated tools |
|---|---|---|
| Telegram | Search/read, memory retrieval, task intake, schedules, safe summaries | Terminal, code execution, broad filesystem, desktop control, external writes |
| Orb dashboard | Session controls, activity view, approval decisions, safe task dispatch | Secrets, raw VNC credentials, account-level admin actions |
| Hermes worker | Narrow toolset required by the task | Any new MCP, destructive action, broad privileged access |
| Desktop/operator mode | Visible browser and cursor actions for UI-only work | Passwords, 2FA, payments, privileged permission dialogs |

### 5. They make approval a durable action gate, not a conversational convention

OpenHands models a confirmation wait as a first-class execution state, with an explicit pending action and rejection feedback. Hermes likewise routes approvals through defined modes and fails closed on timeout. [2] [10]

For this project, “approve” must mean **approve this exact action on this exact target with this exact summary until this expiry**. An approval card should show the tool, target account/location, summarized inputs, expected side effect, run ID, and expiry. On restart, a pending approval must still map to the same action hash; otherwise the run should return to planning or expire safely.

This is a key difference between operators who run smoothly and demos that feel autonomous until something ambiguous happens. They do not weaken approvals to remove friction. They make approvals quick, specific, persistent, auditable, and easy to resolve from Telegram or the dashboard.

### 6. They use the GUI as a closed-loop fallback with proof of completion

Your plan correctly requires the sequence **screenshot → inspect → act → screenshot → verify → re-plan**. Keep that. The improvement is to make the verification explicit: before the action, confirm the window, domain, and target; after the action, assert the new URL, a created record, changed status, downloaded file, or updated DOM/accessibility state. A successful click API response is not business success.

Orgo’s troubleshooting guidance also distinguishes a healthy computer record from a usable desktop. If actions fail while the computer appears healthy, check the desktop proxy health first; restart the computer only if the desktop health fails, and do not delete the machine because that drops the disk. [4]

> For a future GHL task, “clicked Save” is not evidence. “Fetched the contact after save and found the new field value” is evidence.

### 7. They prioritize graceful degradation over pretending every provider is always available

The selected template has a commented fallback-model block rather than an active, tested degradation design. The planned voice layer similarly needs a defined behavior if STT/TTS is slow, rate-limited, or down. In smoother systems, failures downgrade to a usable mode: text reply instead of voice, queueing a nonurgent task, or presenting a clear offline/pending state instead of silently hanging.

The right first implementation is modest: one chosen model path plus one deliberately configured and tested fallback; text remains the authoritative response channel; ElevenLabs has bounded timeouts and immediate barge-in cancellation; and the dashboard clearly distinguishes `WORKING`, `WAITING_FOR_APPROVAL`, `ERROR`, and `OFFLINE`. Do not add multi-model routing or multiple workers before you have evidence that the base system needs them.

## Recommended lean operating model for your agent

This is the design I recommend building. It preserves the project’s one-agent rule while borrowing the reliability boundaries used by more mature systems.

```text
Owner (Telegram / private orb dashboard)
             │
             ▼
Hermes gateway — supervised with systemd
             │
      ┌──────┼─────────────────────────────┐
      ▼      ▼                             ▼
Run ledger  Approval ledger            Health controller
(SQLite)    (action-bound, expiring)   (Hermes / integrations / Orgo)
      │
      ├── Interactive lane: short, safe owner requests
      ├── Scheduled lane: leased, non-overlapping jobs
      ├── Worker lane: browser/desktop/delegated tasks with time limits
      └── High-impact lane: owner approval → execute once → verify receipt
             │
             ▼
Hermes tools: API/MCP first → browser DOM → terminal → visible Orgo desktop
             │
             ▼
Scoped external systems + 1Password runtime secrets
```

The **ledger is not a new agent brain**. It is a compact operational memory that makes long-running automation safe. Hermes still reasons, plans, and executes; the ledger records what it is allowed to do, what it already did, and whether it can resume safely.

## Build order that will feel smooth fastest

The fastest route to a polished system is not to start with the orb. First make the runtime boringly reliable, then expose it beautifully.

| Phase | Build and test | Exit condition |
|---|---|---|
| 1. Harden the baseline | Fork/pin a known Hermes release; preserve Nick’s supervision, config gate, and lock | Build is reproducible; no secrets committed |
| 2. Replace permissive defaults | Smart approvals; fail-closed cron; narrow Telegram tools; park unapproved MCPs | Telegram cannot trigger unsanctioned privileged work |
| 3. Prove the runtime | Hermes service, model call, persistent state backup, reboot recovery | Reboot returns a healthy gateway without manual terminal work |
| 4. Add the reliability envelope | SQLite run/operation/approval records; idempotency classification; health checks | Every test task has a run ID and terminal state |
| 5. Add interfaces safely | Telegram pairing, then voice with text fallback | Real text and voice round trips; no stale audio overlap |
| 6. Prove computer use | Desktop tool loop with postcondition evidence | Screenshot/click/type/scroll/browser tests pass after reboot |
| 7. Build the orb dashboard | Read-first timeline, approvals, health, task state; authenticated access | Dashboard reflects real gateway state and cannot expose secrets |
| 8. Expand agency integrations | GHL/Meta/Cloudflare one at a time with receipts and approval policy | Each integration passes failure and duplicate-write tests |

## The first reliability acceptance suite

Before adding GHL, Meta, or Cloudflare writes, run these tests against the real Orgo computer. They are more important than dashboard polish.

| Test | Success criterion |
|---|---|
| Gateway crash | Supervisor restores service; no duplicate Telegram delivery; run state is intact |
| Orgo restart | Hermes returns; persistent config, skills, task ledger, and dashboard health are present |
| Desktop failure | System detects desktop health failure; restarts only the computer; retains disk/state |
| Telegram/API timeout | Task is marked `unknown outcome`; destination is reconciled before any retry |
| Scheduled-job overlap | Second scheduled run is skipped/queued while an active lease exists |
| Approval restart | Pending approval survives restart; only exact matching action can execute before expiry |
| ElevenLabs failure | Text reply continues; no stuck `SPEAKING` state; stale audio cannot resume |
| GUI ambiguity | Agent pauses and records evidence instead of clicking again blindly |
| Secret scan | Logs, dashboard payloads, screenshots, repository, and traces contain no raw credentials |
| Backup restore | A clean recovery restores runtime config and task history without restoring secrets into Git/files |

## What to adopt now, later, and avoid

### Adopt now

Adopt supervised Hermes services, the current project’s smart-approval rule, scoped Telegram tools, a one-computer Orgo deployment with proper size, a persistent task/approval ledger, idempotency keys for every external write, three-layer health checks, redacted structured logs, and testable computer-use postconditions. This is a small amount of engineering compared with the cost of duplicate messages, live-campaign mistakes, or an agent that looks online but is wedged.

### Adopt later

Add a formal queue or Temporal-class durable workflow engine only when you have multi-hour workflows, frequent concurrent delegated workers, or cross-machine execution. Add OpenTelemetry infrastructure and a trace backend once logs no longer make it easy to diagnose a run. Add multi-model routing only after measuring provider failures, cost, and latency. Add live Orgo viewing only behind dashboard authentication with server-side credential brokering.

### Avoid

Avoid running the gateway manually in a terminal; enabling every MCP and tool on every channel; copying the template’s disabled-approval settings; treating cron as a full workflow engine; retrying clicks, sends, or CRM writes without reconciliation; exposing Orgo, ElevenLabs, or 1Password credentials to the browser; and treating an LLM response or API success as proof that the business outcome occurred.

## Bottom line

You are not missing a better agent framework. You are missing the parts that make an agent **operable**: a service envelope, a task ledger, narrow authorities, evidence of completion, and a recovery playbook. Build those around Hermes, keep Orgo as the persistent computer, and the resulting system will be materially smoother than most public personal-agent setups while remaining simple enough to manage.

## References

[1]: https://hermes-agent.nousresearch.com/docs/user-guide/configuration "Hermes Agent — Configuration"
[2]: https://hermes-agent.nousresearch.com/docs/user-guide/security "Hermes Agent — Security"
[3]: https://docs.orgo.ai/guides/openclaw "Orgo — Run OpenClaw on an Orgo cloud computer"
[4]: https://docs.orgo.ai/guides/troubleshooting "Orgo — Troubleshooting"
[5]: https://github.com/increaseroasir/nicks-stack-smooveagent "Selected Nick’s Stack fork"
[6]: https://raw.githubusercontent.com/increaseroasir/nicks-stack-smooveagent/main/files/gateway-run.sh "Selected fork — supervised gateway wrapper"
[7]: https://docs.openclaw.ai/gateway/health "OpenClaw — Health checks"
[8]: https://temporal.io/blog/idempotency-and-durable-execution "Temporal — Idempotency and durable execution"
[9]: https://docs.langchain.com/oss/python/langgraph/persistence "LangGraph — Persistence"
[10]: https://docs.openhands.dev/sdk/guides/security "OpenHands SDK — Security and action confirmation"
