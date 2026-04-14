# Task: Prevent nested .domus creation and fix --help flag on init/update/dispatch

**ID:** prevent-nested-domusdomus-directory-creation
**Status:** done
**Branch:** task/prevent-nested-domusdomus-directory-creation
**Autonomous:** true
**Priority:** high
**Captured:** 2026-03-28
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Two small fixes bundled into one branch because they touch the same files (`src/commands/init.ts` in particular):

1. **Nested `.domus/` guard.** `domus init` run from inside an existing `.domus/` directory silently creates `.domus/.domus/`. Add a guard that detects this and aborts.
2. **`--help` flag.** `domus init`, `domus update`, and `domus dispatch` silently ignore `--help` and run their full side effects. Make them print usage and exit cleanly.

---

## Acceptance Criteria

### Nested .domus guard
- [x] `domus init` from inside any `.domus/` ancestor (e.g. `.domus/`, `.domus/tasks/`, `.domus/reference/staff/`) prints a clear error and exits non-zero without creating anything
- [x] Guard lives in a small helper in `src/lib/update-steps.ts` and runs before any folder creation in `runInit`
- [x] Tests cover: running from `.domus/`, running from `.domus/tasks/`, running from a normal project root (succeeds)

### --help flag
- [x] `domus init --help`, `domus update --help`, `domus dispatch --help` print usage and exit 0 without side effects
- [x] Follow the existing pattern used by `task`, `idea`, `config` (check for `--help`/`-h` early, print USAGE string, return)
- [x] Tests confirm `--help` on init, update, and dispatch is side-effect-free

---

## Implementation Notes

### Commit plan

Two commits on one branch:
1. `fix: prevent domus init from creating nested .domus directories`
2. `fix: handle --help flag on init, update, and dispatch`

### Part 1 — Nested .domus guard

**Scope.** `init` only. `update` is out of scope — a separate piece of work will give non-init commands git-style directory discovery (walk up to find the store), which naturally handles nesting for `update`.

**Where the guard lives.** Add a helper `assertNotInsideDomus(projectPath: string)` to `src/lib/update-steps.ts` (the same module that exports `ensureFolderStructure`). Keeping it next to the folder-creation code keeps the guard discoverable for future commands.

**Guard logic.**
1. Resolve `projectPath` to an absolute path via `node:path`'s `resolve`
2. Split on `path.sep` and check if any segment equals `.domus`
3. If yes, throw an `Error` with a clear message — do **not** call `process.exit` from the lib. Let the command decide how to handle it.

**Where it's called.** At the very top of `runInit` in `src/commands/init.ts`, before `ensureFolderStructure`. Let the thrown error propagate; `cli.ts` lines 79-82 already catch and print to stderr with exit code 1.

**Error message.**
```
Cannot run `domus init` from inside an existing .domus/ directory (detected: <path>).
Run from the project root instead.
```

**Tests.** Add to `src/commands/init.test.ts` (already uses `mkdtemp` and passes `projectPath`):
- Running `runInit` with `projectPath` pointing at `<tmp>/.domus` rejects
- Running with `projectPath` pointing at `<tmp>/.domus/tasks` rejects
- Running with `projectPath` pointing at `<tmp>` succeeds (existing tests already cover this path)

Use `expect(runInit([], { projectPath })).rejects.toThrow(/\.domus/)` — bun:test supports async rejection assertions.

### Part 2 — --help flag

**Pattern to follow.** See `src/commands/config.ts` lines 4-37. Each command file declares a module-level `USAGE` constant and checks for `--help`/`-h` at the top of the exported `run*` function, printing USAGE and returning early.

**Files to change.**

1. `src/commands/init.ts` — add `USAGE` constant at module top; at top of `runInit`, check `args` for `--help`/`-h` and print-and-return.
2. `src/commands/update.ts` — same as init.
3. `src/commands/dispatch.ts` — add `USAGE` constant; at top of `runDispatch`, check for `--help`/`-h` *before* the existing `taskId.startsWith("-")` rejection (otherwise `--help` is caught as an error).

**Rename `_args` → `args`** in `init.ts` and `update.ts` now that it is being inspected.

**USAGE strings to add.** Use these verbatim:

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

**Check form.** Use `includes` — arg position should never matter:
```ts
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  return;
}
```
Placed as the first statement in the function body.

**Tests.**
- Add `--help` test to `src/commands/init.test.ts`
- Create `src/commands/update.test.ts` (does not exist today) with a minimal `--help` test
- Add `--help` test to `src/commands/dispatch.test.ts`

For each test:
- Call `run*(["--help"], { projectPath: tempDir })` (or equivalent)
- Assert no files were created inside `tempDir` (use `readdir` or `existsSync` checks)
- Assert USAGE was printed (capture `console.log` like `config.test.ts` lines 35-45)

Use an empty temp dir so any folder-creation side effect is obvious.

**Out of scope.** Do not refactor the existing `task`/`idea`/`config` help handling. Do not extract a shared help-handling utility — three call sites is not enough to justify abstraction. Do not touch `update`'s nesting behavior.
