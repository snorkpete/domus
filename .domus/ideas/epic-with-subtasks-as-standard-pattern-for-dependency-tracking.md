# Idea: Epic with subtasks as standard pattern for dependency tracking

**Captured:** 2026-03-19
**Status:** raw

---

## The Idea

When a piece of work is large enough to decompose into focused subtasks, establish a standard structure:

- Create one parent "epic" task that holds the big-picture view
- Create N focused subtasks as the actual work items
- The epic uses `depends-on` to list all subtasks — so the epic can only be closed once all subtasks are complete
- Each subtask references its parent epic in its description, so workers know where to find wider context they don't need to carry themselves

Workers operating on a subtask should check the parent epic when they need context that isn't in the subtask itself (rationale, overall scope, sibling work, etc.).

---

## Why This Is Worth Doing

- **Big-picture always queryable** — the epic is a permanent reference for the full scope of the work, even as individual pieces are completed
- **Subtasks stay focused** — a subtask describes exactly what it's responsible for without duplicating the whole design
- **Natural closure gate** — the epic can't be marked done until all subtasks are done; no manual tracking needed
- **Context mobility** — any worker in any session can pick up a subtask and immediately know how to find the full picture
- **Audit trail** — even after subtasks are done, the epic remains as a historical record of how the work was structured

---

## Open Questions / Things to Explore

- Should this be a CLI convention (e.g. `domus task add --parent <epic-id>`)? Or just a documentation convention for now?
- Does `depends-on` semantically mean "I can't be closed until these are done" (closure dependency) or "I can't start until these are done" (start dependency)? For epics, we want closure dependency — need to verify this is how the field is interpreted.
- Should `task overview` or `task list` visually indicate parent/child relationships?
- When should epics appear in the Autonomous vs Supervised section? An epic with all-autonomous subtasks probably should appear autonomous too.
- Is there a meaningful distinction between "epic" (work grouping) and a regular task that has `depends-on`? Or should we just use tasks + `depends-on` and call it an epic by convention only?
