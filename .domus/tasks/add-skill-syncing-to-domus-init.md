# Task: Add skill syncing to domus init

**ID:** add-skill-syncing-to-domus-init
**Status:** open
**Refinement:** raw
**Priority:** high
**Captured:** 2026-03-18
**Parent:** none
**Depends on:** refactor-domus-init-to-install-template-files-from-source-instead-of-embedded-strings, rework-domus-init-to-handle-current-workspace-structure-and-be-idempotent
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Ship a reference skills/ directory in the domus repo (starting with land-worktree). During domus init, discover which skills domus provides, compare with what is already installed in the project's .claude/skills/, and copy in the delta. Idempotent: re-running init only adds missing or updated skills.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
