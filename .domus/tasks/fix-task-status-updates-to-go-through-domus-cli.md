# Task: Fix task status updates to go through domus CLI

**ID:** fix-task-status-updates-to-go-through-domus-cli
**Status:** done
**Autonomous:** true
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Skills and Claude currently update task status by editing markdown files directly, bypassing domus task status and leaving tasks.jsonl out of sync. Fix by ensuring domus task status works correctly and updating skill instructions to shell out to the CLI.

---

## Acceptance Criteria

- [ ] `domus task status <id> <status>` correctly updates both `tasks.jsonl` and the detail `.md` file (or at minimum the JSONL — the md file is secondary)
- [ ] The `/update-task-status` skill instructions tell Claude to run `domus task status` rather than editing files directly
- [ ] The `fix-domus-cli-access-in-claude-code-bash-tool` task's status is corrected in `tasks.jsonl` (it was manually edited, leaving the index stale)

---

## Implementation Notes

Root cause: `domus task status` currently only updates `tasks.jsonl` — it does not sync the status field in the markdown detail file. Claude edited the markdown directly to keep the displayed status accurate, but that bypassed the index entirely. Two possible fixes:
1. Have `domus task status` also update the status line in the detail `.md` file
2. Accept that the `.md` file status field is informational/stale and always treat `tasks.jsonl` as authoritative — update skill instructions accordingly
