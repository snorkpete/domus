# Task: Add execution engine status values to task CLI

**ID:** add-execution-engine-status-values-to-task-cli
**Status:** open
**Refinement:** raw
**Priority:** high
**Captured:** 2026-03-17
**Parent:** none
**Depends on:** split-domus-task-and-idea-commands-into-multiple-files
**Idea:** none
**Spec refs:** none

---

## What This Task Is

ADR 005 defines an execution engine state machine with two new status values the task CLI does not yet know about. Add them as valid statuses with correct transition rules and update all relevant documentation.

New statuses:
- `ready-for-senior-review` — implementation committed, awaiting senior reviewer persona
- `ready-for-manual-review` — senior review done, awaiting human approval (optional gate)

---

## Acceptance Criteria

- [ ] `domus task status <id> ready-for-senior-review` accepted as a valid transition from `in-progress`
- [ ] `domus task status <id> ready-for-manual-review` accepted as a valid transition from `ready-for-senior-review`
- [ ] `domus task status <id> ready-for-senior-review` accepted as a valid transition from `ready-for-manual-review` (changes requested path)
- [ ] `domus task status <id> done` accepted from `ready-for-manual-review` (merge path)
- [ ] Invalid transitions rejected with a clear error
- [ ] `domus task overview` and `domus task list` display the new statuses correctly
- [ ] `agent-instructions.md` updated to document the full lifecycle
- [ ] All existing task status tests pass; new tests cover the new transitions

---

## Implementation Notes

Full lifecycle per ADR 005:
```
open → in-progress → ready-for-senior-review → ready-for-manual-review → done
                                                         ↑                   |
                                                         └───────────────────┘
                                                      (changes requested loop)
```
`cancelled` and `deferred` remain valid escape hatches from any state.
