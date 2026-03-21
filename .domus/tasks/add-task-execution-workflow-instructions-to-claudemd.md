# Task: Add task-execution workflow instructions to CLAUDE.md

**ID:** add-task-execution-workflow-instructions-to-claudemd
**Status:** raw
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-03-21
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Claude currently jumps straight into coding when a user says "let's work on X task" — even when the task is `raw` with no acceptance criteria. The correct behaviour is: raw tasks should trigger a **discussion to refine the spec**, not an implementation sprint. This task adds instructions that enforce the right workflow.

---

## Acceptance Criteria

- [ ] Instructions added to the project CLAUDE.md (in everycent, which is where domus tasks are consumed) or a referenced doc
- [ ] Instructions cover the full lifecycle: raw → discussion → spec capture → autonomous promotion → background execution → report back
- [ ] The `raw` status is explicitly called out as a signal to discuss, not implement
- [ ] Instructions make clear that the discussion's *output* is a refined task `.md` body (acceptance criteria + implementation notes), not code
- [ ] Instructions reference the existing domus task refinement levels (`raw` → `refined` → `autonomous`)
- [ ] The Linus-hat critical review step before promoting to `autonomous` is included

---

## Implementation Notes

### The problem (observed 2026-03-21)
User said "let's get going on the budget screen migration." Claude read the task, saw it was `raw` with placeholder acceptance criteria, did a good exploration of the Angular/Vue/Rails code, had a brief discussion about scope — then immediately started coding instead of writing the agreed decisions back into the task body and checking whether the spec was complete enough to execute autonomously.

The user's expectation: discuss → refine spec → execute in background → report back. The user should not need to watch Claude code — they should be free to do other work while Claude executes.

### Draft instruction block
The following was discussed and agreed with the user:

```
When the user asks to work on a domus task:
1. Read the task body. If the task is `raw` or has empty/placeholder acceptance criteria,
   your job is to refine the spec through discussion — not to start coding.
2. Research what you need (existing code, API endpoints, reference implementations) and
   bring your findings into the conversation so we can make decisions together.
3. After discussion, write the agreed scope, acceptance criteria, implementation notes,
   and any design decisions back into the task .md body.
4. Propose promoting the task to `autonomous` refinement level. If the user agrees,
   do a critical review of the spec first (the Linus hat).
5. Once autonomous, ask: "Ready for me to execute this in the background?" Then run it
   as a background agent. The user should not need to watch you code.
6. Report back when the task needs the user's attention — typically when implementation
   is complete and ready for testing, or when you hit a blocker that requires a decision.
```

### Where to put it
This should live in the everycent project's `CLAUDE.md` under the existing "Tasks Workflow" section (or near it). It complements the existing refinement-level definitions (`raw` → `refined` → `autonomous`) by describing the *behavioural* workflow Claude should follow when engaging with tasks at each level.

Consider whether this is general enough to also add to domus's own CLAUDE.md template (the one `domus init` would generate for new projects).
