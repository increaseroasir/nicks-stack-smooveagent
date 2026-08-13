# OWNER PHASE CARD — Honest Orb Console production Worker

Business result: Live `https://smoove.increaseroas.ai` serves the Honest Orb Console asset (`index-d5d375f4.js`) so the orb stops lying about channel, voice, and approval.

Will touch:
- Cloudflare account `a3f549867f040e13df33e5bd18f785f4` (Alex@increaseroas.com)
- Worker name `lil-smoove-orb` only
- Action: replace script content with `apps/orb-dashboard/dist/worker.js` (`sha256=b3238414cd4e0d45c0dc791f1dc5f3634df616d705844d80963fce20d6d02b96`)
- Method: content-only upload (do not rewrite routes, bindings, or secrets)

Will NOT touch:
- Orgo filesystem or Telegram
- Worker routes (`smoove.increaseroas.ai/` and `smoove.increaseroas.ai/ui/*` only)
- Secret `HERMES_DASHBOARD_SESSION_TOKEN`
- `/api/*`, `/chat`, WebSocket upgrades
- Other Workers on this account
- `sun-pool-spa`, spend, DNS, Access policy
- Live Talk / send / approve

Proof of success:
- [x] `npm run check` PASS on this package
- [x] Live Worker version `392abfe0-25e0-45a3-ad40-67b3ade88bee` at 100% (deployment `f1432c89-3221-462a-8579-9dfd729b3262`)
- [x] Live script contains `index-d5d375f4.js` and does not contain `index-DrSg8VbT.js`
- [x] Settings still list secret `HERMES_DASHBOARD_SESSION_TOKEN`
- [x] Routes still only `/` and `/ui/*`
- [x] Codex already GO on the repo patch set

Rollback: redeploy Worker version `baf2e2d8-e9c3-40dd-ae9f-348ca239ef43` (pre-honest-orb capture).

Cost ceiling: one Worker content upload. Stop if routes or the session secret would change.

Approval: `APPROVE PHASE honest-orb-console-prod-worker b3238414` — owner said "yes deploy".

Next if PASS: Orgo script-copy card (Telegram lock / recover.sh). Not this card.
Next if FAIL: owner decision card. Do not retry a second production write.
