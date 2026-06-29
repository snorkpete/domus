# Task: Add domus health command for health-check task triage

**ID:** add-domus-health-command-for-health-check-task-triage
**Status:** done
**Branch:** task/add-domus-health-command-for-health-check-task-triage
**Autonomous:** true
**Priority:** normal
**Captured:** 2026-06-25
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

**Problem:** Health-check tasks (doctor findings, maintenance items) are tagged `health-check` and hidden from the default `task overview` via `defaultHiddenTags`. There's no quick way to triage exactly that set. `domus health` gives it a first-class view.

Two convenience subcommands that wrap the existing task overview, scoped to the health-check workflow:

- `domus health` — equivalent to `domus task overview` but pre-filtered to the `health-check` tag (the tag that `defaultHiddenTags` normally hides) and **always** including `deferred` tasks. It surfaces exactly the maintenance/health-check items that the default overview suppresses.
- `domus health watch` — the auto-refreshing watch version of the same view (mirror the existing `domus task watch` / overview watch behaviour).

**Decisions locked in refinement:**
- Deferred tasks are **always** included — no flag. `domus health` is a "show me everything health-related" triage view.
- Deferred tasks appear in a **"Deferred" group rendered after "Blocked"**. (Refinement found overview *already* defines this group — it's surfaced for free by passing `--include-deferred`, not built new. See Implementation Notes.)
- Scope is health-check-tagged tasks only; the command does not change the default `task overview` behaviour.

Implementation notes for the refiner (not binding): the filtering primitives already exist — `includeTags` / `excludeTags` in src/lib/task-filters.ts and `parseCumulativeTagFlag`, plus the `health-check` value in `defaultHiddenTags` (config.json). This is essentially `task overview --tag health-check` with deferred tasks included, exposed as a first-class `health` command in src/cli.ts routing + a src/commands/ implementation. The watch variant should reuse whatever the existing overview/watch loop uses rather than reimplementing it.

---

## Acceptance Criteria

- [x] `domus health` lists only health-check-tagged tasks, grouped like `task overview`
- [x] `domus health` always includes `deferred` tasks (which the default overview excludes), with no flag required
- [x] Deferred health-check tasks render in overview's existing "Deferred" group (positioned after "Blocked"); non-deferred tasks remain in their normal groups
- [x] `domus health watch` renders the same view and auto-refreshes like the existing watch command
- [x] `domus health --help` documents both forms
- [x] Tests cover the filtering (health-check only + deferred included), the Deferred grouping, and the `health` / `health watch` routing
- [x] `bun run lint` and `bun test` pass

---

## Implementation Notes

**Core insight: `domus health` is a thin delegator to the existing `overview` command — not new rendering/grouping logic.**

Exploration confirmed that `src/commands/task/overview.ts` already:
- supports an `--include-deferred` flag (deferred tasks excluded by default, shown when passed),
- already defines a **"Deferred" section** in its group ordering (`Ready → In Progress → Proposed → Raw → Blocked → Done → Deferred → Cancelled → Won't Fix`). With Done/Cancelled/WontFix excluded (their flags absent), the visible order is `Ready → In Progress → Proposed → Raw → Blocked → Deferred` — i.e. Deferred renders right after Blocked, satisfying the display criterion for free.
- applies tag filtering via `taskPassesTagFilter` (`src/lib/task-filters.ts`): when `includeTags` is non-empty it switches to **whitelist mode** and ignores `defaultHiddenTags`. So passing `--tag health-check` both scopes to health-check tasks AND overrides the default hiding of that tag.

Therefore `domus health` ≈ `domus task overview --tag health-check --include-deferred`.

### Approach (preferred: thin delegation, no overview refactor)

1. **`src/cli.ts`** — add `case "health": await runHealth(args.slice(1)); break;` to the top-level switch (~line 70) and import `runHealth`. Keep cli.ts routing-only per project convention.

2. **`src/commands/health.ts`** — new file, `export async function runHealth(args: string[])`:
   - Handle `--help`/`-h` with a USAGE string documenting both `domus health` and `domus health watch`.
   - If `args[0] === "watch"`, delegate to the watch path (below).
   - Otherwise call the existing overview entry point with health defaults prepended, forwarding the rest:
     `cmdOverview(["--tag", "health-check", "--include-deferred", ...args])`.
     (Import `cmdOverview` from `src/commands/task/overview.ts`. Prepending — rather than reimplementing — means filtering, sorting, the Deferred group, and rendering all come from overview unchanged.)

3. **`domus health watch`** — mirror the existing `src/commands/task/watch.ts` wrapper, which shells out to the system `watch(1)` binary re-invoking a domus command on a timer. The existing `cmdWatch` hardcodes `domus task overview`; for health it must invoke `domus health` instead. Two options, pick the smaller diff:
   - **(a)** small `runHealthWatch` that copies the ~30-line `watch.ts` spawn pattern but targets `domus health`, or
   - **(b)** lightly parameterize `cmdWatch` to accept the target command argv (`["task","overview"]` vs `["health"]`) and call it from both. Prefer (b) only if it's genuinely a one-line parameterization; otherwise (a) — duplication of a 30-line thin wrapper is acceptable here (matches the project's "build only when needed" preference).
   - Ensure `--interval` and `--root` pass through to the watched `domus health` invocation, same as task watch does today.

### Tests (co-located `*.test.ts`, TDD)

- `src/commands/health.test.ts`: assert `runHealth` shows only `health-check`-tagged tasks; assert deferred health-check tasks appear (and that a deferred non-health task does not); assert a non-health task is excluded. Follow the temp-store + captured-output helper pattern in `src/commands/task.test.ts`.
- Routing: assert `domus health` and `domus health watch` route correctly (watch can be asserted without actually spawning `watch(1)` — guard/mocked, mirroring how `watch.ts` is tested today; check whether an existing watch test exists to copy).

### Edge cases / risks

- **`watch(1)` dependency**: `health watch` inherits the existing requirement that the system `watch` binary exists (brew-installable on macOS). No new risk — same as `task watch`.
- **Flag collision**: prepending `--tag health-check` means a user-supplied `--tag foo` is cumulative (both shown). Acceptable; note in `--help` that `health` is pre-scoped to `health-check`.
- **Do NOT refactor overview's grouping/ordering** — the Deferred group already exists; touching it risks regressing `task overview`.

### Commit scope

Single commit: cli routing + `health.ts` (+ watch path) + tests. Run `bun run lint` and `bun test` before committing.

### Dependencies

None. The filtering, deferred flag, and Deferred group all already exist on `main`.
