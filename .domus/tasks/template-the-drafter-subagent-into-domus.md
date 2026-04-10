# Task: Template the drafter subagent into domus

**ID:** template-the-drafter-subagent-into-domus
**Status:** raw
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-04-10
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Drafter is referenced in the domus staff registry as an active role but its implementation lives user-global at `~/.claude/agents/drafter.md`. That means a fresh `domus init` on another machine produces a project that references Drafter without shipping it — a broken-by-default state.

Ship drafter with domus. Bring the agent file into the templates tree so `domus init` writes it alongside butler/foreman/worker/etc.

Open question: domus doesn't currently have a template destination for `.claude/agents/` files. May need a new template category. Review how other templates are structured and decide whether to add a sibling to `src/templates/reference/staff/` (for example `src/templates/claude-agents/`) or nest under existing paths.

---

## Acceptance Criteria

- [ ] `src/templates/` contains the drafter agent file
- [ ] `domus init` on a fresh project writes drafter to the right location under `.claude/agents/` (or wherever Claude Code picks it up)
- [ ] After init, the drafter subagent is invocable in Claude Code without the user copying files from `~/.claude`
- [ ] The source of drafter's content is documented so future updates to drafter propagate correctly (copy-on-init vs. reference link — decide and record)
- [ ] Staff registry entry for drafter updated to reflect new implementation path

---

## Implementation Notes

_Remove if empty._
