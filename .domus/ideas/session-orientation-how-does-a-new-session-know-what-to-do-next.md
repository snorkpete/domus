# Idea: Session orientation - how does a new session know what to do next

**Captured:** 2026-03-14
**Status:** raw

---

## The Idea

A new Claude session can run `domus task ready` to find actionable tasks, but that alone isn't enough to orient well. It lacks:
- **Priority signal** — which of the ready tasks should be tackled first, and why
- **Recent decisions** — what was resolved in the last session that affects current work
- **Broader focus** — what area/theme is in flight (e.g. "hardening the domus data layer")

The question is: what's the minimum a new session needs upfront to orient itself without a lengthy human briefing? And how does domus (or memory, or CLAUDE.md) provide it?

Candidate mechanisms:
- A "session start" ritual described in CLAUDE.md — run `domus task ready`, maybe `domus idea overview`, check memory
- A `domus status` command that produces a focused orientation summary (current focus, top priority task, recent decisions)
- Memory entries that capture "current focus" after each session (the session-recap agent already does some of this)
- A `domus focus` concept — an explicit, human-set pointer to the active task or theme that persists across sessions

---

## Why This Is Worth Doing

Every session that starts without orientation wastes time re-establishing context — either through a human briefing or Claude fumbling through files to reconstruct it. At scale, this compounds. A well-oriented session starts with the right task immediately.

This is also a microcosm of a broader AI agent problem: how does a stateless agent efficiently resume stateful work? Solving it well for domus produces a reusable pattern.

---

## Open Questions / Things to Explore

- Is `domus task ready` + good task detail files sufficient, or does something higher-level need to exist?
- Should "current focus" be an explicit persistent concept in domus (like a pinned task/theme), or derived from task state?
- Is a `domus status` orientation command the right abstraction, or does it belong in memory/CLAUDE.md?
- How does the session-recap agent interact with this — should it be responsible for setting up orientation state for the next session?
- What's the cost of a slightly wrong orientation vs. no orientation? (Wrong focus might be worse than no focus)
