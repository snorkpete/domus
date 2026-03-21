# Idea: Remove DOMUS_ROOT env var — use config.json + --root only

**Captured:** 2026-03-21
**Status:** raw

---

## The Idea

Currently workers receive their store path via the `DOMUS_ROOT` env var, set by dispatch. Replace this with a simpler protocol: workers read `root` from `.domus/config.json` (which is committed to git and available in worktrees), then use `--root` on all CLI commands. The env var is removed entirely.

---

## Why This Is Worth Doing

The env var is a leaky abstraction. Agents could set it themselves, bypass the CLI, or have it linger across sessions. `config.json` + `--root` is a single, explicit mechanism that's harder to misuse. It also means `cli.ts` doesn't need to translate between the two.

---

## Open Questions / Things to Explore

- Does `config.json` always reflect the correct root in worktrees? (Yes — it's committed, so worktree copies inherit it)
- Should `--root` become optional if config.json has a `root` field? (Probably — the CLI already falls back to config)
- What about the `projectRoot()` function in `jsonl.ts` that reads DOMUS_ROOT? Needs updating
