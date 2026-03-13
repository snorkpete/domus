import { afterEach, beforeEach, expect, test } from "bun:test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTask } from "./task.ts";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "domus-task-test-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

function trapExit(): { didExit: () => boolean; restore: () => void } {
  let _exited = false;
  const orig = process.exit;
  process.exit = (() => {
    _exited = true;
    throw new Error("process.exit");
  }) as never;
  return { didExit: () => _exited, restore: () => { process.exit = orig; } };
}

function captureOutput(): { lines: () => string[]; restore: () => void } {
  const _lines: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args: unknown[]) => _lines.push(args.join(" "));
  console.error = (...args: unknown[]) => _lines.push(args.join(" "));
  return {
    lines: () => _lines,
    restore: () => { console.log = origLog; console.error = origErr; },
  };
}

async function readTasksJsonl(): Promise<Record<string, unknown>[]> {
  const path = join(tempDir, ".domus", "tasks", "tasks.jsonl");
  const content = await readFile(path, "utf-8");
  return content.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}

async function readTaskMd(id: string): Promise<string> {
  return readFile(join(tempDir, ".domus", "tasks", `${id}.md`), "utf-8");
}

// ── add ───────────────────────────────────────────────────────────────────────

test("add: creates JSONL entry with correct fields", async () => {
  await runTask(["add", "--title", "My Task", "--summary", "A summary", "--tags", "devex,backend", "--priority", "high", "--refinement", "refined"]);

  const tasks = await readTasksJsonl();
  expect(tasks).toHaveLength(1);
  const task = tasks[0];
  expect(task.title).toBe("My Task");
  expect(task.summary).toBe("A summary");
  expect(task.tags).toEqual(["devex", "backend"]);
  expect(task.priority).toBe("high");
  expect(task.refinement).toBe("refined");
  expect(task.status).toBe("open");
  expect(task.id).toBe("my-task");
});

test("add: creates .md detail file", async () => {
  await runTask(["add", "--title", "My Task", "--summary", "A summary"]);

  const md = await readTaskMd("my-task");
  expect(md).toContain("# Task: My Task");
  expect(md).toContain("**Status:** open");
  expect(md).toContain("**Refinement:** raw");
  expect(md).toContain("**Priority:** normal");
  expect(md).toContain("A summary");
});

test("add: defaults to raw refinement, normal priority, open status", async () => {
  await runTask(["add", "--title", "Defaults Task"]);

  const tasks = await readTasksJsonl();
  const task = tasks[0];
  expect(task.refinement).toBe("raw");
  expect(task.priority).toBe("normal");
  expect(task.status).toBe("open");
});

test("add: generates unique id on collision", async () => {
  await runTask(["add", "--title", "Dupe"]);
  await runTask(["add", "--title", "Dupe"]);

  const tasks = await readTasksJsonl();
  expect(tasks).toHaveLength(2);
  expect(tasks[0].id).toBe("dupe");
  expect(tasks[1].id).toBe("dupe-2");
});

test("add: exits without --title", async () => {
  const trap = trapExit();
  try {
    await runTask(["add"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── status ────────────────────────────────────────────────────────────────────

test("status: updates status in JSONL and .md file", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["status", "my-task", "in-progress"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("in-progress");

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Status:** in-progress");
});

test("status: sets date_done when marking done", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["status", "my-task", "done"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].date_done).not.toBeNull();
});

test("status: saves outcome note", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["status", "my-task", "cancelled", "--note", "Not needed"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].outcome_note).toBe("Not needed");
});

test("status: exits on unknown id", async () => {
  const trap = trapExit();
  try {
    await runTask(["status", "no-such-task", "done"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("status: exits on invalid status value", async () => {
  await runTask(["add", "--title", "My Task"]);
  const trap = trapExit();
  try {
    await runTask(["status", "my-task", "invalid"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── list ──────────────────────────────────────────────────────────────────────

test("list: outputs icon + refinement + id + title", async () => {
  await runTask(["add", "--title", "My Task"]);

  const out = captureOutput();
  try {
    await runTask(["list"]);
  } finally {
    out.restore();
  }
  expect(out.lines().join("\n")).toContain("my-task");
  expect(out.lines().join("\n")).toContain("My Task");
});

test("list --json: outputs full JSON array", async () => {
  await runTask(["add", "--title", "Task A"]);
  await runTask(["add", "--title", "Task B"]);

  const out = captureOutput();
  try {
    await runTask(["list", "--json"]);
  } finally {
    out.restore();
  }
  const parsed = JSON.parse(out.lines().join(""));
  expect(parsed).toHaveLength(2);
  expect(parsed[0].title).toBe("Task A");
  expect(parsed[1].title).toBe("Task B");
});

test("list --status: filters by status", async () => {
  await runTask(["add", "--title", "Task A"]);
  await runTask(["add", "--title", "Task B"]);
  await runTask(["status", "task-a", "done"]);

  const out = captureOutput();
  try {
    await runTask(["list", "--status", "open"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("task-b");
  expect(output).not.toContain("task-a");
});

// ── show ──────────────────────────────────────────────────────────────────────

test("show: prints detail for a known task", async () => {
  await runTask(["add", "--title", "My Task", "--summary", "A summary", "--tags", "devex"]);

  const out = captureOutput();
  try {
    await runTask(["show", "my-task"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("My Task");
  expect(output).toContain("A summary");
  expect(output).toContain("devex");
});

test("show: exits on unknown id", async () => {
  const trap = trapExit();
  try {
    await runTask(["show", "no-such-task"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── update ────────────────────────────────────────────────────────────────────

test("update: updates title in JSONL and .md heading", async () => {
  await runTask(["add", "--title", "Old Title"]);
  await runTask(["update", "old-title", "--title", "New Title"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].title).toBe("New Title");

  const md = await readTaskMd("old-title");
  expect(md).toContain("# Task: New Title");
});

test("update: updates summary in JSONL only", async () => {
  await runTask(["add", "--title", "My Task", "--summary", "Old"]);
  await runTask(["update", "my-task", "--summary", "New summary"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].summary).toBe("New summary");
});

test("update: updates tags in JSONL", async () => {
  await runTask(["add", "--title", "My Task", "--tags", "devex"]);
  await runTask(["update", "my-task", "--tags", "backend,frontend"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].tags).toEqual(["backend", "frontend"]);
});

test("update: updates priority in JSONL and .md", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--priority", "high"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].priority).toBe("high");

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Priority:** high");
});

test("update: updates refinement in JSONL and .md", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--refinement", "autonomous"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].refinement).toBe("autonomous");

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Refinement:** autonomous");
});

test("update: exits on unknown id", async () => {
  const trap = trapExit();
  try {
    await runTask(["update", "no-such-task", "--title", "X"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("update: exits with no flags", async () => {
  await runTask(["add", "--title", "My Task"]);
  const trap = trapExit();
  try {
    await runTask(["update", "my-task"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── ready ─────────────────────────────────────────────────────────────────────

test("ready: shows open tasks grouped by autonomous vs supervised", async () => {
  await runTask(["add", "--title", "Auto Task", "--refinement", "autonomous"]);
  await runTask(["add", "--title", "Manual Task", "--refinement", "refined"]);

  const out = captureOutput();
  try {
    await runTask(["ready"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("Ready (Autonomous)");
  expect(output).toContain("auto-task");
  expect(output).toContain("Ready (Supervised)");
  expect(output).toContain("manual-task");
});

test("ready: blocked task does not appear in ready", async () => {
  await runTask(["add", "--title", "Blocker"]);
  await runTask(["add", "--title", "Dependent", "--depends-on", "blocker"]);

  const out = captureOutput();
  try {
    await runTask(["ready"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("Blocked");
  expect(output).toContain("dependent — Dependent");
  // dependent should not appear under any Ready section
  const readySection = output.split("## Blocked")[0];
  expect(readySection).not.toContain("dependent");
});

test("ready: unblocked after dependency is done", async () => {
  await runTask(["add", "--title", "Blocker"]);
  await runTask(["add", "--title", "Dependent", "--depends-on", "blocker"]);
  await runTask(["status", "blocker", "done"]);

  const out = captureOutput();
  try {
    await runTask(["ready"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("dependent");
  expect(output).not.toContain("Blocked");
});
