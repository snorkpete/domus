# Task: add blocked section to domus task overview

**ID:** add-blocked-section-to-domus-task-overview
**Status:** done
**Refinement:** autonomous
**Priority:** normal
**Captured:** 2026-03-16
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Add a dedicated Blocked section to `domus task overview` so blocked tasks are always visible with their blockers shown inline. Currently blocked tasks are hidden by default and only surface with `--blocked`.

---

## Acceptance Criteria

- [ ] Blocked tasks are shown by default — no flag required
- [ ] Display order: Autonomous → Blocked → Supervised
- [ ] Blocked section renders as a tree: blocked task on one line, its unresolved blockers indented below with their icons
- [ ] Blocked tasks appear **only** in the Blocked section — not mixed into Supervised or Autonomous
- [ ] `--blocked` flag is removed: arg parsing, `includeBlocked` variable, `blockedSuffix` in format functions, and help text all cleaned up
- [ ] All rows (blocked task and its blockers) use the same full icon format: priority + refinement + status + id — consistent with all other sections, no special-case layout
- [ ] Example format:
  ```
  ── Blocked ─────────────────────────────────
  ▲   ○  get-domus-ready-for-prod-new-machine-setup
    · ~ ○  migrate-dispatch-from-ticket-format-to-task-file-format
    · ◐ ○  fix-skill-frontmatter-triggers-to-cover-agent-invocation-scenarios
    ·   ○  some-autonomous-blocking-task
  ```

---

## Implementation Notes

Relevant code in `src/commands/task.ts`:
- `isBlocked()` — already exists, checks `depends_on` against done set
- `formatSupervised()` / `formatAutonomous()` — have existing `blockedSuffix` logic to remove
- Overview currently filters out blocked tasks with `if (blocked && !includeBlocked) continue` — replace with routing to blocked bucket instead
