# ADR 007 — Project Memory Lives in the Repo

**Status:** Decided
**Date:** 2026-03-18

---

## Context

Claude's auto-memory system stores project context in `~/.claude/projects/<project>/memory/` — machine-local, not versioned. This conflicts with Domus's core principle of context mobility: any session on any machine should be able to pick up any task without explanation.

Project memory (architectural decisions, what's been settled, what's next, reference pointers) is exactly the kind of context that should travel with the repo, not stay on one machine.

---

## Decision

Project memory lives in `.domus/memory/`. It is version-controlled and travels with the repo.

**Loading:** `agents.md` includes `@.domus/memory/MEMORY.md`. Since `agents.md` is already `@`-included by `CLAUDE.md`, the full include chain loads automatically in every session — no per-machine config required.

**`domus init`** creates `.domus/memory/MEMORY.md` (empty index) and appends `@.domus/memory/MEMORY.md` to `agents.md`.

---

## Memory split

| Location | Term | What goes here |
|----------|------|----------------|
| `.domus/memory/` | **project memory** | Architectural decisions, settled design, reference pointers, project-workflow feedback |
| `~/.claude/projects/.../memory/` | **local memory** | Personal preferences, user behavior feedback, anything that doesn't apply to all sessions on this project |

The axis is **travels vs stays local**, not "project vs personal." The question to ask: *would any session working on this project benefit from knowing this?* If yes → project memory. If it's about how a specific person likes to work → local memory.

---

## Capture routing

The capture skill routes silently using the heuristic above, announces which store it wrote to, and lets the user correct if wrong. No prompt on every capture — ask forgiveness, not permission.

Memory type defaults:
- `project`, `reference` → project memory (always)
- `user` → local memory (always)
- `feedback` — project-workflow → project memory; personal behavior → local memory

---

## What this is not

- `.domus/memory/` is **not gitignored** — versioned memory is the point
- Memory commits are not noise; they are decisions being recorded
- This does not replace `CLAUDE.md` or `agents.md` — those are instructions, this is context

---

## Deferred

Stale reads in worktrees: workers run in worktrees where `agents.md`'s `@`-include resolves to the worktree's `.domus/memory/`, which may lag behind main. Tracked in `.domus/reference/deferred-decisions.md`. Waiting for a real occurrence before acting.

---

## Consequences

- New sessions on any machine get full project context automatically after cloning
- Context mobility extends to memory itself — aligns with the Domus vision
- `domus init` scope grows slightly (create dir + seed index + patch `agents.md`)
- Existing project memory must be migrated from local Claude memory to `.domus/memory/`
- Capture skill needs routing logic and store announcement
