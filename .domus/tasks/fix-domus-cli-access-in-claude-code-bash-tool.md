# Task: Fix domus CLI access in Claude Code Bash tool

**ID:** fix-domus-cli-access-in-claude-code-bash-tool
**Status:** done
**Autonomous:** false
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

The Bash tool runs zsh non-interactively (no `.zshrc` sourced), so `~/.bun/bin` was never added to PATH. `domus` and `bun` were therefore not found.

---

## Acceptance Criteria

- [x] `domus` resolves in the Bash tool without full path workarounds
- [x] No symlinks in system directories (`/opt/homebrew/bin`, `/usr/local/bin`)

---

## Implementation Notes

**Solution:** Added an `env` block to `~/.claude/settings.json` with an explicit PATH that includes `~/.bun/bin` at the front. Claude Code applies this env to all Bash tool invocations.

```json
"env": {
  "PATH": "/Users/kion/.bun/bin:/Users/kion/.local/bin:..."
}
```

This is the right fix — addresses the root cause (Bash tool env setup) rather than patching around it with symlinks. Verified working after restarting Claude Code.
