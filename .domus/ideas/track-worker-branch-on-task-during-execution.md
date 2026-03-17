# Idea: Track worker branch on task during execution

**Captured:** 2026-03-15
**Status:** raw

---

## The Idea

When a worker picks up a task, record the worktree branch name on the task record (e.g. worker_branch field). Surfaces in domus task show and overview so the human can git log <branch> to monitor progress. Solves the monitoring gap when .domus/ store is split across worktrees — the task record in the main repo is the source of truth for where work is happening.

---

## Why This Is Worth Doing

Without this, there's no way to know which branch corresponds to which task after dispatch. In practice (2026-03-16 session), we had to grep git branches to figure out which worktree held which agent's work. The task record in the main repo should be the single source of truth for where work is happening.

---

## Open Questions / Things to Explore

- Where exactly does the branch get recorded — task frontmatter field `worker_branch`? Or in the execution log?
- Should it also record the worktree path (absolute), or just the branch name?
- What happens to the field after the branch is merged and deleted — clear it, or keep it as history?
- Does this overlap with the execution log (ADR 004) or complement it?
