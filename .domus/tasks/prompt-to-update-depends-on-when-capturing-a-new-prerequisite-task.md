# Task: Prompt to update depends-on when capturing a new prerequisite task

**ID:** prompt-to-update-depends-on-when-capturing-a-new-prerequisite-task
**Status:** deferred
**Autonomous:** false
**Priority:** high
**Captured:** 2026-03-18
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

When a new prerequisite task is captured, nothing in the current flow prompts "does any existing task now depend on this?" The new task gets created, the conversation moves on, and downstream tasks are silently left with stale `depends-on` fields. The dependency graph becomes inaccurate without anyone noticing.

The fix is to add a lookback step to the capture-task skill (and potentially the `domus task add` CLI): after creating the task, scan open tasks and surface any that might logically depend on the new one, prompting the user to update their `depends-on`.

---

## Acceptance Criteria

- [ ] After capturing a new task, the capture-task skill includes a lookback step that considers whether existing open tasks should declare a dependency on it
- [ ] Where a likely downstream dependency is identified, the user is prompted and `domus task update <id> --depends-on` is run to wire it up
- [ ] The lookback is lightweight — it should not require reading every task file, just scanning task titles/summaries for relevance

---

## Implementation Notes

- The lookback step belongs in the capture-task skill, not the CLI — the CLI creates; the skill contextualizes
- Could be a prompted step ("Does any existing task depend on this one? Check the list and update if so") or a smarter scan using task titles
- Consider whether `domus task add` should also output a reminder line suggesting the user check downstream depends-on
