# Task: migrate dispatch from ticket format to task file format

**ID:** migrate-dispatch-from-ticket-format-to-task-file-format
**Status:** done
**Refinement:** proposed
**Priority:** high
**Captured:** 2026-03-16
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

`domus dispatch` was built around the old ticket format — it uses `parseTicket()` which expects a `**Project:**` field in the file. Task files don't have this field, so `ticket.project` resolves to `"unknown"` and dispatch fails. Migrate dispatch to work with task files natively.

---

## Acceptance Criteria

- [ ] `domus dispatch <task-file>` accepts a `.domus/tasks/*.md` file (task format, not ticket format)
- [ ] Project is derived from the current working directory (not a `**Project:**` field in the file)
- [ ] `parseTicket` / ticket format is no longer used in the dispatch path
- [ ] Existing `dispatchWorker()` call still works; only the input parsing changes
- [ ] `domus dispatch .domus/tasks/<id>.md` successfully creates a worktree and spawns a worker

---

## Implementation Notes

Root cause: `src/lib/tickets.ts` `parseTicketContent()` looks for `**Project:**` frontmatter. Task files use a different schema (ID, Status, Refinement, etc.) with no Project field.

Fix: replace `parseTicket()` in `src/commands/dispatch.ts` with task file parsing — read task ID/title from task frontmatter, derive the project by matching `process.cwd()` against the workspace project registry.
