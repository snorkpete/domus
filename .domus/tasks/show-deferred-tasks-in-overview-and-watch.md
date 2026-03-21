# Task: Show deferred tasks in overview and watch

**ID:** show-deferred-tasks-in-overview-and-watch
**Status:** done
**Branch:** task/show-deferred-tasks-in-overview-and-watch
**Autonomous:** true
**Priority:** normal
**Captured:** 2026-03-21
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Add `--include-deferred` and `--include-cancelled` flags to `domus task overview` and `domus task watch`. Overview groups them in Deferred and Cancelled sections at the end of the output. Default behaviour unchanged — both are hidden unless their respective flags are set.

---

## Acceptance Criteria

- [ ] `domus task overview` accepts `--include-deferred` flag; deferred tasks appear in a **Deferred** section (after Done)
- [ ] `domus task overview` accepts `--include-cancelled` flag; cancelled tasks appear in a **Cancelled** section (after Deferred)
- [ ] Both flags are independent — either, both, or neither may be set
- [ ] Default behaviour is unchanged — deferred and cancelled tasks are hidden without their respective flags
- [ ] `domus task watch` passes `--include-deferred` and `--include-cancelled` through to `overview` (already handled by passthrough; verify no regressions)
- [ ] Section order: Ready → In Progress → Proposed → Raw → Blocked → Done → Deferred → Cancelled

---

## Implementation Notes

### Files to change
- `src/commands/task/overview.ts` — add `--include-deferred` and `--include-cancelled` flags, collect those task arrays, append Deferred and Cancelled sections at the end
- `src/commands/task/watch.ts` — no changes needed; `passthroughArgs` already passes unknown flags through to `overview`
- `src/commands/task.test.ts` — add test cases for both flags

### Conventions
- Use `hasFlag(args, "--include-deferred")` / `hasFlag(args, "--include-cancelled")` — mirrors the existing `--include-done` pattern
- Deferred and cancelled sections render with `formatRow` (flat list, same as all non-Blocked sections)
- No `isBlocked` check needed for deferred or cancelled tasks

### Commit scope
Single commit.
