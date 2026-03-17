# Idea: Parallelise session recap with specialised subagents

**Captured:** 2026-03-17
**Status:** raw

---

## The Idea

Split the session recap into multiple subagents running in parallel, each owning a different concern — memory, behaviour/feedback, project state, etc. — so recaps are faster and each subagent has a tighter, more focused context.

---

## Why This Is Worth Doing

The current recap is a single agent handling everything — its context grows with the conversation, and important details risk being missed or diluted. Specialised subagents keep each one focused and reduce that risk. Parallelism also means the recap completes faster, which matters at the end of long sessions. This aligns with the broader Domus principle of focused, single-responsibility agents over monolithic ones.

---

## Open Questions / Things to Explore

- What are the right subagent boundaries? Memory / feedback / project state is a starting point — are there others?
- How do subagents avoid conflicting writes (e.g. two agents both updating MEMORY.md)?
- Does the orchestrating skill need a final consistency pass, or can subagents be fully independent?
- Does this require session recap to become a proper skill (vs an agent) to support subagent spawning?
- One subagent should be responsible for capturing "what's next" — the specific task or step to pick up next session. The current single-agent recap misses this even when the human has stated it explicitly in conversation.
