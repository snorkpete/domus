# Task: Implement project memory in .domus/memory/

**ID:** implement-project-memory-in-domusmemory
**Status:** deferred
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-03-18
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Move project memory into .domus/memory/ so it travels with the repo. Covers: domus init creates .domus/memory/MEMORY.md and patches agents.md with @-include; update capture skill to route project vs local memory silently and announce which store was written to; migrate existing project/reference memory from local Claude memory into .domus/memory/ for the domus project itself. See ADR 007.

---

## Acceptance Criteria

- [ ] `domus init` creates `.domus/memory/MEMORY.md` (empty index) if it doesn't exist
- [ ] `domus init` appends `@.domus/memory/MEMORY.md` to `agents.md` (idempotent)
- [ ] Capture skill routes project/reference memory to `.domus/memory/`, user/personal-feedback to local memory — silently, no prompt
- [ ] Capture skill announces which store was written to after every save
- [ ] Existing project and reference memory entries migrated from `~/.claude/projects/.../memory/` to `.domus/memory/` for the domus project
- [ ] Local memory index updated to reflect what remains (user + personal feedback only)
- [ ] `decisions/007-project-memory-in-repo.md` referenced in task body for full design rationale

---

## Implementation Notes

See ADR 007 (`decisions/007-project-memory-in-repo.md`) for full design rationale and the project vs local memory split.

Deferred: stale memory reads in worktrees — tracked in `.domus/reference/deferred-decisions.md`, do not implement a fix speculatively.
