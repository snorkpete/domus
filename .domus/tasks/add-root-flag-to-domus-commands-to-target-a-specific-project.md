# Task: Add --root flag to domus commands to target a specific project

**ID:** add-root-flag-to-domus-commands-to-target-a-specific-project
**Status:** done
**Autonomous:** true
**Priority:** high
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

`domus task` and `domus idea` commands resolve their store to `cwd/.domus/`. When working on domus from inside the everycent project, there is no way to target domus's own `.domus/` store without `cd`-ing first (which triggers a permission prompt in Claude's Bash tool).

Add a global `--root <path>` flag that can be passed before the subcommand to override the project root. Example:

```
domus --root /Users/kion/code/domus task add --title "..."
domus --root ~/code/domus idea list
```

---

## Acceptance Criteria

- [ ] `domus --root <path> task <subcommand>` resolves the `.domus/` store relative to `<path>` instead of `cwd`
- [ ] `domus --root <path> idea <subcommand>` does the same
- [ ] Relative paths in `--root` are resolved to absolute paths
- [ ] Tilde (`~`) in `--root` is expanded to `$HOME`
- [ ] If `--root` path does not exist, exit with a clear error message
- [ ] Commands without `--root` behave identically to before (no regression)
- [ ] `domus --help` documents the `--root` flag
- [ ] Existing tests still pass; new tests cover `--root` resolution in `projectRoot()`

---

## Implementation Notes

**Approach: env-var bridge in cli.ts + check in projectRoot()**

This avoids changing any command function signatures.

### 1. `src/cli.ts`

Parse `--root` from `process.argv` before dispatching, strip it from the args passed to subcommands, resolve + validate the path, and set `process.env.DOMUS_ROOT`:

```ts
// in cli.ts, before const command = args[0]
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function stripRoot(args: string[]): { root: string | null; rest: string[] } {
  const idx = args.indexOf("--root");
  if (idx === -1) return { root: null, rest: args };
  const raw = args[idx + 1];
  if (!raw) { console.error("--root requires a path argument"); process.exit(1); }
  const expanded = raw.startsWith("~") ? raw.replace("~", process.env.HOME ?? "") : raw;
  const abs = resolve(expanded);
  if (!existsSync(abs)) { console.error(`--root path does not exist: ${abs}`); process.exit(1); }
  return { root: abs, rest: [...args.slice(0, idx), ...args.slice(idx + 2)] };
}

const { root, rest: args } = stripRoot(process.argv.slice(2));
if (root) process.env.DOMUS_ROOT = root;
```

Update USAGE string to document `--root`.

### 2. `src/lib/jsonl.ts`

```ts
export function projectRoot(): string {
  return process.env.DOMUS_ROOT ?? resolve(process.cwd());
}
```

### Scope

Only `task` and `idea` commands need this — they are the only ones that call `projectRoot()`. `add`, `dispatch`, `work`, `init` use `resolveWorkspace()` and are out of scope.

### Tests

Add a test in `cli.test.ts` (or a dedicated `projectRoot.test.ts`) that:
- Sets `DOMUS_ROOT` to a temp dir and verifies `projectRoot()` returns it
- Unsets `DOMUS_ROOT` and verifies `projectRoot()` returns `cwd`
- Verifies `stripRoot` strips the flag and its value from the rest args correctly
