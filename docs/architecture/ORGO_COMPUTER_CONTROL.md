# Orgo Computer Control — REQUIRED

## Requirement
Hermes must be able to operate the actual graphical desktop of its primary Orgo computer autonomously.

This is not optional and must not be replaced by only headless browser automation.

## Required actions
- screenshot
- mouse move
- left click
- right click if supported/needed
- double click
- drag
- type text
- keyboard keys/chords
- scroll
- wait
- open URL in visible Chrome
- bash/shell

## Preferred same-box control plane
Preserve and validate Nick's `orgo-desktop-local` plugin/skill. When Hermes runs inside its own Orgo VM and local desktop health is good, prefer the local Desktop API path over a cloud round trip.

## Required agent loop
```text
SCREENSHOT
→ inspect current visual state
→ choose one or a small bounded set of actions
→ act
→ wait if needed
→ SCREENSHOT AGAIN
→ verify visible result
→ re-plan from actual state
```

Do not treat an HTTP/API success response as proof that the correct UI changed.

## Tool selection policy
1. API/MCP if reliable.
2. Structured browser DOM if the task is ordinary web interaction and no one needs to watch.
3. Terminal/script if deterministic.
4. Headed Orgo desktop when GUI-only, visual verification is needed, OAuth/UI is involved, or owner asks to watch.

## Owner-watch mode
When owner says things like:
- show me
- do it on screen
- let me watch
- use the cursor

Use visible/headed Orgo Chrome/Desktop so the owner can watch in the Orgo viewer.

## Authentication boundaries
Do not autonomously enter or approve:
- passwords
- 2FA codes
- payment details
- privileged permission dialogs
unless the owner is explicitly participating and the project authority policy permits it.

## Required real tests
- SCREENSHOT: PASS
- MOUSE MOVE: PASS
- LEFT CLICK: PASS
- DOUBLE CLICK: PASS
- DRAG: PASS
- TYPE: PASS
- KEYBOARD SHORTCUT: PASS
- SCROLL: PASS
- OPEN CHROME: PASS
- NAVIGATE WEBSITE VISUALLY: PASS
- CLICK BUTTON AND VERIFY SCREEN CHANGE: PASS
- REBOOT AND RETEST COMPUTER CONTROL: PASS

## Dashboard future use
The orb dashboard may expose a `View Computer` panel using Orgo's VNC/embed path. Account API key stays server-side; fetch fresh per-computer VNC credentials after restarts.
