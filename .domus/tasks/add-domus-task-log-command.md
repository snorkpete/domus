# Task: Add domus task log command

**ID:** add-domus-task-log-command
**Status:** done
**Autonomous:** true
**Priority:** high
**Captured:** 2026-03-15
**Parent:** execution-engine-and-progress-mobility-implementation
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Add the two execution log commands defined in ADR 005. Both commands manage the execution log (`.domus/execution-logs/<id>.md`) and audit log (`.domus/audit.jsonl`) — natural to implement together.

- `domus task start <id> --branch <branch>` — marks task in-progress, records branch on the task, creates the execution log file with a "started" entry
- `domus task log <id> <message>` — appends a timestamped entry to the execution log (`.domus/execution-logs/<id>.md`, version-controlled, task-scoped) and a structured event to the audit log (`.domus/audit.jsonl`, git-ignored, global)

Depends on `add-domus_root-to-domus-init-config` (subtask 2 of the parent epic) because workers running inside worktrees must resolve `.domus/execution-logs/` via `DOMUS_ROOT`, not their own worktree path.

---

## Acceptance Criteria

- [ ] `domus task start <id> --branch <branch>` exists as a subcommand of `domus task`
- [ ] `domus task start` transitions task status to `in-progress` (uses existing `domus task status` logic)
- [ ] `domus task start` records the branch on the task (writes `branch:` field to task frontmatter via task update)
- [ ] `domus task start` creates `.domus/execution-logs/<id>.md` with a timestamped "started" header entry
- [ ] `domus task log <id> <message>` exists as a subcommand of `domus task`
- [ ] `domus task log` appends a timestamped line to `.domus/execution-logs/<id>.md`
- [ ] `domus task log` appends a structured JSON event to `.domus/audit.jsonl` (fields: `id`, `message`, `timestamp`, `branch` if known)
- [ ] Both commands resolve `.domus/` via `DOMUS_ROOT` env var first, then fall back to workspace resolution
- [ ] Tests cover: start creates log file, log appends to existing file, log errors if task not found

---

## Implementation Notes

**DOMUS_ROOT resolution:** `process.env.DOMUS_ROOT ?? resolveWorkspace()`. This is what makes commands work correctly from inside a worktree.

**Execution log format** (markdown, append-only):
```
# Execution Log: <task-id>

## Started
**Branch:** <branch>
**Date:** <ISO timestamp>

---

## <ISO timestamp>

<message>

---
```

**Audit log format** (JSONL, one event per line):
```json
{"id": "<task-id>", "message": "<message>", "timestamp": "<ISO>", "branch": "<branch-or-null>"}
```

**`branch:` field on task:** Does not currently exist in `task-types.ts` — add it as an optional string field. Use `domus task update <id> --branch <branch>` or update the frontmatter directly in `domus task start`.

---

**Outcome:** Command was implemented in feat/rework-domus-init. DOMUS_ROOT resolution fixed via config.json in worker-autonomy-and-execution-model-alignment subtask. Task verified complete.
