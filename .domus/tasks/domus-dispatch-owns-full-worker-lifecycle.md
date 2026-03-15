# Task: domus dispatch owns full worker lifecycle

**ID:** domus-dispatch-owns-full-worker-lifecycle
**Status:** open
**Refinement:** raw
**Priority:** high
**Captured:** 2026-03-15
**Parent:** none
**Depends on:** add-domus-task-log-command
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Extend domus dispatch to own the full worker lifecycle: claim task (atomic in-progress status update with file lock), record worktree branch on task, set DOMUS_ROOT, generate and pass worker UUID, emit started event via domus task log, emit done/stalled event on exit. No supported path to start a worker that bypasses dispatch.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
