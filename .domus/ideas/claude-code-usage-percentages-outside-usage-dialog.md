# Idea: Claude Code usage percentages outside /usage dialog

**Captured:** 2026-03-15
**Status:** raw

---

## The Idea

Make the 5-hour window and weekly usage percentages that Claude Code shows in `/usage` accessible from a shell script or `domus usage` command — something that can be polled in a watch loop without opening an interactive Claude session.

---

## What We Know So Far

- `/usage` is a client-side built-in — no tokens consumed
- Anthropic only exposes percentages, not raw numbers or limit values, so local `.jsonl` files can't compute the percentage (denominator unknown)
- The endpoint is almost certainly `https://claude.ai/api/oauth/usage` (found 3 times in the Claude Code binary)
- Auth token lives in macOS keychain under `"Claude Code-credentials"` — retrievable via `security find-generic-password -s "Claude Code-credentials" -w`
- Raw curl is blocked by Cloudflare; Claude Code satisfies the challenge via its native TLS stack

---

## Why This Is Worth Doing

The `/usage` dialog is only accessible interactively. A shell-callable version would let you monitor burn rate over time, add it to a status bar, or trigger alerts before hitting limits mid-session.

---

## Open Questions / Things to Explore

- Confirm the endpoint URL and response shape by intercepting Claude Code's network traffic with mitmproxy or Charles
- Does the response include raw counts + limits, or just percentages?
- Are there additional required headers (cookies, session tokens) beyond the Bearer token?
- Once the shape is known: is this a `domus usage` subcommand, a standalone script, or both?
- Could a Playwright/headless browser approach satisfy Cloudflare without a full proxy setup?
