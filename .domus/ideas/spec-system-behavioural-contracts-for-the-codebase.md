# Idea: Spec system - behavioural contracts for the codebase

**Captured:** 2026-03-14
**Status:** raw

---

## The Idea

Specs describe how the system *should* behave (desired state). Combined with the current state (code, personas, skills), they give Claude enough to diff the two and generate a coherent task set automatically — eliminating the busywork of manually reviewing and creating tasks whenever the system design changes significantly.

The workflow:

1. **Oracle** sharpens the idea into a written spec — precise enough to generate tasks from
2. **Claude** diffs spec against current state (code + personas + skills), generates tasks and subtasks, asks where unclear
3. **Taskmaster** refines the generated tasks one by one, especially the ambiguous ones
4. **Worker** executes

The spec becomes the source of truth for desired behavior. The task list is a derived artifact, not the thing humans maintain by hand.

A two-folder model (`future/` and `current/`) may make sense for promoting spec changes atomically on task completion — but granularity and format are open questions. A self-healing Doctor system catches drift between spec and code.

---

## Why This Is Worth Doing

Manual task review after a design change is expensive and error-prone — tasks go stale, new ones get missed, and reconstructing desired behavior from memory degrades over time. A written spec gives Claude a stable, precise target to work from. The human declares intent; Claude figures out how to get there and asks only where genuinely unclear. More declarative, less busywork.

---

## Open Questions / Things to Explore

- What format makes a spec precise enough to diff against code, but not so rigid it becomes maintenance overhead?
- Does Oracle own spec production, or is there a distinct spec-authoring step?
- Is the diff step a Taskmaster capability, a standalone skill, or something else?
- How does spec granularity interact with task granularity — one spec per feature? per subsystem? per role?
- What happens when code drifts from spec — does Doctor catch it?
- Validate after execution engine is in place before investing further
