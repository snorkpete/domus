# Task: Worker autonomy and execution model alignment

**ID:** worker-autonomy-and-execution-model-alignment
**Status:** done
**Autonomous:** true
**Branch:** task/worker-autonomy-and-execution-model-alignment
**Priority:** high
**Captured:** 2026-03-19
**Parent:** align-execution-pipeline-with-adr-004005-design
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Set up the execution infrastructure in `domus init` and fix path resolution across all commands to match ADR 004 (domus store and worker logging). This is subtask 2 of the `align-execution-pipeline-with-adr-004005-design` epic — check the parent for the full audit context.

The init command doesn't create the directories or config that workers depend on. The current `projectRoot()` path resolution walks up from cwd — in a worktree, this finds the worktree's `.domus/` copy instead of the main store. DOMUS_ROOT (stored in a config file) is the foundation for all worker logging and cross-worktree command correctness.

---

## Acceptance Criteria

- [ ] `domus init` writes a config file (`.domus/config.json`) with two fields: `root` (absolute path to main `.domus/` directory) and `branch` (current git branch at init time — the branch `.domus/` lives on)
- [ ] `domus init` creates `.domus/execution-logs/` directory (added to `DOMUS_DIRS`)
- [ ] `domus init` creates `.domus/audit.jsonl` (empty, git-ignored — add to `.gitignore` or `.domus/.gitignore`)
- [ ] All domus commands resolve the `.domus/` path by reading `root` from config first, falling back to workspace resolution — replacing the current `projectRoot()` walk-up (which finds the worktree's `.domus/`, not the main store)
- [ ] Commands that compare against a base branch (e.g. `worktreeHasNewCommits`) read `branch` from config rather than hardcoding any branch name
- [ ] Verify `domus task start` and `domus task log` (implemented in subtask 1) correctly use config-based resolution — the subtask 1 worker used `projectRoot()` which is wrong in worktree context; fix if so

---

## Implementation Notes

**Config file location:** `.domus/config.json` — version-controlled, written by `domus init`, readable by all commands.

```json
{
  "root": "/absolute/path/to/repo/.domus",
  "branch": "main"
}
```

The `branch` field is recorded at `domus init` time from `git rev-parse --abbrev-ref HEAD`. If the user is on a long-lived feature branch when they run `domus init`, that branch becomes the base. To change it, re-run `domus init` or edit the config directly.

**Why `projectRoot()` is wrong in worktrees:** Git worktrees each have their own working tree. `projectRoot()` walks up from `cwd` looking for `.domus/` — in a worktree, it finds the worktree's copy. All writes must go to the main store (`root` from config), not the worktree copy.

**ADR 004 key points:**
- All writes from workers go to the main `.domus/` via config `root` — never to the worktree's copy
- Worker status files (`.domus/workers/<id>.json`) are not part of the design — remove any remaining references
