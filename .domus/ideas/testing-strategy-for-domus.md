# Idea: Testing strategy for domus

**Captured:** 2026-03-14
**Status:** raw

---

## The Idea

Define a comprehensive testing strategy for the domus CLI and workflow system. Three levels to think through:

1. **Unit tests** — not yet implemented but straightforward. Test individual functions in isolation (JSONL read/write, ID generation, status transitions, flag parsing, etc.). Bun has a built-in test runner.

2. **Integration / deeper analysis** — some functionality is harder to unit test cleanly. CLI subcommands interact with the filesystem; some commands shell out to Claude Code (`launchSession`). Need to think about what "correct" looks like at this level and how to assert it.

3. **E2E tests** — the full `domus <command>` invocation through to filesystem output. Unclear approach: is there an existing Bun-friendly CLI testing harness, or does this need a custom test runner that spawns the CLI and asserts on stdout + file state?

---

## Why This Is Worth Doing

Domus is growing — more subcommands, more file mutations, more inter-command dependencies. Without tests, regressions are silent. The stakes are higher than a typical side project because domus mediates Claude's workflow; a bug in `domus task status` caused a real data integrity issue (JSONL out of sync with md file) that went undetected. Tests would have caught that.

There's also a meta-angle: domus is a learning project about building around AI agents. Part of that is understanding how to test systems that involve AI — and the CLI layer (which doesn't involve AI directly) is the easy part to get right first.

---

## Open Questions / Things to Explore

- What Bun-native tools exist for CLI E2E testing? (`bun test` + `Bun.spawn` for subprocess invocation?)
- For commands that call `launchSession` (Claude Code), how do we test those without actually launching Claude? Mock the session launcher?
- Should E2E tests run against a temp directory to avoid polluting real `.domus/` state?
- Is there value in property-based testing for JSONL round-tripping and ID generation?
- What's the right order: unit tests first to build confidence, then E2E? Or start with E2E since that's the user-facing contract? **Answered: unit tests first.**
