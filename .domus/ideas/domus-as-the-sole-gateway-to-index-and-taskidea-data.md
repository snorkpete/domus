# Idea: Domus as the sole gateway to index and task/idea data

**Date:** 2026-03-14
**Status:** raw

---

## The Idea

Think through all the flows in the domus/Claude system and establish a clear rule: index files (`tasks.jsonl`, `ideas.jsonl`) are never read directly into Claude's main context. The `domus` CLI is the only way to access or mutate that data. Individual task/idea markdown files should only be loaded into context when a text edit genuinely requires it — and even then, prefer delegating to a subagent so the main session stays clean.

The flows to examine:
- **Listing tasks/ideas** — already CLI-mediated (`domus task list`, `domus idea list`)
- **Status updates** — should go through `domus task/idea status`; once the CLI also updates the md frontmatter (separate task), Claude never needs to touch these files for status changes
- **Capturing new tasks/ideas** — CLI creates both files; Claude enriches the md body if needed (acceptable main-context load since it's a new file being authored, not an index scan)
- **Reading task/idea details for planning** — currently Claude reads the md file directly; could a `domus task show <id>` command mediate this, or is direct read acceptable here?
- **Bulk reads (e.g. overview, what's next)** — should always go through CLI commands, never by reading JSONL files

---

## Why This Is Worth Doing

Index files are machine-readable stores, not Claude-readable documents. Loading `tasks.jsonl` or `ideas.jsonl` into context is wasteful (token cost), fragile (Claude might mutate them incorrectly), and breaks the abstraction boundary. The CLI is the right interface — it validates, formats, and mutates correctly. Enforcing this pattern also makes it easier to evolve the storage format without updating skill instructions.

### The deeper motivation: context pollution and the interactive/non-interactive split

Domus is itself a learning project — the goal is to understand what works, what doesn't, and what to watch out for when building around an AI agent. A core hypothesis being tested:

**Interactive sessions** (Oracle, Butler, planning conversations) are where the value is — the user *wants* to talk to Claude. In those sessions, context should be reserved entirely for that conversation. Any domus housekeeping that leaks in (reading index files, loading task markdowns, writing status updates) pollutes the space where thinking happens.

**Non-interactive sessions** (task execution, dispatch, automated updates) are where Claude acts. Context management matters less there because there's no conversation to protect.

Subagents are a candidate solution to the context pollution problem in interactive sessions: delegate housekeeping work to a subagent that opens, does its job, and closes — leaving the main session untouched. If this works well for domus, it becomes a validated pattern applicable to other contexts where the same tension exists.

This is the primary reason to try subagent delegation at this stage — not just code cleanliness, but validating a potential building block for a broader pattern.

---

## Open Questions / Things to Explore

- Should `domus task show <id>` / `domus idea show <id>` exist to print a formatted detail view, so Claude never needs to `Read` the md file directly? **Answered: yes — this is the goal. Keeps file sizes a non-concern since Claude never loads them directly.**
- Which flows actually require reading the md body vs. just the index fields? (Planning/scoping probably does; status updates do not)
- Is subagent delegation for md text edits worth the complexity? **Answered: yes — the point is to validate this as a pattern for context pollution in interactive sessions. Try it even if imperfect.**
- Should the CLAUDE.md or skill instructions explicitly prohibit reading JSONL files directly?
- How does this interact with the Oracle session, which likely needs to read idea details to refine them? **Answered: Oracle is a prime candidate to test the subagent approach — it's an interactive session where context preservation matters most, but it still needs domus data. If subagents can mediate that cleanly, the pattern is validated.**
