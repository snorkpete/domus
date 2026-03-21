# Task: Rework domus init to handle current workspace structure and be idempotent

**ID:** rework-domus-init-to-handle-current-workspace-structure-and-be-idempotent
**Status:** done
**Autonomous:** true
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Rework `domus init` to match the current project-local workspace model. The old implementation assumed a global domus home with `projects/`, `worktrees/`, and a global config at `~/.config/domus/config.json`. None of that is relevant anymore. Init should create the actual `.domus/` structure used today, be safe to re-run at any time, and leave existing files untouched.

---

## Acceptance Criteria

- [ ] `domus init` must be run from the intended project root (no walk-up — this command is the exception)
- [ ] Creates any missing directories: `.domus/ideas/`, `.domus/tasks/`, `.domus/specs/`, `.domus/tags/`
- [ ] Creates any missing seed files: `.domus/tags/shared.md`, `.domus/tags/ideas.md`, `.domus/tags/tasks.md`, `.domus/ideas/ideas.jsonl`, `.domus/tasks/tasks.jsonl`
- [ ] Creates or updates `.claude/settings.json` at the project root:
  - Merges domus's required `permissions.allow` entries without clobbering other settings
  - Sets `env.PATH` to `process.env.PATH` at the time init is run
  - On re-run, updates `env.PATH` to current value but leaves all other settings untouched
  - Safe to run even if `.claude/settings.json` already exists with other content
- [ ] Prints a concise report of what was created vs. what already existed and was skipped
- [ ] Never destructive — existing files and directories are never overwritten or deleted
- [ ] No changes to `.gitignore` (`.domus/` is version-controlled)
- [ ] Nothing written to `~/.config/domus/` (global config model removed)

---

## Implementation Notes

### Cleanup (remove old model)
- Remove from `init.ts`: `WORKSPACE_DIRS`, `PROJECTS_MD`, `GITIGNORE` constants; `--force` flag handling; `confirmFn` option and `confirm()` helper; all calls to `writeWorkspaceConfig` / `readWorkspaceConfig`
- Remove from `workspace.ts`: `writeWorkspaceConfig` and `readWorkspaceConfig` exports
- Replace `resolveWorkspace()` in `workspace.ts` with a simple cwd-based check (verify `cwd/.domus/` exists, throw if not) — this is a placeholder until the walk-up task is implemented
- Update `init.test.ts`: delete tests covering removed behaviour (force, confirmFn, different-workspace prompt); add/update tests for new behaviour

### .claude/settings.json merge logic
Read existing file if present (default to `{}`), then:
- Ensure `permissions.allow` array exists and contains all required domus entries (dedup, don't remove others)
- Set `env.PATH` to `process.env.PATH`
- Write back

### Seed file content
`tags/shared.md` — generic controlled vocab, suitable for any software project:
```
# Shared Tag Vocabulary

Controlled tag list valid for all entity types (ideas, tasks, etc.). Only use tags from this list.
To add a new tag, add it here first, then use it.

`backend`, `frontend`, `infrastructure`, `devex`, `database`, `security`, `product`
```

`tags/ideas.md` and `tags/tasks.md` — heading only, empty vocab (project fills these in):
```
# Idea-Specific Tags

Tags valid only for ideas (in addition to shared tags). Currently empty.
```
```
# Task-Specific Tags

Tags valid only for tasks (in addition to shared tags). Currently empty.
```

`ideas/ideas.jsonl` and `tasks/tasks.jsonl` — empty files (zero bytes is fine).

### Walk-up behaviour
Out of scope for this task. Captured as a separate task: `domus-commands-walk-up-to-find-domus-directory`.
