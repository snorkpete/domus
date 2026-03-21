# Task: Migrate old task JSONL schema to new status lifecycle

**ID:** migrate-old-task-jsonl-schema-to-new-status-lifecycle
**Status:** done
**Branch:** task/migrate-old-task-jsonl-schema-to-new-status-lifecycle
**Autonomous:** true
**Priority:** high
**Captured:** 2026-03-21
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

Introduce `domus update` — a command that brings an existing `.domus/` store up to the current version of domus. It handles everything `domus init` does except setting the branch config. It also migrates user data (tasks, ideas) from previous schemas to the current one.

This unblocks running `domus update` on the everycent repo to migrate its tasks from the old `open`/`refinement` schema to the current `raw`/`proposed`/`ready`/`in-progress`/`done` + `autonomous` boolean schema.

Bump version to `0.0.1` (bug fix).

---

## Composable pieces

Extract the following from `init.ts` into `src/lib/update-steps.ts`:

- `ensureFolderStructure(projectPath)` — create missing dirs, idempotent
- `writeOwnedFiles(projectPath, { overwrite })` — write domus-owned files (roles, references, tags). `init` passes `overwrite: false` (skip existing); `update` passes `overwrite: true`
- `ensureAuditLog(projectPath)` — create audit.jsonl + .gitignore entry, idempotent
- `mergeClaudeSettings(projectPath)` — merge permissions + PATH, idempotent
- `setBranch(projectPath)` — write config.json with current branch
- `migrateTaskSchema(projectPath)` — migrate tasks.jsonl + individual .md files (see below)
- `migrateIdeaSchema(projectPath)` — no-op for now, reserved for future schema changes

**`init`** calls: `ensureFolderStructure` + `writeOwnedFiles({ overwrite: false })` + `ensureAuditLog` + `mergeClaudeSettings` + `setBranch`

**`update`** calls: `ensureFolderStructure` + `writeOwnedFiles({ overwrite: true })` + `ensureAuditLog` + `mergeClaudeSettings` + `migrateTaskSchema` + `migrateIdeaSchema`

---

## Task schema migration

### JSONL (`tasks.jsonl`)

Old schema has `status: "open" | "done" | "deferred"` and `refinement: "raw" | "autonomous"`. New schema has the full status lifecycle + `autonomous` boolean. Drop `refinement`.

Mapping:
- `open` + `refinement: raw` → `status: "raw"`, `autonomous: false`
- `open` + `refinement: autonomous` → `status: "ready"`, `autonomous: true`
- `done` → `status: "done"`, `autonomous: true`
- `deferred` → `status: "deferred"`, `autonomous: false`

If a record already has `autonomous` as a boolean and no `refinement` field, it is already on the new schema — skip it.

### Markdown frontmatter

Replace `**Refinement:** autonomous` → `**Autonomous:** true`
Replace `**Refinement:** raw` → `**Autonomous:** false`

If the `**Autonomous:**` line already exists, leave the file alone.

---

## Acceptance Criteria

- [ ] Composable steps extracted to `src/lib/update-steps.ts`; `init.ts` refactored to use them — behaviour unchanged
- [ ] `domus update` command implemented in `src/commands/update.ts`, wired into `src/cli.ts`
- [ ] `migrateTaskSchema` migrates both `tasks.jsonl` and individual `.md` files per the mapping above
- [ ] `migrateIdeaSchema` exists as a no-op
- [ ] Records already on the new schema are left untouched (idempotent)
- [ ] `domus update` reports what was updated (owned files overwritten, tasks migrated, ideas migrated)
- [ ] `package.json` version bumped to `0.0.1`
- [ ] `bun test` passes; existing `init` tests still pass
- [ ] New tests cover `migrateTaskSchema`: old→new mapping for each status, already-migrated no-op
