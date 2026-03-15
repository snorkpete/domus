# Task: Add protected branch rule to agents.md

**ID:** add-protected-branch-rule-to-agentsmd
**Status:** open
**Refinement:** raw
**Priority:** normal
**Captured:** 2026-03-15
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Add an explicit rule to agents.md: before dispatching workers, confirm you are not on main/master. If the human hasn't created a branch, prompt them to do so first. Workers branch off the current HEAD — if that's a protected branch, their work can't be merged back cleanly.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
