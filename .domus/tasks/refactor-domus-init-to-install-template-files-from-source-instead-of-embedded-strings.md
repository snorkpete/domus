# Task: refactor domus init to install template files from source instead of embedded strings

**ID:** refactor-domus-init-to-install-template-files-from-source-instead-of-embedded-strings
**Status:** open
**Refinement:** proposed
**Priority:** high
**Captured:** 2026-03-16
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

`domus init` currently uses a `SEED_FILES` constant with template content embedded as strings in `init.ts`. This is an anti-pattern — content drifts from the actual source files, and changes to templates require remembering to update both the file and the embedded string. Replace with file-based embedding via `import.meta.url` so the source files are the single source of truth. Bun embeds the content at compile time for binaries, and reads from disk in dev mode.

Also add installation of `.domus/reference/agent-instructions.md` — the domus workflow instructions file that sessions load via `@.domus/reference/agent-instructions.md` in a project's `agents.md`.

---

## Acceptance Criteria

- [ ] `SEED_FILES` embedded strings replaced with file reads using `Bun.file(new URL("../../path/to/template", import.meta.url)).text()`
- [ ] All existing seed file templates extracted to `src/templates/` (or similar) as actual files
- [ ] `.domus/reference/` added to `DOMUS_DIRS`
- [ ] `domus init` installs `.domus/reference/agent-instructions.md` from `src/templates/domus/reference/agent-instructions.md` (or equivalent path)
- [ ] Idempotent — re-running init skips already-existing files as before
- [ ] All existing `init.test.ts` tests pass
- [ ] Compiled binary (`bun build`) correctly embeds template files

---

## Implementation Notes

Pattern for file-based embedding in Bun (works in both dev and compiled binary):
```ts
const content = await Bun.file(new URL("../../src/templates/tags/shared.md", import.meta.url)).text();
```

Source for `agent-instructions.md` template: `.domus/reference/agent-instructions.md` in this repo is the canonical file — copy it to `src/templates/domus/reference/agent-instructions.md` as the template path, or reference it directly if the path works cleanly.

Existing `SEED_FILES` entries to migrate: `tags/shared.md`, `tags/ideas.md`, `tags/tasks.md`, `ideas/ideas.jsonl`, `tasks/tasks.jsonl`.
