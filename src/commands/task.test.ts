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

test("add: exits on invalid --priority value", async () => {
  const trap = trapExit();
  try {
    await runTask(["add", "--title", "My Task", "--priority", "bogus"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("add: exits on invalid --refinement value", async () => {
  const trap = trapExit();
  try {
    await runTask(["add", "--title", "My Task", "--refinement", "bogus"]);
  } catch { /* expected */ } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("add: accepts proposed as a valid refinement value", async () => {
  await runTask(["add", "--title", "Proposed Task", "--refinement", "proposed"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].refinement).toBe("proposed");
});

test("add: --outcome sets outcome_note at creation time", async () => {
  await runTask(["add", "--title", "My Task", "--outcome", "Already resolved"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].outcome_note).toBe("Already resolved");
});

test("add: --outcome empty string sets outcome_note to null", async () => {
  await runTask(["add", "--title", "My Task", "--outcome", ""]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].outcome_note).toBeNull();
});

test("add: outcome_note defaults to null when --outcome not provided", async () => {
  await runTask(["add", "--title", "My Task"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].outcome_note).toBeNull();
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
  await runTask(["status", "my-task", "cancelled", "--outcome", "Not needed"]);

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

test("list: includes priority in output line", async () => {
  await runTask(["add", "--title", "High Prio Task", "--priority", "high"]);
  await runTask(["add", "--title", "Low Prio Task", "--priority", "low"]);

  const out = captureOutput();
  try {
    await runTask(["list"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("[high]");
  expect(output).toContain("[low]");
});

test("list: default priority normal appears in output line", async () => {
  await runTask(["add", "--title", "Normal Task"]);

  const out = captureOutput();
  try {
    await runTask(["list"]);
  } finally {
    out.restore();
  }
  expect(out.lines()[0]).toContain("[normal]");
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

test("update: --refinement proposed sets proposed in JSONL and .md", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--refinement", "proposed"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].refinement).toBe("proposed");

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Refinement:** proposed");
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

test("update: sets depends_on in JSONL and syncs .md Depends on field", async () => {
  await runTask(["add", "--title", "Blocker"]);
  await runTask(["add", "--title", "Dependent"]);
  await runTask(["update", "dependent", "--depends-on", "blocker"]);

  const tasks = await readTasksJsonl();
  const dep = tasks.find((t) => t.id === "dependent") as { depends_on: string[] };
  expect(dep.depends_on).toEqual(["blocker"]);

  const md = await readTaskMd("dependent");
  expect(md).toContain("**Depends on:** blocker");
});

test("update: clears depends_on when passed empty string", async () => {
  await runTask(["add", "--title", "Blocker"]);
  await runTask(["add", "--title", "Dependent", "--depends-on", "blocker"]);
  await runTask(["update", "dependent", "--depends-on", ""]);

  const tasks = await readTasksJsonl();
  const dep = tasks.find((t) => t.id === "dependent") as { depends_on: string[] };
  expect(dep.depends_on).toEqual([]);

  const md = await readTaskMd("dependent");
  expect(md).toContain("**Depends on:** none");
});

test("update: --depends-on alone does not trigger 'nothing to update' exit", async () => {
  await runTask(["add", "--title", "Manual Task"]);
  const trap = trapExit();
  try {
    await runTask(["update", "manual-task", "--depends-on", ""]);
  } catch {
    // ignore thrown exit
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(false);
});

test("update: --depends-on is idempotent", async () => {
  await runTask(["add", "--title", "Blocker"]);
  await runTask(["add", "--title", "Dependent", "--depends-on", "blocker"]);
  await runTask(["update", "dependent", "--depends-on", "blocker"]);

  const tasks = await readTasksJsonl();
  const dep = tasks.find((t) => t.id === "dependent") as { depends_on: string[] };
  expect(dep.depends_on).toEqual(["blocker"]);
});

test("add: --note sets initial notes array", async () => {
  await runTask(["add", "--title", "My Task", "--note", "First observation"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].notes).toEqual(["First observation"]);
});

test("update: --note appends to notes array", async () => {
  await runTask(["add", "--title", "My Task", "--note", "First"]);
  await runTask(["update", "my-task", "--note", "Second"]);
  await runTask(["update", "my-task", "--note", "Third"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].notes).toEqual(["First", "Second", "Third"]);
});

test("update: --outcome updates outcome_note in JSONL", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--outcome", "Completed with caveat"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].outcome_note).toBe("Completed with caveat");
});

test("update: --outcome empty string clears outcome_note", async () => {
  await runTask(["add", "--title", "My Task", "--outcome", "Initial note"]);
  await runTask(["update", "my-task", "--outcome", ""]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].outcome_note).toBeNull();
});

test("update: --parent updates parent_id in JSONL and .md", async () => {
  await runTask(["add", "--title", "Parent Task"]);
  await runTask(["add", "--title", "Child Task"]);
  await runTask(["update", "child-task", "--parent", "parent-task"]);

  const tasks = await readTasksJsonl();
  const child = tasks.find((t) => t.id === "child-task") as { parent_id: string | null };
  expect(child.parent_id).toBe("parent-task");

  const md = await readTaskMd("child-task");
  expect(md).toContain("**Parent:** parent-task");
});

test("update: --parent empty string clears parent_id", async () => {
  await runTask(["add", "--title", "Parent Task"]);
  await runTask(["add", "--title", "Child Task", "--parent", "parent-task"]);
  await runTask(["update", "child-task", "--parent", ""]);

  const tasks = await readTasksJsonl();
  const child = tasks.find((t) => t.id === "child-task") as { parent_id: string | null };
  expect(child.parent_id).toBeNull();

  const md = await readTaskMd("child-task");
  expect(md).toContain("**Parent:** none");
});

test("update: --idea updates idea_id in JSONL and .md", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--idea", "my-idea"]);

  const tasks = await readTasksJsonl();
  const task = tasks.find((t) => t.id === "my-task") as { idea_id: string | null };
  expect(task.idea_id).toBe("my-idea");

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Idea:** my-idea");
});

test("update: --idea empty string clears idea_id", async () => {
  await runTask(["add", "--title", "My Task", "--idea", "some-idea"]);
  await runTask(["update", "my-task", "--idea", ""]);

  const tasks = await readTasksJsonl();
  const task = tasks.find((t) => t.id === "my-task") as { idea_id: string | null };
  expect(task.idea_id).toBeNull();

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Idea:** none");
});

test("update: --outcome alone does not trigger 'nothing to update' exit", async () => {
  await runTask(["add", "--title", "My Task"]);
  const trap = trapExit();
  try {
    await runTask(["update", "my-task", "--outcome", "some note"]);
  } catch {
    // ignore thrown exit
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(false);
});

test("update: --parent alone does not trigger 'nothing to update' exit", async () => {
  await runTask(["add", "--title", "Parent Task"]);
  await runTask(["add", "--title", "Child Task"]);
  const trap = trapExit();
  try {
    await runTask(["update", "child-task", "--parent", "parent-task"]);
  } catch {
    // ignore thrown exit
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(false);
});

test("update: --idea alone does not trigger 'nothing to update' exit", async () => {
  await runTask(["add", "--title", "My Task"]);
  const trap = trapExit();
  try {
    await runTask(["update", "my-task", "--idea", "some-idea"]);
  } catch {
    // ignore thrown exit
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(false);
});

// ── overview ──────────────────────────────────────────────────────────────────

// Strip ANSI escape codes for plain-text assertions
function stripAnsi(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: needed for ANSI stripping
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

test("overview: groups supervised and autonomous tasks", async () => {
  await runTask(["add", "--title", "Supervised Task", "--refinement", "refined"]);
  await runTask(["add", "--title", "Auto Task", "--refinement", "autonomous"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("Supervised");
  expect(output).toContain("supervised-task");
  expect(output).toContain("Autonomous");
  expect(output).toContain("auto-task");
});

test("overview: default hides done tasks", async () => {
  await runTask(["add", "--title", "Open Task"]);
  await runTask(["add", "--title", "Done Task"]);
  await runTask(["status", "done-task", "done"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("open-task");
  expect(output).not.toContain("done-task");
});

test("overview: --include-done shows done tasks", async () => {
  await runTask(["add", "--title", "Open Task"]);
  await runTask(["add", "--title", "Done Task"]);
  await runTask(["status", "done-task", "done"]);

  const out = captureOutput();
  try {
    await runTask(["overview", "--include-done"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("open-task");
  expect(output).toContain("done-task");
});

test("overview: supervised rows include refinement icon, autonomous do not", async () => {
  await runTask(["add", "--title", "Raw Task", "--refinement", "raw"]);
  await runTask(["add", "--title", "Auto Task", "--refinement", "autonomous"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const lines = out.lines().map(stripAnsi);
  const rawLine = lines.find((l) => l.includes("raw-task"));
  const autoLine = lines.find((l) => l.includes("auto-task"));

  // Raw supervised line should contain the ~ refinement icon
  expect(rawLine).toBeDefined();
  expect(rawLine).toContain("~");

  // Autonomous line should NOT contain ~ or ◎
  expect(autoLine).toBeDefined();
  expect(autoLine).not.toContain("~");
  expect(autoLine).not.toContain("◎");
});

test("overview: proposed task renders ◐ refinement icon", async () => {
  await runTask(["add", "--title", "Proposed Task", "--refinement", "proposed"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const lines = out.lines().map(stripAnsi);
  const proposedLine = lines.find((l) => l.includes("proposed-task"));
  expect(proposedLine).toBeDefined();
  expect(proposedLine).toContain("◐");
});

test("overview: priority icons appear in output", async () => {
  await runTask(["add", "--title", "High Task", "--priority", "high"]);
  await runTask(["add", "--title", "Low Task", "--priority", "low"]);
  await runTask(["add", "--title", "Normal Task", "--priority", "normal"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("▲"); // high
  expect(output).toContain("▼"); // low
  expect(output).toContain("·"); // normal
});

test("overview: status icons appear for open and in-progress", async () => {
  await runTask(["add", "--title", "Open Task"]);
  await runTask(["add", "--title", "Running Task"]);
  await runTask(["status", "running-task", "in-progress"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("○"); // open
  expect(output).toContain("◑"); // in-progress
});

test("overview: blocked tasks appear in Blocked section, not Supervised/Autonomous", async () => {
  await runTask(["add", "--title", "Blocker"]);
  await runTask(["add", "--title", "Blocked Task", "--depends-on", "blocker"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("Blocked");
  expect(output).toContain("blocked-task");
  // blocker (unresolved dep) appears indented under blocked-task
  expect(output).toContain("blocker");
  // blocked-task must NOT appear under Supervised or Autonomous sections
  const supervisedIdx = output.indexOf("Supervised");
  const blockedSectionIdx = output.indexOf("Blocked");
  if (supervisedIdx !== -1 && supervisedIdx > blockedSectionIdx) {
    const supervisedSection = output.slice(supervisedIdx);
    expect(supervisedSection).not.toContain("blocked-task");
  }
});

test("overview: blocked section shows tree with unresolved deps indented", async () => {
  await runTask(["add", "--title", "Dep A"]);
  await runTask(["add", "--title", "Dep B"]);
  await runTask(["add", "--title", "Blocked Task", "--depends-on", "dep-a,dep-b"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const lines = out.lines().map(stripAnsi);
  const blockedTaskLineIdx = lines.findIndex((l) => l.includes("blocked-task"));
  expect(blockedTaskLineIdx).toBeGreaterThanOrEqual(0);
  // Indented blocker lines follow immediately
  const depALine = lines[blockedTaskLineIdx + 1];
  const depBLine = lines[blockedTaskLineIdx + 2];
  expect(depALine).toContain("dep-a");
  expect(depBLine).toContain("dep-b");
  // Indented lines start with whitespace/bullet
  expect(depALine.startsWith("  ·") || depALine.startsWith("  ")).toBe(true);
});

test("overview: display order is Autonomous then Blocked then Supervised", async () => {
  await runTask(["add", "--title", "Supervised Task", "--refinement", "refined"]);
  await runTask(["add", "--title", "Auto Task", "--refinement", "autonomous"]);
  await runTask(["add", "--title", "Blocker Task"]);
  await runTask(["add", "--title", "Blocked Task", "--depends-on", "blocker-task"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  const autoIdx = output.indexOf("Autonomous");
  const blockedIdx = output.indexOf("Blocked");
  const supervisedIdx = output.indexOf("Supervised");
  expect(autoIdx).toBeGreaterThanOrEqual(0);
  expect(blockedIdx).toBeGreaterThan(autoIdx);
  expect(supervisedIdx).toBeGreaterThan(blockedIdx);
});

test("overview: blocked task row uses full icon format (priority + refinement + status)", async () => {
  await runTask(["add", "--title", "Blocker"]);
  await runTask(["add", "--title", "Blocked Task", "--depends-on", "blocker", "--refinement", "raw", "--priority", "high"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const lines = out.lines().map(stripAnsi);
  const blockedLine = lines.find((l) => l.includes("blocked-task") && !l.startsWith("  "));
  expect(blockedLine).toBeDefined();
  expect(blockedLine).toContain("▲"); // high priority
  expect(blockedLine).toContain("~"); // raw refinement icon
  expect(blockedLine).toContain("○"); // open status
});

test("overview: empty list prints 'No tasks'", async () => {
  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("No tasks");
});

test("overview: --interval shows refresh indicator as first line", async () => {
  await runTask(["add", "--title", "Some Task"]);
  const out = captureOutput();
  try {
    await runTask(["overview", "--interval", "30"]);
  } finally {
    out.restore();
  }
  expect(out.lines()[0]).toContain("↻");
  expect(out.lines()[0]).toContain("30s");
});

test("overview: no interval flag omits refresh indicator", async () => {
  await runTask(["add", "--title", "Some Task"]);
  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  expect(out.lines().join("\n")).not.toContain("↻");
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
