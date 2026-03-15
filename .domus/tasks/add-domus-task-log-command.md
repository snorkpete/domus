# Task: Add domus task log command

**ID:** add-domus-task-log-command
**Status:** open
**Refinement:** raw
**Priority:** high
**Captured:** 2026-03-15
**Parent:** none
**Depends on:** add-domus_root-to-domus-init-config
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Add a domus task log <id> <message> command that writes to both the task execution log (.domus/execution-logs/<id>.md) and appends a structured event to the audit log (.domus/audit.jsonl). Includes worker UUID (set by dispatch) and timestamp. Single call, both consumers satisfied.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
