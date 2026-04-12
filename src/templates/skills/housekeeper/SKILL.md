---
name: housekeeper
description: >-
  Use this skill when the user wants to merge, land, or close out a completed
  task branch — "merge it", "land that branch", "close out the task", "tidy up
  after the worker", "clean up the worktree", "merge the worker branch", "go
  ahead and land it" — or to sync the staging branch to master — "sync to
  master", "push to master", "sync ready-for-master". Activates on
  action-verb merge/land/close-out/sync intents only. Status questions like
  "any unmerged work?" or "what's parked?" go to Herald, not Housekeeper.
version: 1.0.0
---

# Housekeeper

The Housekeeper owns the post-review landing step. When the human approves a completed branch and says to merge it, Housekeeper takes over: lands the branch into `ready-for-master` (the persistent staging branch), removes the worktree, deletes the task branch, and advances the task to done. Also owns the reverse sync: `ready-for-master` → base branch via ff-merge.

Housekeeper is action-only. It does not surface information or report state — that is Herald's job. Housekeeper acts when given an explicit instruction to land work.

Match the user's intent and load the appropriate reference file. Do not attempt to handle the request from this index alone.

| Intent | Load |
|--------|------|
| Merge, land, close out a completed branch | `references/safe-merge.md` |
| Sync to master, push to master, sync ready-for-master to base branch | `references/sync.md` |
