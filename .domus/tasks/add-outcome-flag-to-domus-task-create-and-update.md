# Task: Add --outcome flag to domus task create and update

**ID:** add-outcome-flag-to-domus-task-create-and-update
**Status:** done
**Refinement:** autonomous
**Priority:** normal
**Captured:** 2026-03-17
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Add an --outcome flag to both 'domus task create' and 'domus task update'. Flags should mirror between create and update — adding a flag to one means adding it to the other.

---

## Acceptance Criteria

- [ ] `domus task update <id> --outcome "<text>"` sets outcome_note in tasks.jsonl
- [ ] `domus task add --outcome "<text>"` sets outcome_note at creation time
- [ ] Both accept empty string to clear the outcome note

---

## Implementation Notes

General convention: flags should mirror between `task add` and `task update`. When adding a flag to one, add it to the other in the same commit.
