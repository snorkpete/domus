# Idea: Auto pipeline observability and control plane

**Captured:** 2026-03-15
**Status:** raw

---

## The Idea

How does the human see what's actively going on with auto tasks? Two sides:

**Data and controls:** Current state (what's running, what's queued, what's stalled), recent history (what completed, what failed), and controls (re-prioritize, trigger retry, inspect). Data inputs already exist: worker branch on task, execution logs, audit.jsonl, task status.

**UX surface:** What's the right interface — task watch, a dedicated pipeline view, terminal output, something else? What does an operator need to feel in control of autonomous work happening on their behalf? "Last 5 done in overview" was one narrow suggestion — the real question is broader.

---

## Why This Is Worth Doing

_To be filled in._

---

## Open Questions / Things to Explore

- What's the right surface: extend task overview/watch, or a dedicated `domus pipeline` view?
- How much of this is already covered by Herald + task overview + execution logs?
- What's the minimum viable observability that makes autonomous dispatch feel safe?
