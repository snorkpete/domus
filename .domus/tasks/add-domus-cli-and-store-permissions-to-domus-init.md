# Task: Add domus CLI and store permissions to domus init

**Status:** done
**Autonomous:** true
**ID:** add-domus-cli-and-store-permissions-to-domus-init
**Status:** in-progress
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Claude Code prompts for permission every time it runs a domus command or touches a `.domus/` file in a project. Running `domus init` on a project should write the correct Claude Code permission entries into `.claude/settings.json` so those prompts never appear again.

Two separate gaps exist:

1. **Missing domus CLI permission**: `REQUIRED_PERMISSIONS` in `init.ts` does not include an entry allowing the domus binary to be called. The binary lives at a machine-specific path (e.g. `/Users/kion/.bun/bin/domus`) which must be resolved at init time using `process.argv[0]` (the Bun executable) — but the domus binary path itself can be found from `Bun.argv[0]` or, more reliably, by resolving the path of the currently running script. The correct permission format Claude Code uses for a specific binary is `"Bash(/path/to/domus:*)"`.

2. **Missing `.domus/**` file-access permissions**: Claude Code's `Read`, `Edit`, `Write`, `Glob`, and `Grep` tool permissions already present in `REQUIRED_PERMISSIONS` are unscoped (allow all paths), so `.domus/**` file access is already covered by those entries — **no additional path-scoped entries are needed** for file tools.

The real work is item 1: dynamically resolving the domus binary path at init time and adding it to the `allow` array.

---

## Acceptance Criteria

- [ ] After running `domus init` on a project, `.claude/settings.json` contains a `Bash(<domus-binary-path>:*)` entry where `<domus-binary-path>` is the absolute path to the running domus executable.
- [ ] The domus binary path is resolved dynamically (not hardcoded), so `domus init` works correctly on any machine regardless of where bun is installed.
- [ ] Running `domus init` a second time does not duplicate the permission entry (idempotent — already guaranteed by the `Set` deduplication in current code, but the new entry must be tested too).
- [ ] Running `domus init` on a project that already has a different binary path in its settings (e.g. a stale path from a previous machine) adds the current path and leaves the old one in place (merge-only, never remove).
- [ ] Existing `init.test.ts` tests continue to pass.
- [ ] A new test verifies that the domus binary path permission is present in the generated settings.

---

## Implementation Notes

### How to resolve the domus binary path

In `init.ts`, the running binary path is available via `process.argv[1]` when executed as a script, but when installed via `bun link`, the domus binary is the entry point. The most reliable approach is:

```ts
import { fileURLToPath } from "node:url";
// In a Bun context, the executable path is Bun.argv[0] (the bun binary)
// The domus script path is Bun.argv[1] — but this is the .ts source when run via `bun run`
// For the installed binary: process.execPath is the bun binary, not domus
// Best approach: resolve from the DOMUS_BIN env var if set, else use `which domus`-equivalent
```

Actually the simplest reliable approach: use `process.argv[1]` which is the path to the running script/binary. When domus is installed via `bun link`, `process.argv[1]` is the path to the domus binary itself (e.g. `/Users/kion/.bun/bin/domus`). When run directly via `bun run src/cli.ts`, it will be the `.ts` file path — in that case we should skip or handle gracefully.

Recommended implementation in `init.ts`:

```ts
import { realpath } from "node:fs/promises";

// Resolve the domus binary path (argv[1] when installed as a binary)
let domusPermission: string | null = null;
const argv1 = process.argv[1];
if (argv1 && !argv1.endsWith(".ts")) {
  // Installed binary — resolve symlinks to get canonical path
  try {
    const resolved = await realpath(argv1);
    domusPermission = `Bash(${resolved}:*)`;
  } catch {
    // Could not resolve — skip
  }
}
```

Then add `domusPermission` to the merged allow array (filter out nulls).

### What to change in `init.ts`

1. Import `realpath` from `node:fs/promises` (already importing from there).
2. After the `envPath` check, resolve the domus binary path as shown above.
3. Build `dynamicPermissions`: `REQUIRED_PERMISSIONS` plus `domusPermission` if non-null.
4. Use `dynamicPermissions` in place of `REQUIRED_PERMISSIONS` in the merge step.

### What to add to `init.test.ts`

Add one test: run `domus init` with `projectPath: tempDir`. The test runs via `bun test` so `process.argv[1]` will be a `.ts` file path — `domusPermission` will be `null` and the entry won't appear. So this test needs a different approach: use `vi.spyOn` (or Bun mock) on `process.argv` to simulate a binary path, OR test the path-resolution logic in a unit test separate from `runInit`.

Simpler: extract a helper `resolveDomusPermission(argv1: string): string | null` and unit-test it directly. Then the `runInit` integration test only needs to verify the helper is called (or just verify the existing behavior doesn't regress).

### Files to modify

- `/Users/kion/code/domus/src/commands/init.ts` — add dynamic binary path resolution and include it in permissions
- `/Users/kion/code/domus/src/commands/init.test.ts` — add test for `resolveDomusPermission` helper

### Edge cases

- If `process.argv[1]` ends in `.ts` (dev mode), skip silently — no permission entry written. This is acceptable; dev mode doesn't need the permission since you'd be using `bun run` directly.
- Symlinks: use `realpath` to resolve the canonical path, since `bun link` creates a symlink and Claude Code needs the real binary path to match what it actually invokes.
- The `Bash(bun *)` entry in `REQUIRED_PERMISSIONS` allows `bun *` commands but does NOT cover `/Users/kion/.bun/bin/domus:*` — these are matched by Claude Code as separate command patterns.
