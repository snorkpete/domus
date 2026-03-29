# Task: Fix worktree agent merge-back protocol

**ID:** fix-worktree-agent-merge-back-protocol
**Status:** raw
**Autonomous:** false
**Priority:** high
**Captured:** 2026-03-29
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Two problems: (1) Agents that stash/switch/merge to land worktree branches can silently displace in-progress work on the main worktree. (2) If agents don't merge, completed branches pile up with no mechanism to surface them. Fix: agents should never merge themselves — commit on branch and stop. Add a handoff mechanism (e.g. ready-to-merge status or checklist surfaced at session start) so the human merges when the working tree is clean.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
