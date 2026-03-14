# Task: Add --depends-on flag to domus task update

**ID:** add-depends-on-flag-to-domus-task-update
**Status:** done
**Refinement:** autonomous
**Priority:** normal
**Captured:** 2026-03-14
**Parent:** none
**Depends on:** none
**Idea:** none
**Spec refs:** none

---

## What This Task Is

`domus task update` currently supports `--title`, `--summary`, `--tags`, `--priority`, and `--refinement`, but has no way to set or change `depends_on` after task creation. Adding `--depends-on <id1,id2>` closes this gap and keeps the workflow inside the CLI (no direct file edits needed).

The flag replaces the existing list (consistent with how `--tags` works — not append, replace).

---

## Acceptance Criteria

- [ ] `domus task update <id> --depends-on <id1,id2>` updates `depends_on` in the JSONL entry
- [ ] The `.md` file `**Depends on:**` header line is updated to match
- [ ] Comma-separated list is parsed and trimmed (same as `--tags`)
- [ ] `--depends-on ""` or `--depends-on` with empty input clears the list (sets to `[]` / `none`)
- [ ] Passing `--depends-on` alone (without other flags) is accepted as a valid update (does not trigger "nothing to update" exit)
- [ ] Idempotent: running the same command twice leaves the task unchanged
- [ ] Existing behaviour for all other flags is unaffected

---

## Implementation Notes

### Change to `cmdUpdate` in `src/commands/task.ts`

**1. Parse the new flag** (add after `newRefinement` line):

```ts
const newDependsOn = parseFlag(args, "--depends-on");
```

Note: `parseFlag` returns `null` when the flag is absent. An empty string (`""`) is a valid value meaning "clear all deps". Use `!== null` checks, not truthiness checks.

**2. Update the "nothing to update" guard** (add `newDependsOn` to the condition):

```ts
if (!newTitle && !newSummary && !newTags && !newPriority && !newRefinement && newDependsOn === null) {
```

**3. Apply the update to the task entry**:

```ts
if (newDependsOn !== null) {
  task.depends_on = newDependsOn
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}
```

**4. Sync the `.md` header line** (add inside the `existsSync` block, alongside the other regex replacements):

```ts
if (newDependsOn !== null) {
  const dependsOnStr = task.depends_on.length > 0 ? task.depends_on.join(", ") : "none";
  content = content.replace(/^\*\*Depends on:\*\* .+$/m, `**Depends on:** ${dependsOnStr}`);
}
```

**5. Update the usage string** in `TASK_USAGE` and `cmdUpdate`'s error message to include `[--depends-on <id1,id2>]`.

### Test cases to add to `task.test.ts`

Add these in the `// ── update ──` section, following the existing pattern:

```ts
test("update: updates depends_on in JSONL and .md", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--depends-on", "other-task,another-task"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].depends_on).toEqual(["other-task", "another-task"]);

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Depends on:** other-task, another-task");
});

test("update: clears depends_on when passed empty string", async () => {
  await runTask(["add", "--title", "My Task", "--depends-on", "blocker"]);
  await runTask(["update", "my-task", "--depends-on", ""]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].depends_on).toEqual([]);

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Depends on:** none");
});

test("update: accepts --depends-on as the only flag", async () => {
  await runTask(["add", "--title", "My Task"]);
  // should NOT exit — depends-on alone is a valid update
  await runTask(["update", "my-task", "--depends-on", "blocker"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].depends_on).toEqual(["blocker"]);
});

test("update: depends_on is idempotent", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--depends-on", "blocker"]);
  await runTask(["update", "my-task", "--depends-on", "blocker"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].depends_on).toEqual(["blocker"]);
});
```

### Gotcha: `parseFlag` returns `null` vs `undefined`

The existing `newTags` check uses truthiness (`if (newTags)`), which would incorrectly skip an empty string. For `depends_on` the empty-string-clears case matters, so the implementation must use `!== null` throughout. This is called out in both the guard and the apply step above.
