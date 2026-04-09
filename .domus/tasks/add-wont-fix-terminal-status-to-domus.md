# Task: Add won't-fix terminal status to domus

**ID:** add-wont-fix-terminal-status-to-domus
**Status:** done
**Branch:** task/add-wont-fix-terminal-status-to-domus
**Autonomous:** true
**Priority:** normal
**Captured:** 2026-04-09
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Add a `wont-fix` terminal status to domus. The doctor skill needs a way to suppress known-accepted findings from re-surfacing on future runs. Currently there's no status that means "we looked at this and deliberately chose not to fix it." Cancelled implies the work was abandoned or became irrelevant — won't-fix captures an explicit decision to leave behavior as-is.

**Not in scope:** Doctor skill integration, capture-task skill awareness — those are downstream consumers.

---

## Acceptance Criteria

- [x] `wont-fix` is a valid terminal status in the workflow engine
- [x] `wont-fix` is an escape hatch (reachable from any active state, same as cancel/defer)
- [x] `domus task wontfix <id> [--note <text>]` transitions a task to `wont-fix` (new command, mirrors cancel.ts)
- [x] `domus task add --wont-fix --title "..."` creates a task directly in `wont-fix` status (skips raw)
- [x] Won't-fix task template omits Acceptance Criteria and Implementation Notes sections
- [x] `domus task reopen <id>` works on won't-fix tasks (transitions to `raw`)
- [x] `domus task list` excludes won't-fix tasks by default (same as done)
- [x] `domus task list --wont-fix` includes won't-fix tasks alongside active tasks
- [x] `domus task list --status wont-fix` shows only won't-fix tasks
- [x] `domus task overview` excludes won't-fix tasks by default
- [x] `domus task overview --wont-fix` includes won't-fix tasks
- [x] Won't-fix gets `⊘` icon in display output
- [x] `--help` output surfaces `wontfix` subcommand and `--wont-fix` flags with clear descriptions
- [x] Won't-fix tasks do not count as active for dependency blocking
- [x] `docs/cli-reference.md` updated

---

## Implementation Notes

**Pattern:** Mirror `cancel.ts` / `defer.ts` for the new `wontfix.ts` command.

**Files to touch (10):**

| File | Change |
|------|--------|
| `src/lib/task-types.ts` | Add `"wont-fix"` to `TaskStatus` union and `VALID_STATUSES` |
| `src/lib/state-engine.ts` | Add `"wont-fix"` to `ESCAPE_HATCHES`, add `"wont-fix": ["raw"]` to both transition maps |
| `src/commands/task/wontfix.ts` | New file — mirror of `cancel.ts`, transitions to `"wont-fix"` |
| `src/commands/task/add.ts` | Add `--wont-fix` flag that sets initial status to `"wont-fix"`, use minimal template (no AC/impl notes) |
| `src/commands/task/index.ts` | Register `wontfix` subcommand, update `TASK_USAGE` help text |
| `src/commands/task/list.ts` | Hide `wont-fix` by default (filter alongside `done`), add `--wont-fix` include flag |
| `src/commands/task/overview.ts` | Exclude by default, add `--wont-fix` include flag |
| `src/commands/task/display.ts` | Add `"wont-fix": "⊘"` to `STATUS_ICON` |
| `src/commands/task/reopen.ts` | Verify — should work via transition map, no code change expected |
| `docs/cli-reference.md` | Update status list, add wontfix command, document `--wont-fix` flags |

**Single commit scope.**
