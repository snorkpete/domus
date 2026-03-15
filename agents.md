# Domus — Agent Instructions

## What is this project?

Domus is a personal workflow and AI orchestration system — a meta-layer above all projects on a machine. It provides long-term memory and coordination across them. See `project_spec.md` for full system design.

**Vision:** Domus removes the human from the *execution* path without removing them from the *decision* path. Context mobility — the ability for any session to pick up any task without explanation — is what makes autonomous execution possible. Read `decisions/000-vision.md` when scoping new features, evaluating whether a proposed change fits the system's purpose, or when the right direction feels unclear.

## Stack

- **Language:** TypeScript
- **Runtime:** Bun (test runner, bundler, package manager — use Bun's native tooling, avoid unnecessary dependencies)
- **Linting/formatting:** Biome (`bun run lint`)

## Common commands

```bash
bun install       # install dependencies
bun run dev       # run CLI from source (no build step)
bun run build     # compile to dist/
bun test          # run all tests
bun run lint      # lint and format check
```

## Project structure

```
src/
  cli.ts          ← entry point: routing only, no business logic
  commands/       ← one file per subcommand
  lib/            ← shared utilities and helpers
  personas/       ← system prompt builders for Butler, Oracle, etc.
```

## Act, don't defer

If a task is within your capabilities, do it. Do not describe it as something the human needs to handle manually unless there is a genuine blocker (missing credentials, a required human decision, etc.). When in doubt, attempt the task and note any issues rather than pre-emptively handing it back.

## File and git operations

Use Claude's built-in tools (Write, Edit, Read) for file operations — not shell commands — wherever possible. This avoids permission prompts and is more reliable.

For git commits, use `git commit -m "title" -m "body"` directly. Do not use shell substitution (`$()`, heredocs, pipes) inside commit commands — it triggers permission prompts. If the message is complex, write it with the Write tool and use `git commit -F`.

When running git commands in a directory other than the current working directory, always use `git -C /path/to/repo <command>` — never `cd /path && git <command>`. The compound `cd && git` form triggers a security prompt on every use. `git -C` is equivalent and avoids the issue entirely.

## Worker autonomy

Workers operate autonomously — they must not pause mid-task for permission prompts. `.claude/settings.json` pre-approves the standard tool set (git, bun, file operations). Workers should proceed without requesting additional permissions for any command within that set.

If a task genuinely requires a tool outside the pre-approved set, note it in `WORKER_NOTES.md` at the repo root rather than prompting — the Foreman or human will handle it on the next pass.

## Conventions

- `src/cli.ts` is a router — it parses the top-level command and delegates. Implementations belong in `src/commands/`, not in `src/cli.ts`.
- Tests are co-located with source files (`*.test.ts`) and written first (TDD).
- Prefer Bun's native APIs (`Bun.file`, `Bun.spawn`, `Bun.spawnSync`) over adding packages.
- Targeted file edits over full rewrites — preserve context, don't regenerate.
- Aim for a single commit per ticket. If changes naturally require multiple commits, that is a signal the ticket may be too large — note it in `WORKER_NOTES.md`.

## Architectural decisions

Rationale behind key design decisions lives in `decisions/`. When something about the project structure or approach seems non-obvious, check there before making assumptions.
