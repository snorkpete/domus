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

### Dependency-ordered (topological) display — folded in from everycent idea `dependency-ordered-task-display-in-domus-overview` (2026-06-21)

The everycent backlog held a closely-related idea (this is its proper home). Its core proposal: **within each status group, sort tasks in topological order** based on `--depends-on` chains — a task that blocks others appears first, dependents after, so the ordering itself communicates "do this first, then this, then this."

Key argument: for a solo dev where everything's in one list, topological ordering within categories **mostly replaces the separate "Blocked" section** — if B depends on A and both are in the same status, B just shows after A; you don't need a bucket to tell you B is blocked. Keep "Blocked" only for blocks *outside* the current view (other project / other owner).

Additional open questions from that idea:
- Should `domus task ready` also use topological ordering within its actionable set?
- Circular dependencies — detect and warn.
- Do dependency-free tasks float to the top or bottom of their group?
- Show the dependency chain visually (indentation / tree lines) or is flat ordering enough?
- Remove the Blocked section entirely, or keep it only for cross-project/cross-owner blocks?

(NOTE: current `domus task overview` already shows dependency glyphs `▲`/`▼`/`·` and has dropped a standalone Blocked section — so this may be partially done. Verify whether true topo-sort within groups exists before scoping.)
