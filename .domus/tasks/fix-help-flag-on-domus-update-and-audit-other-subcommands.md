# Task: Fix --help flag on domus update and audit other subcommands

**ID:** fix-help-flag-on-domus-update-and-audit-other-subcommands
**Status:** cancelled
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

- [ ] `domus init --help`, `domus update --help`, `domus dispatch --help` print usage and exit 0 without side effects
- [ ] Follow the existing pattern used by `task`, `idea`, `config` (check for `--help`/`-h` early, print usage string, return)
- [ ] Tests confirm `--help` on init, update, and dispatch is side-effect-free

---

## Implementation Notes

**Pattern to follow.** See `src/commands/config.ts` lines 4-37. Each command file declares a module-level `USAGE` constant and checks for `--help`/`-h` at the top of the exported `run*` function, printing USAGE and returning early.

**Files to change.**

1. `src/commands/init.ts` — add `USAGE` constant at module top; at top of `runInit`, check `_args` for `--help`/`-h` and print-and-return.
2. `src/commands/update.ts` — same as init.
3. `src/commands/dispatch.ts` — add `USAGE` constant; at top of `runDispatch`, check for `--help`/`-h` *before* the existing `taskId.startsWith("-")` rejection (otherwise `--help` is caught as an error).

**Rename `_args` → `args`** in `init.ts` and `update.ts` now that it is being inspected.

**USAGE strings to add.** Draft these verbatim so the Worker doesn't invent wording:

```ts
// init.ts
const USAGE = `
domus init — initialise a .domus/ directory

Usage:
  domus init [--help]

Creates the .domus/ directory structure, seed files, config.json (with current
git branch), audit log, and merges .claude/settings.json. Safe to re-run —
existing seed files are preserved.

Options:
  --help, -h    Print this help
`.trim();
```

```ts
// update.ts
const USAGE = `
domus update — update an existing .domus/ directory

Usage:
  domus update [--help]

Overwrites managed template files (roles, reference, tags) with the latest
versions, syncs skills, migrates task/idea schemas, and refreshes
.claude/settings.json. Seed files (tasks.jsonl, ideas.jsonl) are never touched.

Options:
  --help, -h    Print this help
`.trim();
```

```ts
// dispatch.ts
const USAGE = `
domus dispatch — dispatch a worker for a task

Usage:
  domus dispatch <task-id> [--help]

Starts a task: transitions it to in-progress, creates its execution log,
and records the worker branch. The task must be ready and autonomous.

Options:
  --help, -h    Print this help
`.trim();
```

**Check form.** Use the same idiom as `config.ts`:
```ts
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  return;
}
```
Placed as the first statement in the function body. (`config.ts` checks `args[0]` specifically, but `includes` is more robust for commands like `dispatch` where the flag could come after the task id — pick `includes` everywhere for consistency.)

**Tests.** Add to each of `src/commands/init.test.ts`, a new `src/commands/update.test.ts` if missing (check first; if it doesn't exist, add a minimal one), and `src/commands/dispatch.test.ts`. For each:
- Call `run*(["--help"], { projectPath: tempDir })` (or equivalent)
- Assert no files were created inside `tempDir` (use `readdir` or `existsSync` checks)
- Assert USAGE was printed (capture `console.log` like `config.test.ts` lines 35-45)

Use an empty temp dir so any folder-creation side effect is obvious.

**Out of scope.** Do not refactor the existing `task`/`idea`/`config` help handling. Do not extract a shared help-handling utility — three call sites is not enough to justify abstraction.
