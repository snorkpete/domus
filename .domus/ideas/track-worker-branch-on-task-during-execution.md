# Idea: Track worker branch on task during execution

**Captured:** 2026-03-15
**Status:** raw

---

## The Idea

When a worker picks up a task, record the worktree branch name on the task record (e.g. worker_branch field). Surfaces in domus task show and overview so the human can git log <branch> to monitor progress. Solves the monitoring gap when .domus/ store is split across worktrees — the task record in the main repo is the source of truth for where work is happening.

---

## Why This Is Worth Doing

_To be filled in._

---

## Open Questions / Things to Explore

- _Add open questions here_
