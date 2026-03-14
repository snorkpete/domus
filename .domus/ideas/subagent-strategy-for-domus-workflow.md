# Idea: Subagent Strategy for Domus Workflow

**Date:** 2026-03-14
**Status:** raw

---

## The Idea

Define a deliberate strategy for where Claude subagents fit into the domus/Oracle workflow. The core tension: subagents isolate context (preventing pollution of the main session), but each one starts fresh — you lose accumulated context from the conversation. The goal is to identify which workflow steps are good candidates for delegation vs. which need to stay in the main session.

Candidate steps to evaluate:
- **Idea refinement / Oracle sessions** — currently launched as a separate Claude Code process via `domus idea refine`, which is effectively already a subagent pattern
- **Task scoping** — converting a refined idea into a task list; could be done by a scoping subagent that reads the idea file and emits tasks
- **Task dispatch / execution** — already partially supported via `domus dispatch`; subagents could execute individual tasks autonomously
- **Code review** — already done via the `senior-code-reviewer` agent; well-suited since it needs only file context, not conversation history
- **Research / exploration** — subagents prevent noisy `find`/`grep` results from cluttering the main session

---

## Why This Is Worth Doing

As the domus system grows, the main Butler/Oracle session will accumulate more context. Without a deliberate strategy, every step runs in the same session, making it bloated and expensive. Subagents let us:
- Keep the main session focused on decision-making
- Run parallelisable work (e.g. multi-file review, research) faster
- Isolate failure — a subagent crash doesn't kill the main session

The risk of overusing subagents is losing continuity. Getting this right is architectural.

---

## Open Questions / Things to Explore

- Which steps genuinely need conversation history vs. just file context?
- What's the right handoff protocol — does the subagent write results to a file, or return them inline?
- Should subagents be invoked from skills, from the CLI, or both?
- How do we handle subagent failure gracefully (retry, surface to user, etc.)?
- Is there a pattern for "subagent that writes its output to `.domus/`" so results persist across sessions?
- Does the Oracle session itself benefit from being a subagent, or does it need to be a peer session?
