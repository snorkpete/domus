# Task: Fix --help exiting with code 1 instead of 0

**ID:** fix-help-exiting-with-code-1-instead-of-0
**Status:** done
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

All --help invocations (e.g. domus task add --help) print usage correctly but exit with code 1. Should exit 0 so callers (shell scripts, Claude tools) don't treat it as a failure.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
