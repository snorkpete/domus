# Task: Fix worktreeHasNewCommits hardcodes master as base branch

**ID:** fix-worktreehasnewcommits-hardcodes-master-as-base-branch
**Status:** deferred
**Refinement:** raw
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

git log master..HEAD silently fails on main-based repos, causing all completed workers to be classified as failed even when commits were made. Base branch should come from project git config or be passed as context.

---

## Acceptance Criteria

- [ ] _Add acceptance criteria_

---

## Implementation Notes

_Remove if empty._
