# Task: Worker dispatch prompt must reference worker role file

**ID:** worker-dispatch-prompt-must-reference-worker-role-file
**Status:** done
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-03-21
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

When dispatching a Worker via background agent, the prompt must instruct the agent to read and follow .domus/reference/staff/roles/worker.md. Currently the Foreman (or whoever dispatches) gives ad-hoc instructions instead of pointing at the role file, which means Workers don't follow the full execution protocol — e.g. they skip advancing the task to done, skip logging via domus task log, and skip committing. The Worker role file already has all of this. The fix is in the dispatch flow: the prompt template should include 'Read and follow .domus/reference/staff/roles/worker.md' as the first instruction. Observed 2026-03-21: three Workers dispatched in parallel, only one happened to advance its task to done — the other two left tasks stuck in in-progress.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
