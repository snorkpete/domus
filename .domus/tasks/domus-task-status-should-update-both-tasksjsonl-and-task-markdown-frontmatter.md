# Task: domus task status should update both tasks.jsonl and task markdown frontmatter

**ID:** domus-task-status-should-update-both-tasksjsonl-and-task-markdown-frontmatter
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

When domus task status runs, it updates tasks.jsonl but leaves the Status field in the task's markdown detail file stale. It should update both atomically so the md file stays in sync without Claude needing to touch it.

---

## Acceptance Criteria

- [ ] `domus task status <id> <status>` updates the `status` field in `tasks.jsonl`
- [ ] Same command also updates the `**Status:**` line in the task's `.md` detail file
- [ ] Same applies to `domus idea status` — both `ideas.jsonl` and the idea's `.md` frontmatter are updated
- [ ] No need for Claude to touch the markdown file after running a status command

---

## Implementation Notes

The markdown detail file has a frontmatter-style header block (bold key/value pairs, not YAML). The status line looks like `**Status:** open`. Update via regex replacement — find the line and replace the value. Keep it simple; no need to parse the whole file.
