# Task: Prevent nested .domus/.domus directory creation

**ID:** prevent-nested-domusdomus-directory-creation
**Status:** raw
**Autonomous:** false
**Priority:** high
**Captured:** 2026-03-28
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Guard against domus init (or any scaffolding command) running from inside an existing .domus/ directory. This has happened multiple times in the everycent repo — a .domus/.domus/ gets created containing duplicate skeleton files. Detection: before creating .domus/, walk up the directory tree and check if any ancestor IS a .domus directory. If so, abort with an error.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
