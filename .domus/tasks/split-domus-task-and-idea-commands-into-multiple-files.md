# Task: Split domus task and idea commands into multiple files

**ID:** split-domus-task-and-idea-commands-into-multiple-files
**Status:** cancelled
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

task.ts and idea.ts are single large files with all subcommand logic inline. Refactor each into a directory (e.g. commands/task/ and commands/idea/) with one file per subcommand plus a shared helpers file.

Previously marked superseded after shared helpers were extracted (commit 2061f22), with the reasoning that files were lean enough that splitting added navigation overhead. That note was left without cancelling the task — a process error. Re-opening to reassess: the task is a dependency for `add-execution-engine-status-values-to-task-cli` and `show-dependency-chains-in-blocked-section-of-task-overview`, so the split may still be warranted as the files grow with new status values and overview logic.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
