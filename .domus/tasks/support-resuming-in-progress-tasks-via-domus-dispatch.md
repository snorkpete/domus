# Task: Support resuming in-progress tasks via domus dispatch

**ID:** support-resuming-in-progress-tasks-via-domus-dispatch
**Status:** raw
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-03-21
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

`domus dispatch` only works on `ready` tasks. If a task is already `in-progress` (e.g. a Worker was interrupted or the dispatch is being retried), dispatch rejects it. There is also no clean way to distinguish "actively running" from "stuck waiting on human input" — both show as `in-progress`.

The solution is a `stalled` status:
- `stalled` = was in-progress, now paused (Worker hit a blocker, or human manually stalled it)
- `dispatch` accepts `stalled` as a valid starting state (alongside `ready`)
- Worker transitions to `stalled` on blocker instead of leaving task in `in-progress` limbo
- Human can stall a task manually via `domus task stall <id>`
- Transitions: `in-progress → stalled`, `stalled → in-progress` (on re-dispatch), plus standard escape hatches (cancel, defer)
- `stalled` tasks appear in overview between In Progress and Proposed

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
