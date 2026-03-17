# 005 — Execution Engine and Progress Mobility

**Date:** 2026-03-16
**Status:** decided

## The problem

Autonomous task execution requires more than a single worker doing everything. A task has distinct phases — implementation, senior code review, human review, merge — each better handled by a focused agent with the right context and instructions. But handing a task from one agent to another requires that the receiving agent know exactly where things stand: what has been done, what decisions were made, what remains.

Without a handoff mechanism, every new agent starts from scratch. The human becomes the relay — briefing each agent in turn, which is exactly the bottleneck domus exists to eliminate.

## Progress mobility

Context mobility (ADR 000) lets any *session* pick up any *task* without explanation. Progress mobility extends this: any *worker persona* can pick up any *task at any step* without explanation.

The mechanism is the execution log: `.domus/execution-logs/<task-id>.md`. Every significant step in a task's execution is appended to this log — what was done, decisions made, output produced. When a new worker persona starts, it reads the execution log and knows exactly where to resume.

The execution log is not a debugging aid. It is the shared context that makes the execution engine composable.

## The execution engine

Autonomous execution is a state machine. Domus owns the state transitions. Personas own the execution logic within each state.

### Task status lifecycle

```
open → in-progress → ready-for-senior-review → ready-for-manual-review → done
                              ↑                          |
                              └──────────────────────────┘
                                    (human sends back)
```

- **open** — task exists, work has not started
- **in-progress** — active work is happening or has happened; resuming picks up here
- **ready-for-senior-review** — implementation committed; senior reviewer checks for existing MR comments and applies them if found, otherwise reviews code and applies updates, then advances
- **ready-for-manual-review** — human reviews; can approve (→ done) or send back (→ ready-for-senior-review). Human triggers these transitions via foreman skills. Not present in v0 — added in v0.1.
- **done** — code merged

`cancelled` and `deferred` are available at any state as escape hatches.
- **cancelled** — work will not happen; task is closed permanently
- **deferred** — work is paused; task remains available for future consideration

### The foreman skill

The foreman is not a persona. It is a single skill with multiple capabilities.

**Shared capabilities** — used by workers automatically, but also available to humans for supervised tasks:
- **Route** — read task status and execution log, determine where the task stands, load the appropriate persona
  - `open` or `in-progress` → load executor persona (check execution log; resume if entries exist)
  - `ready-for-senior-review` → load senior reviewer persona
  - `ready-for-manual-review` → do nothing; await human action
- **Advance** — "next state" trigger; transitions the task forward at natural checkpoints. Wraps the appropriate `domus task status` call so state and logs stay consistent.

**Human-facing capabilities** — must be used by the human to ensure state and logs stay consistent:
- **Send back** — transitions `ready-for-manual-review` → `ready-for-senior-review`
- **Merge and close** — merges code and marks task done

Adding a new execution phase means: new persona + update foreman routing + new status transition in domus. The surface area is intentionally small.

### Domus as state machine glue

Domus does not orchestrate execution. It owns state transitions and logging. The CLI provides:

- `domus task start <id> --branch <branch>` — marks in-progress, records branch, creates execution log. Called by Claude after the worktree and branch are created.
- `domus task log <id> <message>` — appends timestamped entry to execution log and audit log
- `domus task status <id> <new-status>` — transitions state with validation

Personas call these at known checkpoints. Domus ensures the transitions are consistent regardless of which persona made them.

### domus dispatch

`domus dispatch <task-id>` is a thin trigger — not an orchestrator. It:
1. Validates the task is in a dispatchable state
2. Hands off to Claude (task-id + worker persona)

Worktree creation, branch management, context assembly, and calling `domus task start` are Claude's responsibility. Claude has native worktree support; domus should not replicate it. The foreman skill is baked into the worker persona — dispatch does not load it separately.

## Execution modes (v0 → long term)

**v0 (now):** Worker does everything in a single agent invocation (implement, review, commit). Foreman loads and routes to executor, which handles it all.

**v0.1:** Split executor and reviewer into separate invocations. Execution log is the handoff. Human review step added as an optional gate — `ready-for-manual-review` triggers an MR/PR notification; human uses foreman skills to approve or send back.

**v0.2+:** Execution profiles become first-class. A profile defines which states and transitions are possible — larger profiles mean fewer states (capable models, faster execution), smaller profiles mean more states (specialized personas, cheaper models). Profiles can be configured per task.

**Long term:** Each phase can be a separate Claude instance with fresh context, reducing context bloat. Failure recovery is handled by the executor: on resume, it reads the execution log, commit history, and current code state to pick up where prior work left off. Parallel execution across tasks becomes possible — each task runs its own state machine independently; within a task, execution remains serial. Foreman routing is a rules engine: ordered rules mapped to personas, with a default fallback. Non-interactive (background) execution becomes possible once observability is in place; the audit log (in place from v0) is the foundation — UX (dashboards, notifications) to be defined once we understand what's needed in practice.

## Why this matters

Progress mobility + the state machine model means the execution engine is open-ended by construction. New phases slot in without restructuring existing ones. Execution profiles let the engine scale in either direction — fewer states with capable models for speed, more states with specialized models for cost efficiency — without changing the underlying architecture. Parallel execution across tasks becomes a natural extension of the same model: each task runs its own state machine, independently.

The human stays on the decision path (what gets built, what gets merged) without sitting on the execution path.

The execution log is how this works. Without it, every phase transition requires human narration. With it, the system is self-describing.
