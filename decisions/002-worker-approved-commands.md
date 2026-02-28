# 002 — Workers use approved commands and tools only

**Date:** 2026-02-28
**Status:** decided

## Decision

Workers must not trigger permission prompts mid-task. The rule is simple: only use commands and tools that are pre-approved in `.claude/settings.json`, or use Claude's built-in tools (Read, Write, Edit, Glob, Grep, etc.) which never require shell permissions.

If a task requires something outside the approved set, do not prompt — note it in `WORKER_NOTES.md` and the Foreman or human will handle it on the next pass.

## In practice

- Prefer Claude's built-in tools (Write, Edit) over shell commands for file creation and modification
- `git commit -m "title" -m "body"` works without any substitution — no temp files needed
- Avoid shell constructs like `$()`, `${}`, heredocs, or pipes that chain unapproved commands
- When in doubt: if it would require a permission prompt, find a different approach

## Why

Workers are autonomous. A permission prompt is a full stop — it blocks execution and defeats the purpose of the system.
