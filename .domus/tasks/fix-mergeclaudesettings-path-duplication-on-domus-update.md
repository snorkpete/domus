# Task: Fix mergeClaudeSettings PATH duplication on domus update

**ID:** fix-mergeclaudesettings-path-duplication-on-domus-update
**Status:** ready
**Autonomous:** true
**Priority:** normal
**Captured:** 2026-04-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

`mergeClaudeSettings` in `src/lib/update-steps.ts` appends `node_modules/.bin` paths to `env.PATH` in `.claude/settings.json` on every `domus init` / `domus update` instead of replacing or de-duplicating. Result: every update doubles (or worse) the length of the PATH entry. Discovered 2026-04-14 during a `git diff` after running update — saw the same node_modules paths repeated.

---

## Root Cause

`mergeClaudeSettings` writes `process.env.PATH` directly to `settings.env.PATH`. When run inside a Claude Code session, `process.env.PATH` already contains the entries from the previous `settings.env.PATH` (Claude Code injects it). So each run prepends the same paths again, growing the value indefinitely.

## Acceptance Criteria

- [ ] Running `domus update` (or `domus init`) repeatedly produces a stable `env.PATH` — same value on second and subsequent runs.
- [ ] Test: call `mergeClaudeSettings` twice in sequence with the same project path; assert the written PATH is identical after both calls.
- [ ] No existing PATH entries are dropped (dedup preserves order, keeps first occurrence).

---

## Implementation Notes

- Fix is in `src/lib/update-steps.ts`, `mergeClaudeSettings` function (~line 377).
- Before writing, deduplicate the PATH string: split on `:`, deduplicate preserving order (first occurrence wins), rejoin. Example:
  ```ts
  const deduped = [...new Set(envPath.split(":"))].join(":");
  settings.env = { ...settings.env, PATH: deduped };
  ```
- No other changes needed — permissions merge already uses `Set` correctly (line 375).
- Test lives alongside existing `update-steps.test.ts`. Mock `process.env.PATH` with a value that already contains the expected prepended entries (simulating a second-run scenario) and assert the output PATH has no duplicates.
- Single commit. Small change.
