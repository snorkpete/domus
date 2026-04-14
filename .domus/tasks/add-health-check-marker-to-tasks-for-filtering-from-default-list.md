# Task: Add health-check marker to tasks for filtering from default list

**ID:** add-health-check-marker-to-tasks-for-filtering-from-default-list
**Status:** raw
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-04-13
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

The health-check module will generate a large volume of tasks that are worked on in a dedicated session. Mixed into the normal `domus task list`, they drown out feature and product work. Add a marker on tasks that identifies them as health-check-originated, and teach `domus task list` to hide them by default with flags to opt in.

---

## Open Questions (resolve during refinement)

- **Marker shape:** `source: health-check` (general origin field, extensible) vs `is_health_check: true` (narrow boolean, simpler). Lean toward `source:` as it's more extensible if other origins emerge (e.g. `hunter`, `doctor`), but the boolean is dead-simple. Decide during refinement.
- **Combined view:** is there a real need to see health + feature tasks interleaved, or is the split always clean? If yes, `--include-health-tasks` adds them to the default view. If no, skip it.
- **Flag naming:** proposed `--show-health-tasks-only` (exclusive) vs `--include-health-tasks` (additive). Finalise during refinement.
- **Backfill mechanism:** one-shot script, migration, or manual update of existing health-check tasks? Depends on how many exist when this lands.

---

## Acceptance Criteria

- [ ] Task schema supports a health-check marker (shape TBD).
- [ ] `domus task list` hides health-check tasks by default.
- [ ] A flag exists to show *only* health-check tasks.
- [ ] A flag exists to include health-check tasks alongside normal tasks (if the combined view is kept).
- [ ] Existing health-check-originated tasks are backfilled with the marker.
- [ ] Health-check module (when it captures tasks) sets the marker automatically — no manual tagging.

---

## Implementation Notes

This is infrastructure for the health-check module workstream. The health-check module itself is not yet built, so backfill scope is small today but will grow. Land this before the health-check module starts generating tasks at volume.
