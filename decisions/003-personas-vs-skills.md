# 003 — Personas are for human conversations; everything else is code or skills

**Date:** 2026-03-15
**Status:** decided

## Decision

A persona is the right abstraction only when the value comes from a back-and-forth conversation with a human. Routing, scheduling, health checks, and dispatch are mechanical — they belong in code, skills, or CLAUDE.md instructions, not personas.

## Why

Personas that don't talk to humans are awkward. They need to be "launched," produce no conversational value, and add indirection without clarity. The Foreman is the canonical example: its job is to dispatch workers and prioritize queues — mechanical work that a `domus dispatch` command and a skill handles cleanly.

## Implications

- If a persona's primary job is routing or triggering something: make it a command + skill instead
- If a persona runs on a schedule without human input: it is a skill or a cron job, not a persona
- If a persona surfaces information to a human and then has a conversation about it: that is a legitimate persona
- Personas can invoke skills and commands. Skills and commands do not need personas.

## Applied

- **Foreman** — becomes `domus dispatch` (code) + a dispatch skill + CLAUDE.md instructions. Not a persona.
- **Herald** — stays a persona because it converses with the human about what it found. Its checks are implemented as skills it invokes at session start. Also composable: the same checks can run as a skill inside other sessions (e.g. Butler checks for issues on connect).
- **Doctor** — stays a persona because it surfaces findings and has a conversation about what to do next. Purely mechanical checks (index consistency, frontmatter validation) may eventually become a `domus doctor` CLI command that Doctor invokes.
