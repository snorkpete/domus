# Idea: Control worker agent branch names

**Captured:** 2026-03-18
**Status:** raw

---

## The Idea

Worker agents dispatched with `isolation: "worktree"` get auto-generated branch names like `worktree-agent-a2c3d3a6`. These are opaque — you can't tell from a branch list what work lives there. The alternative is to skip `isolation: "worktree"` and have the agent create its own worktree using `git worktree add -b feat/descriptive-name /tmp/path`, giving full control over the branch name.

---

## Why This Is Worth Doing

Readable branch names make the review workflow cleaner — `feat/init-template-refactor` is immediately meaningful, `worktree-agent-a2c3d3a6` is not. This matters more as the number of concurrent workers grows. It also makes cleanup more intentional — you know exactly what to delete after merging.

---

## Open Questions / Things to Explore

- Does the auto-cleanup behavior of `isolation: "worktree"` (cleans up if no changes were made) matter in practice? Workers almost always make changes.
- If we create worktrees manually, who owns cleanup after merge? The human? A post-merge hook? A `domus worktree clean` command?
- Should branch names follow a convention (e.g. `worker/<task-id>`) or be freeform based on the task title?
- Is there a way to pass a desired branch name to the `isolation: "worktree"` Agent tool that we just haven't found yet?
- Would having agents create their own worktrees make prompts too mechanical, or is it a natural part of the worker setup step?
