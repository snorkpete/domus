# Deferred Decisions

Known problems or risks with candidate fixes that we are explicitly waiting on before acting.
Each entry states: the problem, the candidate fix, and the signal we're waiting for.

---

## Stale memory reads in worktrees

**Problem:** Workers run in worktrees. The `@.domus/memory/MEMORY.md` include in `agents.md` resolves relative to the worktree, which is a snapshot at branch-creation time. A worker could read stale project memory if `.domus/memory/` has been updated in main since the worktree was created.

**Candidate fix:** A `domus memory sync` command (or similar) that copies `.domus/memory/` from the main working directory into the worktree, wrapping `git checkout main -- .domus/memory/` or equivalent.

**Waiting for:** A real occurrence where stale memory actually causes a problem in a worker session. Don't build the fix speculatively.
