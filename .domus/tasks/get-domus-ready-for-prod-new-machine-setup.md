# Task: Get domus ready for prod / new machine setup

**ID:** get-domus-ready-for-prod-new-machine-setup
**Status:** open
**Refinement:** autonomous
**Priority:** high
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** migrate-dispatch-from-ticket-format-to-task-file-format, fix-skill-frontmatter-triggers-to-cover-agent-invocation-scenarios, add-docscli-referencemd-with-domus-cli-usage-patterns, refactor-domus-init-to-install-template-files-from-source-instead-of-embedded-strings, add-domus_root-to-domus-init-config
**Idea:** none
**Spec refs:** decisions/000-vision.md, decisions/004-domus-store-and-worker-logging.md

---

## What This Task Is

Make domus installable from scratch on a new machine. Right now there are too many undocumented manual steps. Fix that with three deliverables:

1. **`setup/skills/`** — commit the required Claude Code skills into the repo so they can be copied to `~/.claude/skills/`
2. **`setup/agents-md-instructions/`** — a single reference line to add to a project's `agents.md` or `CLAUDE.md`: `@.domus/reference/agent-instructions.md`. The actual content lives in `.domus/reference/agent-instructions.md`, which `domus init` installs into the project.
3. **README.md** — full documentation covering concepts, vision, what's currently built, disclaimer, and step-by-step install/setup instructions

`domus init` already handles PATH (writes env block to `.claude/settings.json`) and `.domus/` structure. It does **not** touch `CLAUDE.md` — that's intentional, instructions go in `setup/` instead.

---

## Acceptance Criteria

- [ ] `setup/skills/` contains a subdirectory per required skill, each with its `SKILL.md`, matching what lives in `~/.claude/skills/` on this machine
- [ ] `setup/agents-md-instructions/` contains a single line: `@.domus/reference/agent-instructions.md`
- [ ] `.domus/reference/agent-instructions.md` exists in the repo and contains (using progressive disclosure):
  - [ ] Vision summary inline (2-3 sentences: what domus is, context mobility framing)
  - [ ] Task refinement lifecycle: `raw → proposed → refined → autonomous` with semantics for each
  - [ ] Task status values: valid statuses and what they mean
  - [ ] Ideas vs tasks distinction
  - [ ] Task file editing rules (metadata via CLI, body via direct edit)
  - [ ] Conditional pointers to deeper context — each says *when* to follow it
- [ ] `domus init` copies `.domus/reference/agent-instructions.md` from the domus installation into the target project's `.domus/reference/`
- [ ] `agents.md` in the domus repo references it via `@.domus/reference/agent-instructions.md` (already done)
- [ ] `README.md` exists at the repo root with all sections below
- [ ] README: **What is domus** — concepts (context mobility, four pillars), what it does, how it fits into a Claude Code workflow
- [ ] README: **Vision** — long-term direction, honest about current state vs. destination
- [ ] README: **Disclaimer** — AI workflow learning project; primary purpose is to learn what it means to build with and around agents; no commitment to long-term maintenance; likely to be abandoned when the learnings are exhausted or a maintained equivalent exists
- [ ] README: **Global installation** — bun install, clone, `bun install`, `bun link`, copy `setup/skills/*` to `~/.claude/skills/`
- [ ] README: **Per-project setup** — copy `setup/agents-md-instructions/` content into `agents.md`/`CLAUDE.md`, run `domus init` (which handles PATH + `.claude/settings.json` + `.domus/` structure)
- [ ] README: **What's currently available** — honest summary of implemented commands and their state

---

## Implementation Notes

Skills on this machine at `~/.claude/skills/`:
- `capture-task`
- `capture-idea`
- `update-task-status`
- `task-ready`
- `idea-refined`
- `memory-cleanup`
- `update-idea`

The PATH fix (env block in `~/.claude/settings.json`) is already documented in the task `fix-domus-cli-access-in-claude-code-bash-tool`. `domus init` writes the same env block into the project's `.claude/settings.json`. To verify: run `domus init` in a temp directory and confirm `.claude/settings.json` contains the `env` block with the correct PATH entry. Document the behaviour (not the verification step) in the README.

Do not have `domus init` touch `CLAUDE.md`. Users may use `agents.md`, `CLAUDE.md`, a global vs. project-local setup, or something else entirely. Keep it instructions-only via `setup/`.
