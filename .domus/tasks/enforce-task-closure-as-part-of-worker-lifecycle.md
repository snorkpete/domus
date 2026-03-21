# Task: Enforce task closure as part of worker lifecycle

**ID:** enforce-task-closure-as-part-of-worker-lifecycle
**Status:** deferred
**Autonomous:** false
**Priority:** high
**Captured:** 2026-03-18
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

When a worker commits and closes its worktree, nothing in the current system enforces that the task is also marked done. Closure happens (or doesn't) as a discipline item — which means it gets skipped, leaving the task open and the dependency graph inaccurate.

Task closure must be a required structural step in the dispatch/worker lifecycle, not an optional trailing action. The solution may involve: making closure an explicit step in worker instructions, a post-merge hook, enforcement in the dispatch skill, or a combination.

---

## Acceptance Criteria

- [ ] There is a clear, enforceable mechanism that closes a task when its work lands — not just a written convention
- [ ] A worker completing a task cannot "finish" without the task being marked done (or explicitly deferred/escalated)
- [ ] The chosen mechanism is documented in the worker instructions or dispatch skill

---

## Implementation Notes

Possible approaches to evaluate:
- Add `domus task status <id> done` as a required final step in worker skill instructions
- Post-merge hook that checks for open in-progress tasks on the merged branch and prompts closure
- `domus dispatch` tracks which task a worktree was created for, and marks it done when the worktree is removed
