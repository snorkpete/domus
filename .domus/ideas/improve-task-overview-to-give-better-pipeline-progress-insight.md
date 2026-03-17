# Idea: improve task overview to give better pipeline progress insight

**Captured:** 2026-03-16
**Status:** raw

---

## The Idea

The current overview is a good first step but lacks nuance — no distinction between actively-in-progress, awaiting-review, and blocked, and the tree structure for blocked tasks raises questions about deeper dependency chains.

---

## Why This Is Worth Doing

The overview is the primary real-time status board. If it's ambiguous or incomplete, the human has to do mental work to interpret what's actually happening — which defeats the point of context mobility. Getting this right is foundational to the whole workflow.

---

## Open Questions / Things to Explore

- **Actively in-progress vs awaiting review**: no distinction between "worker running now" and "worker done, branch sitting in worktree waiting for human review". Both look `open`. Need a state or visual treatment for each.
- **Dependency depth**: current tree shows one level of blockers. What if a blocker is itself blocked? Does the tree recurse? At what depth does it become noise?
- **In-progress tasks**: should tasks marked `in-progress` have their own section, or be called out within Supervised/Autonomous?
- **Worktree visibility**: should the overview show which tasks have active worktrees (dispatched but not yet merged)?
- **Section order**: does Autonomous → Blocked → Supervised remain right as autonomous execution becomes the norm?
