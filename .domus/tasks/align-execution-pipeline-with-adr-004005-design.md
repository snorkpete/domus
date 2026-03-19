# Task: Align execution pipeline with ADR 004/005 design

**ID:** align-execution-pipeline-with-adr-004005-design
**Status:** open
**Refinement:** raw
**Priority:** high
**Captured:** 2026-03-19
**Parent:** none
**Depends on:** execution-engine-and-progress-mobility-implementation, worker-autonomy-and-execution-model-alignment, role-files-and-session-routing-implementation
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Epic tracker for bringing the domus codebase into alignment with ADR 004 (domus store and worker logging) and ADR 005 (execution engine and progress mobility). Source: full source code audit against ADR 000–007 and all role files (2026-03-19).

This task has no implementation work of its own. It depends-on three subtasks (set after subtasks are created). When all subtasks are done, this epic can be closed.

### Subtasks

- **Subtask 1:** Execution Engine & Progress Mobility — dispatch interface, `domus task start`, `domus task log`, review status values
- **Subtask 2:** Worker Autonomy & Execution Model — worker log path/format, branch detection, DOMUS_ROOT persistence, init gaps
- **Subtask 3:** Role Files & Session Routing — Worker/Foreman/Taskmaster stub role files, Butler routing verification, herald/doctor path fixes

---

## Acceptance Criteria

- [ ] `domus dispatch <task-id>` takes a task ID, not a file path
- [ ] `domus task start <id> --branch <branch>` exists and marks in-progress, records branch, creates execution log
- [ ] `domus task log <id> <message>` exists and writes to `.domus/execution-logs/<id>.md`
- [ ] Worker logs written to `.domus/execution-logs/<task-id>.md` (correct path and format)
- [ ] DOMUS_ROOT written to persistent config by `domus init`
- [ ] `.domus/execution-logs/` created by `domus init`
- [ ] Worker, Foreman, and Taskmaster role files written (no longer stubs)
- [ ] herald.md and doctor.md reference correct execution log path

---

## Implementation Notes

See audit findings for full detail on each gap. Existing related tasks that may be absorbed or referenced:
- `rework-domus-dispatch-to-align-with-execution-engine-architecture`
- `add-execution-engine-status-values-to-task-cli`
- `add-domus-task-log-command`
- `add-domus_root-to-domus-init-config`
- `create-worker-persona`
- `create-foreman-skill`
- `create-taskmaster-persona`
