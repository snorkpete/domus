# Task: Fix --help flag on domus update and audit other subcommands

**ID:** fix-help-flag-on-domus-update-and-audit-other-subcommands
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

Running `domus update --help` does not print usage — it runs the update command against the current working directory. The CLI does not recognize `--help` as a known flag on this subcommand and silently ignores it, so the subcommand proceeds with its default behavior (mutate the `.domus/` tree from templates).

Discovered 2026-04-10 during template propagation: `bun run src/cli.ts update --help` was run against domus itself expecting help output, and instead performed a full self-update.

Fix `update` so `--help` prints usage and exits without side effects. Then audit every other subcommand (`task`, `idea`, `dispatch`, `config`, `doctor`, etc.) for the same pattern — if any of them silently ignore `--help`, fix them too.

---

## Acceptance Criteria

- [ ] `domus update --help` prints usage text and exits 0 without touching any files
- [ ] Same check passes for every other subcommand (`domus task --help`, `domus idea --help`, `domus dispatch --help`, etc.)
- [ ] A shared test confirms that `--help` on any subcommand is side-effect-free
- [ ] If there is a reusable help-handling utility, subcommands use it consistently

---

## Implementation Notes

_Remove if empty._
