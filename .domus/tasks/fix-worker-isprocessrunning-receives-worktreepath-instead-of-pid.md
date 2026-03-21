# Task: Fix worker isProcessRunning receives worktreePath instead of pid

**ID:** fix-worker-isprocessrunning-receives-worktreepath-instead-of-pid
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

pollWorker passes worktreePath (a string) to isProcessRunning which expects a pid. parseInt on a path is NaN so process.kill(NaN, 0) throws, marking every running worker failed immediately. Fix: add pid to WorkerStatus, persist in dispatchWorker, pass correctly.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
