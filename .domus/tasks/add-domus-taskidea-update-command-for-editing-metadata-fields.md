# Task: Add domus task/idea update command for editing metadata fields

**ID:** add-domus-taskidea-update-command-for-editing-metadata-fields
**Status:** done
**Refinement:** autonomous
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

No CLI command exists for updating fields like title, summary, tags, or priority after creation. Direct edits to .jsonl bypass the CLI and break the contract that index files are never touched directly.

---

## Acceptance Criteria

- [ ] `domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>] [--priority <priority>]`
- [ ] `domus idea update <id>` with equivalent flags
- [ ] Both commands update the JSONL index and the corresponding `.md` file
- [ ] The `/update-task-status` skill is updated to document that `.domus/` files must never be edited directly — all mutations go through CLI commands

---

## Implementation Notes

When this task is implemented, update the `/update-task-status` skill (and any other task/idea skills) with the following rule:

- **Metadata fields** (status, title, summary, tags, priority) — always via `domus` CLI commands, never by editing files directly
- **Index files** (tasks.jsonl, ideas.jsonl) — never read directly; use CLI commands (`domus task list`, `domus task list --json`, etc.)
- **Body content** (description, acceptance criteria, implementation notes in the .md file) — Claude edits the .md file directly, or delegates to a subagent; the CLI does not manage rich text content
