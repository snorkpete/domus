# Idea: Replace interactive personas with skills — roles as skill descriptions

**Captured:** 2026-03-22
**Status:** raw

---

## The Idea

The current architecture uses role files (`butler.md`, `foreman.md`, etc.) loaded via `@`-includes, with an activation table that routes intent to the right role. This is scaffolding that approximates what skills already do natively.

The simpler model: every interactive persona is implemented as a skill. "Role" remains valid as a conceptual label — Butler, Taskmaster, Oracle are still meaningful names that describe *what* a skill does. Skill is just *how* it's implemented. The skill description becomes the activation rule — Claude routes naturally, the same way it does for `capture-task` or `update-task-status` today.

**Butler as a skill:**
Butler is session management / context mobility. The capability set: preserve context, distinguish ideas from tasks, capture tasks and ideas, surface stalled work, run session recaps. That's a coherent skill — not a router to other roles. The routing happens naturally because the other skills exist and Claude picks the right one.

Ambient presence (always-loaded behavior) handled in two layers:
- CLAUDE.md contains standing instructions that load the first part of the Butler skill by default — session orientation, what to do at start/end
- Progressive disclosure handles the rest — deeper capabilities load based on need
- Role activation table becomes documentation-only (or disappears entirely); skill descriptions carry the activation logic

**Taskmaster as a skill:**
Taskmaster = task refinement. Still a skill, with domus-specific output (the task file) and execution mobility. The skill orchestrates multiple phases:
1. Interactive phase — skill collects context, asks the human clarifying questions
2. Background phase — skill hands off spec-writing to a background subagent that writes acceptance criteria, implementation notes, etc. directly to the task file
3. When the subagent finishes, task is marked `proposed` — human reviews and approves

The task file IS the plan. Unlike Claude's native plan mode (ephemeral, local, no schema), the task file is committed to the repo, travels with the project, is surfaced by the CLI, and feeds the dispatch pipeline. Multi-session continuation works because the output is durable — refine in one session, review in another, dispatch in a third. This is the advantage over plan mode, not a reason to merge with it.

**Oracle as a skill:**
Oracle is behavioral direction — stay exploratory, ask questions, don't jump to implementation. The role file exists because without it Claude defaults to solution mode. A skill with the right description handles this cleanly. Easiest migration candidate.

**Dispatch as a skill:**
Validates ready + autonomous, spawns worker subagent in worktree. Foreman role file becomes the skill. No separate role file needed.

**Distribution:**
Skills live in the domus repo (see `domus-skills-plugin-system` idea). Eventually: a Claude Code plugin for easier install and distribution.

---

## Why This Is Worth Doing

- Simpler mental model: domus = CLI + skills. Role is a concept, skill is the implementation. No dual-track (role files AND skills).
- Skills are explicit, versioned, testable. Role files are implicit and only work if Claude reads them at the right moment — the "did Butler load?" uncertainty goes away.
- Skill descriptions handle activation naturally — no activation table to maintain.
- Background worktree refinement (Taskmaster) means the human isn't blocked waiting for a spec to be written.
- Fewer moving parts: no `@`-include chain to debug, no role loading order to reason about.
- Aligns with the principle: rip out things Claude can do natively. Skills are native to Claude Code; role files are a workaround.

---

## Open Questions / Things to Explore

- How much of Butler's ambient behavior lives in CLAUDE.md standing instructions vs the skill itself? Where's the right split?
- Can CLAUDE.md load "part 1" of a skill without loading the full skill? Or does CLAUDE.md just have inline instructions that mirror the skill's always-present behavior?
- Can a skill spawn a background subagent in a worktree? (needed for Taskmaster's background spec-writing phase)
- If refinement happens in a background worktree, how does the human review the output — does the skill surface it in the same session, or just notify?
- Migration path: replace existing role files with skills one at a time, or run both in parallel while validating?
- Oracle seems like the easiest first candidate — validate the pattern there before tackling Taskmaster or Butler. If this idea moves forward, the first task would be: migrate Oracle fully to a skill and observe whether the UX is equivalent or better.
- Does the activation table disappear entirely, or does it become a reference document that documents skill triggers?
