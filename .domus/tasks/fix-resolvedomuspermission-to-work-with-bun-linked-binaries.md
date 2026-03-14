# Task: Fix resolveDomusPermission to work with bun linked binaries

**ID:** fix-resolvedomuspermission-to-work-with-bun-linked-binaries
**Status:** open
**Refinement:** raw
**Priority:** low
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

bun link sets process.argv[1] to the .ts source file even for installed binaries, so the .ts suffix check causes resolveDomusPermission to return null. Need a different detection strategy — e.g. resolve the binary from PATH, or use an env var set by the CLI wrapper.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
