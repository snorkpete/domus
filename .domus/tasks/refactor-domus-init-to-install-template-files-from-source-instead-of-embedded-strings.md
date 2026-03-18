# Task: refactor domus init to install template files from source instead of embedded strings

**ID:** refactor-domus-init-to-install-template-files-from-source-instead-of-embedded-strings
**Status:** done
**Refinement:** autonomous
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
const content = await Bun.file(new URL("../templates/tags/shared.md", import.meta.url)).text();
```

(`import.meta.url` is relative to `src/commands/init.ts`, so `../templates/` = `src/templates/`.)

**Template directory layout** — mirror `.domus/` structure under `src/templates/`:
```
src/templates/
  tags/shared.md
  tags/ideas.md
  tags/tasks.md
  ideas/ideas.jsonl
  tasks/tasks.jsonl
  reference/agent-instructions.md   ← copy from .domus/reference/agent-instructions.md
```

**Seed map after migration:**
```ts
async function buildSeedFiles(): Promise<Record<string, string>> {
  return {
    ".domus/tags/shared.md":                    await Bun.file(new URL("../templates/tags/shared.md", import.meta.url)).text(),
    ".domus/tags/ideas.md":                     await Bun.file(new URL("../templates/tags/ideas.md", import.meta.url)).text(),
    ".domus/tags/tasks.md":                     await Bun.file(new URL("../templates/tags/tasks.md", import.meta.url)).text(),
    ".domus/ideas/ideas.jsonl":                 await Bun.file(new URL("../templates/ideas/ideas.jsonl", import.meta.url)).text(),
    ".domus/tasks/tasks.jsonl":                 await Bun.file(new URL("../templates/tasks/tasks.jsonl", import.meta.url)).text(),
    ".domus/reference/agent-instructions.md":   await Bun.file(new URL("../templates/reference/agent-instructions.md", import.meta.url)).text(),
  };
}
```

Replace the `SEED_FILES` constant with a call to `buildSeedFiles()` inside `runInit`.

**New test to add** (alongside existing tests in `init.test.ts`):
```ts
test("installs .domus/reference/agent-instructions.md", async () => {
  await runInit([], { projectPath: tempDir });
  const content = await readFile(join(tempDir, ".domus/reference/agent-instructions.md"), "utf-8");
  expect(content.length).toBeGreaterThan(0);
});
```

**Existing test coverage:** All 9 existing tests must continue to pass unchanged — they check directory creation, seed file content, settings.json merging, idempotency, and permission deduplication.
