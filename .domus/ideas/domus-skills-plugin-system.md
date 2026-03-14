# Idea: Domus Skills Plugin System

**Captured:** 2026-03-14
**Status:** raw

---

## The Idea

Package domus-related Claude skills (e.g. `capture-task`, `update-task-status`, `task-ready`, `capture-idea`) inside the `~/code/domus` repo itself, and provide a `domus install` (or similar) command that provisions them into `~/.claude/skills/`. Skills become versioned alongside the CLI rather than manually maintained files scattered in `~/.claude/skills/`.

---

## Why This Is Worth Doing

Currently, skills must be manually created and updated in `~/.claude/skills/` — they're decoupled from the domus repo that defines the CLI they wrap. This creates drift risk (skill calls a CLI flag that no longer exists, or a new CLI command has no skill). Bundling skills in the repo means they ship together, can be reviewed in the same PR, and can be installed on a new machine with a single command.

---

## Open Questions / Things to Explore

- Where do skills live in the repo? `skills/` directory at root, or `src/skills/`?
- Is `domus install` the right command, or `domus skills install`? Should it be idempotent (safe to re-run)?
- Should install symlink (live-from-source like the CLI) or copy? Symlink = always up-to-date; copy = explicit version snapshot.
- Scope: install only domus skills, or also support project-local skills (per `.domus/skills/`)?
- How does this interact with multi-project setups — install once globally, or per-project?
- Should skills declare their CLI version dependency so `domus install` can warn on mismatch?
