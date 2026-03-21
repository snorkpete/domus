# 004 — domus store lives in the main working directory; workers log through domus commands

**Date:** 2026-03-15
**Status:** decided

## Decision

The `.domus/` store is never modified inside a worktree. All writes — task status, execution logs, audit events — go to the main working directory's `.domus/` store, regardless of where the worker is executing. Workers locate the main store via the `--root` flag on all domus commands (e.g. `domus --root /path/to/main task log <id> "message"`).

Two distinct log types exist alongside the existing task store:

- **Execution log** — `.domus/execution-logs/<id>.md`, one per task, version controlled. Workers append one entry per completed step. The last entry is where the next worker resumes. Written via `domus task log <id> <message>`.
- **Audit log** — `.domus/audit.jsonl`, global, git-ignored. One append per significant lifecycle event. Written via the same `domus task log` command, which does double duty — every call appends to the execution log and emits a structured event to the audit log.

`domus dispatch` validates the task is in a dispatchable state (`ready` + `autonomous: true`), then calls `domus task start` to mark it in-progress. The dispatch skill handles launching a Worker subagent with `isolation: "worktree"`, passing the task ID and `--root` path.

## Why

Workers run in isolated worktrees on their own branches. If each worktree maintained its own `.domus/` state, task status and logs would be invisible until the branch merged — useless for monitoring and resumability. Writing everything to the main working directory means the human always has a live view of what's happening.

Keeping worktree branches free of `.domus/` changes also means clean merges with no conflicts. The store and the code changes are separate concerns and should not be versioned together.

Two log types are necessary because they serve different consumers with different retention needs. The execution log is for the next worker — it must be version controlled so it's accessible in a fresh checkout. The audit log is for the human operator — it's operational data, not project history, so git-ignoring it is appropriate.

A single `domus task log` command writing to both logs eliminates the coordination burden from workers. One call, consistent schema, both consumers satisfied.

## Implications

- Workers must never write to `.domus/` in their own worktree. The `--root` flag is the only valid target.
- `domus dispatch` is the mandatory entry point for all autonomous execution. There is no other supported way to start a worker.
- Before dispatching workers, the operator must be on a non-protected branch. Workers branch off of the current HEAD. If the base is `main`/`master` and direct push is blocked, worker branches cannot be merged. This is an operator constraint — domus does not enforce it, but CLAUDE.md and the dispatch skill should prompt awareness of it.
- The execution log for a task is accessible mid-flight (it lives in the main working directory, not on the worker's branch). A new worker resuming a stalled task reads the log without needing to check out the previous branch.
- Execution logs accumulate across multiple resumptions. This is intentional — the full history of what was tried is more useful than a clean slate.
- The audit log will need periodic trimming. This is a maintenance task for the Doctor persona.
- `domus init` writes a `config.json` with the `root` path so any domus command, including those running inside a worktree, can resolve the main store path. Workers use the `--root` flag explicitly.
