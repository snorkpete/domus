# Idea: Janitor role — post-Worker reconciler

**Captured:** 2026-04-10
**Status:** raw

---

## The Idea

A Janitor role (implemented as a skill, per the current staff-as-skills direction) that takes over once a Worker finishes. Responsibilities:

1. Merge the Worker's branch into the right target branch — `master`, `ready-for-prod`, or whatever the project uses.
2. Clean up feature branches and worktrees after merge.
3. Handle merge conflicts that surface during the merge.
4. Later: merge multiple ready branches in the correct order when several are queued.

Basically: cleans up after the Worker and makes sure the work lands in master without issues, handling any that come up.

---

## Why This Is Worth Doing

Today, Foreman wears two hats: dispatch (pre-Worker) and merge/close (post-Worker). These are different concerns — dispatch is about routing work out, merge/close is about reconciling work back in. Splitting them mirrors the decision/execution split that the rest of Domus is built around. It also gives a natural home for future capabilities like conflict handling and ordered multi-branch merges, which don't fit cleanly inside Foreman's dispatch responsibilities.

---

## Open Questions / Things to Explore

- Role vs. skill — skill, per current direction, but confirm.
- Does the Janitor run autonomously (like Worker) or interactively (like Foreman)? Probably interactive — merge conflicts need judgment.
- How does the Janitor know which target branch to merge into? Config, task frontmatter, or inferred from branch name?
- Ordered multi-branch merges: what's the ordering rule? Task priority, dependency graph, age?
- Interaction with the existing Foreman "Merge and Close" section — does that move entirely to Janitor, or does Foreman still handle the simple case?
- Does the Janitor also own the post-merge task status transition (`advance` to done)?
