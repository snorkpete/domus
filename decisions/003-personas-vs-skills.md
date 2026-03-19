# 003 — Roles: some implemented as personas, some as skills

**Date:** 2026-03-15
**Updated:** 2026-03-18
**Status:** decided

## Decision

Each member of the Domus staff is a **role** — a named function with defined responsibilities. Roles are implemented as either a **persona** (takes over the full session) or a **skill** (invoked at specific moments). The distinction is invisible in most conversations; it only matters when discussing implementation.

A persona is the right implementation when the value comes from sustained back-and-forth with a human across a whole session. A skill is the right implementation when the role activates at a specific moment, invokes a capability, and hands back control.

## Why

Roles that don't sustain a conversation are awkward as personas — they need to be "launched," produce no conversational value, and add indirection without clarity. Butler is the canonical example: its job is to load the right context and hand off — that's a skill invocation at session start, not a persona to inhabit.

Conversely, roles that shape an entire working mode (Oracle, Taskmaster, Worker) benefit from the full behavioral commitment of a persona.

## Applied

| Role | Implementation | Reason |
|------|---------------|--------|
| Oracle | Persona | Shapes the full ideation session — sustained conversation |
| Taskmaster | Persona | Two-phase refinement session, always human-in-the-loop |
| Worker | Persona | Autonomous execution mode — full behavioral commitment, no mid-task switching |
| Doctor | Persona | Surfaces findings and converses about what to do next |
| Butler | Skill | Session setup and role-loading — invoked at start, then hands off |
| Herald | Skill | Surfaces signals at specific moments within a session, doesn't own the session |
| Foreman | Skill | Pipeline management — dispatch, advance, manual controls — mechanical, not conversational |

## Terminology

- **Staff** — the full collection of all roles
- **Role** — any individual member of the staff (Butler, Oracle, Worker, etc.) — use this by default
- **Persona** — implementation detail: a role that takes over the full session
- **Skill** — two meanings: (1) implementation detail for roles that activate at specific moments; (2) helper utilities (capture-task, update-task-status, etc.) — context makes it clear which is meant
