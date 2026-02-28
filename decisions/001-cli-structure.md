# 001 — CLI entry point is routing only

**Date:** 2026-02-28
**Status:** decided

## Decision

`src/cli.ts` handles argument parsing and command routing only. All command implementations live in `src/commands/`, one file per subcommand.

## Why

As commands are implemented, `src/cli.ts` would become unwieldy if it also held business logic. Keeping it as a pure router means it remains readable as a map of the CLI surface — you can see every command at a glance without scrolling through implementations.

Each `src/commands/<name>.ts` file is then self-contained: its logic, helpers, and tests (`<name>.test.ts`) live together.

## Implications

- `src/cli.ts` imports and calls handler functions — it does not implement them
- Adding a new command means: add the route in `cli.ts`, create `src/commands/<name>.ts`
- Tests for a command live in `src/commands/<name>.test.ts`, not in `src/cli.test.ts`
