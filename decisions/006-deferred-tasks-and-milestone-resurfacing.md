# ADR 006 — Deferred Tasks and Milestone Resurfacing

## Status

Accepted

## Context

The task list grows faster than work gets done. Without a principled way to manage scope, the active task list becomes noisy — full of valid work that isn't relevant right now — and harder to read at a glance. This noise makes it harder to see what's actually in flight and what's truly next.

Two failure modes exist:
- **Graveyard**: tasks get deferred and forgotten. No mechanism brings them back.
- **Noise**: every valid-but-not-now task stays open, polluting the active list and making prioritisation harder.

This ADR defines what `deferred` means, how it differs from `cancelled`, and when deferred tasks get resurfaced.

## Decision

### `deferred` means out of scope for now, not abandoned

A task is `deferred` when it is valid work that we intend to revisit but is not on the active critical path. Deferring is an explicit signal: "this is real, but not now."

The active task list — what `domus task overview` shows — should reflect only work that is in flight or immediately next. Everything else should be deferred or cancelled.

### `cancelled` means no longer valid

A task is `cancelled` when the work is superseded, the direction changed, or it was never going to happen. Cancelled tasks are kept for audit purposes but are not candidates for resurfacing.

### The active list is intentionally narrow

When starting work on a milestone or sprint, tasks not on the critical path for that milestone should be deferred. The goal is a task overview that tells a clear story about current work — not a comprehensive registry of all possible future work.

### Resurfacing is a defined step, not ad hoc

Deferred tasks are reviewed at two trigger points:

1. **Milestone completion** — when a major piece of work lands (a parent task closes, a significant feature ships), the next session includes a pass over deferred tasks: does anything now become relevant? Does anything get cancelled in light of what changed?

2. **Herald sessions** — Herald is responsible for surfacing deferred tasks that have been dormant past a reasonable threshold, or that become relevant due to completed dependencies. Herald does not resurface everything — it filters for signal.

Doctor may flag a bloated deferred list as a system health issue.

### Who owns resurfacing

- **Herald** — periodic resurfacing on cadence and at milestone boundaries
- **Doctor** — flags deferred list health (size, staleness, blocked-but-deferred)
- **Human** — makes the final call on what moves from deferred to active

## Consequences

- The active task list stays lean and readable
- Deferred tasks are not forgotten — they have a defined re-entry path
- "What's next?" sessions (Herald, Doctor, task-ready skill) have a clear scope: active tasks first, then deferred candidates
- The distinction between `deferred` (valid, revisit) and `cancelled` (invalid, archive) is explicit and enforced by convention
