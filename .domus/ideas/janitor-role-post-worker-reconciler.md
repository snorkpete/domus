# Idea: Housekeeper enhancements — post-Worker reconciliation

**Captured:** 2026-04-10
**Status:** raw

---

## The Idea

Enhancements to the existing Housekeeper skill for more advanced post-Worker scenarios. The Housekeeper already handles basic merge/land and worktree cleanup. This idea covers the next tier:

1. Handle merge conflicts that surface during the merge (currently requires human intervention).
2. Ordered multi-branch merges when several worker branches are queued.
3. Smarter target branch resolution from config, task frontmatter, or branch naming conventions.

---

## Why This Is Worth Doing

Housekeeper currently handles the happy path (clean merges, worktree cleanup). As more tasks run autonomously, conflict resolution and merge ordering become real friction. These capabilities don't need a new role — they're natural extensions of what Housekeeper already does.

---

## Open Questions / Things to Explore

- Ordered multi-branch merges: what's the ordering rule? Task priority, dependency graph, age?
- Conflict resolution: how much autonomy? Probably interactive — merge conflicts need judgment.
- Does this change the Housekeeper's current scope (merge + close + sync), or is it additive?
