# Task: Rework domus dispatch to align with execution engine architecture

**ID:** rework-domus-dispatch-to-align-with-execution-engine-architecture
**Status:** done
**Autonomous:** true
**Priority:** high
**Captured:** 2026-03-16
**Parent:** execution-engine-and-progress-mobility-implementation
**Depends on:** add-domus-task-log-command
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Current `dispatch.ts` + `worker.ts` are built around the wrong model — they own project registry lookup, context assembly, worktree/PID management, and worker status files. None of that belongs in domus.

New model: `domus dispatch <task-id>` is a thin trigger that:
1. Validates the task exists and is in a dispatchable state
2. Calls `domus task start <id>` — marks in-progress, captures branch, creates execution log
3. Hands off to Claude (via foreman skill in the worker persona prompt)

Worktree management is Claude's job (native worktree support via Agent tool with `isolation: "worktree"`). The foreman skill reads task status + execution log and routes to the right persona. Most of current `dispatchWorker()` in `worker.ts` gets deleted.

---

## Acceptance Criteria

- [ ] `domus dispatch <task-id>` validates task exists and is `open`, `in-progress`, or `autonomous`
- [ ] For `open`/`autonomous`: calls `domus task start <task-id>` before handing off (marks in-progress, creates execution log)
- [ ] For `in-progress`: skips `domus task start` (already started); hands off directly so worker reads execution log and resumes
- [ ] Does NOT do project registry lookup, context assembly, or worktree management
- [ ] `dispatchWorker()` and related machinery in `worker.ts` removed or gutted
- [ ] Old `domus-dispatch-owns-full-worker-lifecycle` task cancelled (superseded)

---

## Implementation Notes

Depends on `add-domus-task-log-command` being in place first — dispatch needs to be able to write the initial execution log entry.

The foreman skill (separate task) handles routing logic. Dispatch just ensures the task transitions to in-progress and the log is initialised before Claude takes over.
