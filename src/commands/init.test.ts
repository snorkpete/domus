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
    ".domus/tags",
    ".domus/reference",
  ]) {
    expect(existsSync(join(tempDir, dir))).toBe(true);
  }
});

test("creates seed files with correct content", async () => {
  await runInit([], { projectPath: tempDir });

  const shared = await readFile(
    join(tempDir, ".domus/tags/shared.md"),
    "utf-8",
  );
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

test("installs .domus/reference/agent-instructions.md", async () => {
  await runInit([], { projectPath: tempDir });
  const content = await readFile(
    join(tempDir, ".domus/reference/agent-instructions.md"),
    "utf-8",
  );
  expect(content.length).toBeGreaterThan(0);
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

test("creates .domus/execution-logs/ directory", async () => {
  await runInit([], { projectPath: tempDir });
  expect(existsSync(join(tempDir, ".domus/execution-logs"))).toBe(true);
});

test("writes .domus/config.json with root and branch fields", async () => {
  await runInit([], { projectPath: tempDir });

  const configPath = join(tempDir, ".domus/config.json");
  expect(existsSync(configPath)).toBe(true);

  const config = JSON.parse(await readFile(configPath, "utf-8"));
  expect(config.root).toBe(tempDir);
  expect(typeof config.branch).toBe("string");
  expect(config.branch.length).toBeGreaterThan(0);
  expect(config.defaultHiddenTags).toEqual(["health-check"]);
});

test("config.json root points to the project path", async () => {
  await runInit([], { projectPath: tempDir });

  const config = JSON.parse(
    await readFile(join(tempDir, ".domus/config.json"), "utf-8"),
  );
  expect(config.root).toBe(tempDir);
});

test("creates empty .domus/audit.jsonl", async () => {
  await runInit([], { projectPath: tempDir });

  const auditPath = join(tempDir, ".domus/audit.jsonl");
  expect(existsSync(auditPath)).toBe(true);

  const content = await readFile(auditPath, "utf-8");
  expect(content).toBe("");
});

test("creates .domus/.gitignore containing audit.jsonl", async () => {
  await runInit([], { projectPath: tempDir });

  const gitignorePath = join(tempDir, ".domus/.gitignore");
  expect(existsSync(gitignorePath)).toBe(true);

  const content = await readFile(gitignorePath, "utf-8");
  expect(content).toContain("audit.jsonl");
});

test("appends audit.jsonl to existing .domus/.gitignore if missing", async () => {
  await mkdir(join(tempDir, ".domus"), { recursive: true });
  await writeFile(join(tempDir, ".domus/.gitignore"), "*.tmp\n", "utf-8");

  await runInit([], { projectPath: tempDir });

  const content = await readFile(join(tempDir, ".domus/.gitignore"), "utf-8");
  expect(content).toContain("*.tmp");
  expect(content).toContain("audit.jsonl");
});

test("does not duplicate audit.jsonl in .domus/.gitignore on re-run", async () => {
  await runInit([], { projectPath: tempDir });
  await runInit([], { projectPath: tempDir });

  const content = await readFile(join(tempDir, ".domus/.gitignore"), "utf-8");
  const occurrences = (content.match(/audit\.jsonl/g) ?? []).length;
  expect(occurrences).toBe(1);
});

test("config.json is overwritten on re-run with updated branch", async () => {
  await runInit([], { projectPath: tempDir });

  const config1 = JSON.parse(
    await readFile(join(tempDir, ".domus/config.json"), "utf-8"),
  );

  await runInit([], { projectPath: tempDir });

  const config2 = JSON.parse(
    await readFile(join(tempDir, ".domus/config.json"), "utf-8"),
  );

  // root should stay the same
  expect(config2.root).toBe(config1.root);
  // branch field exists and is a string
  expect(typeof config2.branch).toBe("string");
});

test("rejects when projectPath is a .domus/ directory", async () => {
  const domusPath = join(tempDir, ".domus");
  await mkdir(domusPath, { recursive: true });
  await expect(runInit([], { projectPath: domusPath })).rejects.toThrow(
    /\.domus/,
  );
  // Nothing should have been created inside .domus
  const { readdir: readdirFn } = await import("node:fs/promises");
  const entries = await readdirFn(domusPath);
  expect(entries.length).toBe(0);
});

test("rejects when projectPath is a subdirectory of .domus/", async () => {
  const tasksPath = join(tempDir, ".domus", "tasks");
  await mkdir(tasksPath, { recursive: true });
  await expect(runInit([], { projectPath: tasksPath })).rejects.toThrow(
    /\.domus/,
  );
});

test("--help prints usage and returns without creating files", async () => {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...a: unknown[]) => logs.push(a.join(" "));
  try {
    await runInit(["--help"], { projectPath: tempDir });
  } finally {
    console.log = original;
  }
  expect(logs.join("\n")).toContain("domus init");
  expect(existsSync(join(tempDir, ".domus"))).toBe(false);
});

test("-h prints usage and returns without creating files", async () => {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...a: unknown[]) => logs.push(a.join(" "));
  try {
    await runInit(["-h"], { projectPath: tempDir });
  } finally {
    console.log = original;
  }
  expect(logs.join("\n")).toContain("domus init");
  expect(existsSync(join(tempDir, ".domus"))).toBe(false);
});
