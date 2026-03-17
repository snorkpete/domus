# Task: add docs/cli-reference.md with domus CLI usage patterns

**ID:** add-docscli-referencemd-with-domus-cli-usage-patterns
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

Create `docs/cli-reference.md` documenting the complete domus CLI — all subcommands, flags, and examples. The file is referenced from `.domus/reference/agent-instructions.md` as a conditional read ("read when using the domus CLI directly") so any session can look up correct syntax without trial and error.

---

## Acceptance Criteria

- [x] `docs/cli-reference.md` exists at repo root
- [x] Documents all top-level commands: `domus`, `domus work`, `domus connect`, `domus init`, `domus add project`, `domus dispatch`
- [x] Documents all `domus task` subcommands: `add`, `status`, `update`, `show`, `list`, `ready`, `overview`, `watch`
- [x] Documents all `domus idea` subcommands: `add`, `status`, `update`, `show`, `list`, `overview`, `refine`
- [x] Each command has: usage line, flag table with descriptions and defaults, examples where helpful
- [x] Global `--root` flag and `DOMUS_ROOT` env var documented
- [x] Pointer in `.domus/reference/agent-instructions.md` is accurate (already present, verified)

---

## Implementation Notes

`domus task log` is referenced in ADR 004 and planned in a separate task (`add-domus-task-log-command`) but not yet implemented — omitted from this reference.
