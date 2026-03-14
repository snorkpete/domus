# Task: domus commands walk up to find .domus directory

**ID:** domus-commands-walk-up-to-find-domus-directory
**Status:** open
**Refinement:** raw
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Non-init domus commands should traverse parent directories to find the nearest .domus/ dir, like git finds .git. Currently resolveWorkspace() reads from global config. Replace with upward traversal from cwd so domus works from any subdirectory of a project.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
