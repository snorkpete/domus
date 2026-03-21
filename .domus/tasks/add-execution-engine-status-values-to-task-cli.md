# Task: Add execution engine status values to task CLI

**ID:** add-execution-engine-status-values-to-task-cli
**Status:** done
**Autonomous:** true
**Priority:** high
**Captured:** 2026-03-17
**Parent:** execution-engine-and-progress-mobility-implementation
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

ADR 005 defines an execution engine state machine. Add `ready-for-senior-review` as a valid task status with correct transition rules. This is the v0.1 boundary — `ready-for-manual-review` (the human review gate) is explicitly deferred to a later milestone.

New status:
- `ready-for-senior-review` — implementation committed, awaiting senior reviewer persona

---

## Acceptance Criteria

- [ ] `domus task status <id> ready-for-senior-review` accepted as a valid transition from `in-progress`
- [ ] `domus task status <id> done` accepted as a valid transition from `ready-for-senior-review`
- [ ] Invalid transitions rejected with a clear error
- [ ] `domus task overview` and `domus task list` display `ready-for-senior-review` correctly
- [ ] `agent-instructions.md` updated to document the current lifecycle
- [ ] All existing task status tests pass; new tests cover the new transitions

---

## Implementation Notes

**Files to touch:**
- `src/lib/task-types.ts` — add `ready-for-senior-review` to the `TaskStatus` union
- `src/commands/task.ts` (`cmdStatus`) — update transition validation; use a map (not hardcoded if/else) so future states slot in without rework
- `src/commands/task-display.ts` — add display icon/label for the new status (follow existing pattern in `agent-instructions.md` icon legend)
- `.domus/reference/agent-instructions.md` — update status table and lifecycle section

**v0.1 lifecycle (this task):**
```
open → in-progress → ready-for-senior-review → done
```

**Future:** `ready-for-manual-review` will slot between `ready-for-senior-review` and `done` when the human review gate is added. If the transition logic is a map, this is a one-liner addition with no rework.

`cancelled` and `deferred` remain valid escape hatches from any state.
