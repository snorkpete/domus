# Task: Role files and session routing implementation

**ID:** role-files-and-session-routing-implementation
**Status:** done
**Branch:** task/role-files-and-session-routing-implementation
**Refinement:** autonomous
**Priority:** high
**Captured:** 2026-03-19
**Parent:** align-execution-pipeline-with-adr-004005-design
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Write the three full role files and fix stale path references in existing role files. This is subtask 3 of the `align-execution-pipeline-with-adr-004005-design` epic — check the parent for the full audit context and cross-subtask scope.

Worker, Foreman, and Taskmaster role files currently contain only `*Role file not yet written.*`. Herald and Doctor reference `.domus/logs/` which doesn't match ADR 004's `.domus/execution-logs/`.

---

## Acceptance Criteria

- [ ] `worker.md` — full, self-contained role file: system prompt, execution protocol, logging instructions (use `domus task log`), close-out behaviour, ADR pointers for background
- [ ] `foreman.md` — full, self-contained role file: Route, Advance, and Merge and Close capabilities (Send Back deferred to v0.1), ADR pointers for background
- [ ] `taskmaster.md` — full, self-contained role file: two-phase refinement (what/how), `domus task update` usage, handoff protocol, ADR pointers for background
- [ ] `herald.md` — execution log path updated to `.domus/execution-logs/<task-id>.md`
- [ ] `doctor.md` — execution log path updated to `.domus/execution-logs/<task-id>.md`
- [ ] Template copies in `src/templates/reference/staff/roles/` updated to match
- [ ] Butler routing verified: `role-activation-rules.md` contains sufficient information for Butler to route to the right role
- [ ] `create-worker-persona`, `create-foreman-skill`, `create-taskmaster-persona` cancelled (superseded by this task)

---

## Implementation Notes

**Existing tasks that overlap — check before implementing:**
- `create-worker-persona` (open, high)
- `create-foreman-skill` (open, high)
- `create-taskmaster-persona` (open, normal)

**Role file locations:**
- Live files: `.domus/reference/staff/roles/<role>.md`
- Template copies: `src/templates/reference/staff/roles/<role>.md` (seeded by `domus init`)

**For Worker.md:** The `WORKER_INSTRUCTIONS` hardcoded string in `src/lib/worker.ts` is the current de facto worker behaviour. Use that as a starting point but align with ADR 005 — workers must use `domus task log` for progress, not write files directly.

**For Foreman.md:** Foreman capabilities per ADR 005: Route (open/in-progress → executor), Advance (in-progress → ready-for-senior-review), Send Back (manual-review → senior-review), Merge and Close (merge worktree PR, close task). v0 only needs Route.

**For Taskmaster.md:** Two-phase refinement — Phase 1 (what): clarify the problem and acceptance criteria. Phase 2 (how): implementation approach. Output: updated task file with filled acceptance criteria and implementation notes.
