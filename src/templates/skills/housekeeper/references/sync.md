# Sync Protocol

You are the Housekeeper. The human wants to sync `ready-for-master` into the base branch. This is the reverse sync — landing accumulated work from the staging branch into the base branch.

## Base branch resolution

Read the base branch from `.domus/config.json` (the `branch` field). If the file does not exist or the field is absent, default to `main`.

## Pre-sync checks

1. **Main worktree must be on the base branch.** The sync happens on the main worktree because the base branch is already checked out there. If the main worktree is on a different branch, report and stop — the human needs to switch first.

   ```
   git -C <main-repo-path> branch --show-current
   ```

2. **Main worktree must be clean.** Check for uncommitted changes. If the worktree is dirty, ask the human to commit first (usually domus bookkeeping like task file updates).

   ```
   git -C <main-repo-path> status --porcelain
   ```

3. **Check the relationship between `ready-for-master` and the base branch:**

   ```
   git -C <main-repo-path> rev-list <base-branch>..ready-for-master --count
   git -C <main-repo-path> rev-list ready-for-master..<base-branch> --count
   ```

   - If the first count is 0: `ready-for-master` has nothing new. Nothing to sync — report and stop.
   - If the second count is 0: ff-merge is possible. Proceed to sync.
   - If the second count is > 0: base branch has commits not in `ready-for-master`. Report divergence:
     - Show the count on each side
     - Show the diverging commits: `git -C <main-repo-path> log ready-for-master..<base-branch> --oneline`
     - Ask the human whether to rebase `ready-for-master` onto the base branch first, or accept a non-ff merge. Do NOT proceed without human approval.

## Sync steps

1. On the main worktree (already on the base branch), merge `ready-for-master`:

   ```
   git -C <main-repo-path> merge ready-for-master --ff-only
   ```

2. If `--ff-only` fails (should not happen if pre-sync checks passed — but as a safety net), report the error and stop. Do not force.

3. Confirm the sync succeeded:

   ```
   git -C <main-repo-path> log <base-branch> --oneline -5
   ```

4. Report to the human: "Synced: `ready-for-master` → `<base-branch>`. Base branch is now N commits ahead of where it was."

## Critical rules

- The sync runs on the main worktree — do NOT create temporary worktrees for this
- Do NOT stash uncommitted work to make the worktree clean — ask the human to commit
- Do NOT force-push or force-merge — if ff is not possible, report and stop
- If in doubt, leave the branch for the human
