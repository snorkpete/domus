import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveDomusPermission, runInit } from "./init.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "domus-init-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

test("creates .domus/ directory structure", async () => {
  await runInit([], { projectPath: tempDir });

  for (const dir of [
    ".domus/ideas",
    ".domus/tasks",
    ".domus/specs",
    ".domus/tags",
  ]) {
    expect(existsSync(join(tempDir, dir))).toBe(true);
  }
});

test("creates seed files with correct content", async () => {
  await runInit([], { projectPath: tempDir });

  const shared = await readFile(join(tempDir, ".domus/tags/shared.md"), "utf-8");
  expect(shared).toContain("Shared Tag Vocabulary");
  expect(shared).toContain("backend");

  const ideas = await readFile(join(tempDir, ".domus/tags/ideas.md"), "utf-8");
  expect(ideas).toContain("Idea-Specific Tags");

  const tasks = await readFile(join(tempDir, ".domus/tags/tasks.md"), "utf-8");
  expect(tasks).toContain("Task-Specific Tags");

  expect(existsSync(join(tempDir, ".domus/ideas/ideas.jsonl"))).toBe(true);
  expect(existsSync(join(tempDir, ".domus/tasks/tasks.jsonl"))).toBe(true);
});

test("creates .claude/settings.json with required permissions and PATH", async () => {
  await runInit([], { projectPath: tempDir });

  const settings = JSON.parse(
    await readFile(join(tempDir, ".claude/settings.json"), "utf-8"),
  );
  expect(settings.permissions.allow).toContain("Read");
  expect(settings.permissions.allow).toContain("Write");
  expect(settings.permissions.allow).toContain("Bash(git *)");
  expect(settings.env.PATH).toBe(process.env.PATH);
});

test("merges into existing .claude/settings.json without clobbering other settings", async () => {
  await mkdir(join(tempDir, ".claude"), { recursive: true });
  const existing = {
    theme: "dark",
    permissions: { allow: ["MyCustomRule"] },
    env: { CUSTOM_VAR: "hello" },
  };
  await writeFile(
    join(tempDir, ".claude/settings.json"),
    JSON.stringify(existing, null, 2),
    "utf-8",
  );

  await runInit([], { projectPath: tempDir });

  const settings = JSON.parse(
    await readFile(join(tempDir, ".claude/settings.json"), "utf-8"),
  );
  expect(settings.theme).toBe("dark");
  expect(settings.env.CUSTOM_VAR).toBe("hello");
  expect(settings.permissions.allow).toContain("MyCustomRule");
  expect(settings.permissions.allow).toContain("Read");
});

test("is idempotent — second run does not overwrite existing seed files", async () => {
  await runInit([], { projectPath: tempDir });

  const sharedPath = join(tempDir, ".domus/tags/shared.md");
  await writeFile(sharedPath, "custom content", "utf-8");

  await runInit([], { projectPath: tempDir });

  const content = await readFile(sharedPath, "utf-8");
  expect(content).toBe("custom content");
});

test("updates PATH on re-run without touching other settings", async () => {
  await runInit([], { projectPath: tempDir });

  const originalPath = process.env.PATH;
  process.env.PATH = "/new/path:/bin";

  try {
    await runInit([], { projectPath: tempDir });
  } finally {
    process.env.PATH = originalPath;
  }

  const settings = JSON.parse(
    await readFile(join(tempDir, ".claude/settings.json"), "utf-8"),
  );
  expect(settings.env.PATH).toBe("/new/path:/bin");
});

test("resolveDomusPermission returns null when domus is not in PATH and argv1 is dev mode", async () => {
  const noWhich = () => null;
  expect(await resolveDomusPermission("/path/to/cli.ts", noWhich)).toBeNull();
  expect(await resolveDomusPermission("", noWhich)).toBeNull();
});

test("resolveDomusPermission uses Bun.which result when domus is in PATH", async () => {
  const result = await resolveDomusPermission("", () => "/usr/local/bin/domus");
  expect(result).toBe("Bash(/usr/local/bin/domus:*)");
});

test("resolveDomusPermission falls back to argv1 when domus is not in PATH", async () => {
  const bunBin = process.execPath;
  const result = await resolveDomusPermission(bunBin, () => null);
  expect(result).not.toBeNull();
  expect(result).toMatch(/^Bash\(.+:\*\)$/);
});

test("resolveDomusPermission ignores .ts Bun.which result (bun link edge case)", async () => {
  const noWhich = () => null;
  // If which returns a .ts path (shouldn't happen but defensive), fall through to argv1
  const result = await resolveDomusPermission("", () => "/path/to/cli.ts");
  // .ts which result is skipped; argv1 is empty so null
  expect(result).toBeNull();
  void noWhich;
});

test("deduplicates permissions on re-run", async () => {
  await runInit([], { projectPath: tempDir });
  await runInit([], { projectPath: tempDir });

  const settings = JSON.parse(
    await readFile(join(tempDir, ".claude/settings.json"), "utf-8"),
  );
  const allow: string[] = settings.permissions.allow;
  const unique = new Set(allow);
  expect(allow.length).toBe(unique.size);
});
