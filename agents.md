# Domus — Agent Instructions

## What is this project?

Domus is a personal workflow and AI orchestration system — a meta-layer above all projects on a machine. It provides long-term memory and coordination across them. See `project_spec.md` for full system design.

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
