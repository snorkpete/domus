# Task: Add domus config set-branch command

**ID:** add-domus-set-branch-command
**Status:** done
**Branch:** task/add-domus-set-branch-command
**Autonomous:** true
**Priority:** normal
**Captured:** 2026-03-21
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Introduce `domus config set-branch` — a dedicated command to update the branch recorded in `.domus/config.json`. This makes `domus init` a true one-time setup command and gives users a clean way to update their base branch (e.g. after renaming `master` → `main`) without re-running `init`.

The `setBranch` step is already extracted in `src/lib/update-steps.ts` from the `domus update` refactor — this task just wires it up as a subcommand under `domus config`.

Usage:
```
domus config set-branch [<branch>]
domus config --help
```

If `<branch>` is omitted, detect the current git branch (same logic as `init`). If provided, use that value directly (allows setting a branch you're not currently on).

If `.domus/config.json` does not exist, create it.

Users interact via natural language — no need for a skill. The agent-instructions and cli-reference docs are sufficient. Claude should invoke this command when the user explicitly mentions the domus branch config, e.g. "set the domus branch", "update the domus branch config", "change the domus base branch". Do not trigger on generic git branch mentions.

---

## Acceptance Criteria

- [ ] `domus config` added as a top-level command in `src/cli.ts`, routing to `src/commands/config.ts`
- [ ] `domus config set-branch [<branch>]` implemented — detects current git branch if omitted, writes explicitly if provided
- [ ] `domus config --help` prints available subcommands
- [ ] If `.domus/config.json` does not exist, create it
- [ ] Prints confirmation: `Branch set to: <branch>`
- [ ] Reuses `setBranch` from `src/lib/update-steps.ts` — no duplication
- [ ] `.domus/reference/agent-instructions.md` updated with a line telling Claude when to invoke this command (domus branch config only, not generic git branches)
- [ ] `docs/cli-reference.md` updated to document `domus config set-branch`
- [ ] `bun test` passes
