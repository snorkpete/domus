# Idea: Explicit domus update command with set-branch

**Captured:** 2026-03-21
**Status:** raw

---

## The Idea

Right now `domus init` doubles as both first-time setup and re-configuration (e.g. updating base branch in config.json). Introduce an explicit `domus update` command (or similar) that owns the re-configuration path — things like `domus update set-branch main`. `domus init` stays focused on first-time directory creation.

---

## Why This Is Worth Doing

Using `init` for updates is confusing — the name implies first-time setup. As more configurable settings emerge (branch, permissions, template syncing), having a dedicated update surface keeps the CLI semantics clean and makes it obvious what's a one-time action vs an ongoing configuration change.

---

## Open Questions / Things to Explore

- What's the right command name? `domus update`, `domus config`, `domus set`?
- Which settings belong here vs in config files edited directly?
- Should `domus init` warn or redirect if `.domus/` already exists?
