# 002 — Git commits must not use command substitution

**Date:** 2026-02-28
**Status:** decided

## Decision

Workers must not use `$()` command substitution in git commit commands. Use `printf` to write the commit message to a temp file and commit with `git commit -F`:

```bash
printf 'title\n\nbody' > /tmp/commit-msg.txt
git commit -F /tmp/commit-msg.txt
rm /tmp/commit-msg.txt
```

## Why

`$()` substitution triggers a Claude Code permission prompt, which blocks autonomous worker execution. Workers must be able to commit without any human interaction.

## Applies to

All workers operating in any Domus-managed project.
