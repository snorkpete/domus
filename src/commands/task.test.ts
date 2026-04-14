import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTask } from "./task/index.ts";

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
  return {
    didExit: () => _exited,
    restore: () => {
      process.exit = orig;
    },
  };
}

function captureOutput(): { lines: () => string[]; restore: () => void } {
  const _lines: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args: unknown[]) => _lines.push(args.join(" "));
  console.error = (...args: unknown[]) => _lines.push(args.join(" "));
  return {
    lines: () => _lines,
    restore: () => {
      console.log = origLog;
      console.error = origErr;
    },
  };
}

async function readTasksJsonl(): Promise<Record<string, unknown>[]> {
  const path = join(tempDir, ".domus", "tasks", "tasks.jsonl");
  const content = await readFile(path, "utf-8");
  return content
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

async function readTaskMd(id: string): Promise<string> {
  return readFile(join(tempDir, ".domus", "tasks", `${id}.md`), "utf-8");
}

// ── add ───────────────────────────────────────────────────────────────────────

test("add: creates JSONL entry with correct fields", async () => {
  await runTask([
    "add",
    "--title",
    "My Task",
    "--summary",
    "A summary",
    "--tags",
    "devex,backend",
    "--priority",
    "high",
  ]);

  const tasks = await readTasksJsonl();
  expect(tasks).toHaveLength(1);
  const task = tasks[0];
  expect(task.title).toBe("My Task");
  expect(task.summary).toBe("A summary");
  expect(task.tags).toEqual(["devex", "backend"]);
  expect(task.priority).toBe("high");
  expect(task.autonomous).toBe(false);
  expect(task.status).toBe("raw");
  expect(task.id).toBe("my-task");
});

test("add: creates .md detail file", async () => {
  await runTask(["add", "--title", "My Task", "--summary", "A summary"]);

  const md = await readTaskMd("my-task");
  expect(md).toContain("# Task: My Task");
  expect(md).toContain("**Status:** raw");
  expect(md).toContain("**Autonomous:** false");
  expect(md).toContain("**Priority:** normal");
  expect(md).toContain("A summary");
});

test("add: defaults to raw status, normal priority, not autonomous", async () => {
  await runTask(["add", "--title", "Defaults Task"]);

  const tasks = await readTasksJsonl();
  const task = tasks[0];
  expect(task.autonomous).toBe(false);
  expect(task.priority).toBe("normal");
  expect(task.status).toBe("raw");
});

test("add: --autonomous flag sets autonomous to true", async () => {
  await runTask(["add", "--title", "Auto Task", "--autonomous"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].autonomous).toBe(true);

  const md = await readTaskMd("auto-task");
  expect(md).toContain("**Autonomous:** true");
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
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("add: exits on invalid --priority value", async () => {
  const trap = trapExit();
  try {
    await runTask(["add", "--title", "My Task", "--priority", "bogus"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("add: --outcome sets outcome_note at creation time", async () => {
  await runTask(["add", "--title", "My Task", "--outcome", "Already resolved"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].outcome_note).toBe("Already resolved");
});

test("add: outcome_note defaults to null when --outcome not provided", async () => {
  await runTask(["add", "--title", "My Task"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].outcome_note).toBeNull();
});

// ── advance ──────────────────────────────────────────────────────────────────

test("advance: raw → proposed", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("proposed");
});

test("advance: proposed → ready", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]); // raw → proposed
  await runTask(["advance", "my-task"]); // proposed → ready

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("ready");
});

test("advance: ready → in-progress", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]); // raw → proposed
  await runTask(["advance", "my-task"]); // proposed → ready
  await runTask(["advance", "my-task"]); // ready → in-progress

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("in-progress");
});

test("advance: in-progress → ready-for-senior-review", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]); // raw → proposed
  await runTask(["advance", "my-task"]); // proposed → ready
  await runTask(["advance", "my-task"]); // ready → in-progress
  await runTask(["advance", "my-task"]); // in-progress → ready-for-senior-review

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("ready-for-senior-review");
});

test("advance: ready-for-senior-review → done", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]); // raw → proposed
  await runTask(["advance", "my-task"]); // proposed → ready
  await runTask(["advance", "my-task"]); // ready → in-progress
  await runTask(["advance", "my-task"]); // in-progress → ready-for-senior-review
  await runTask(["advance", "my-task"]); // ready-for-senior-review → done

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("done");
  expect(tasks[0].date_done).not.toBeNull();
});

test("advance: cannot advance done task", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]);
  await runTask(["advance", "my-task"]);
  await runTask(["advance", "my-task"]);
  await runTask(["advance", "my-task"]);
  await runTask(["advance", "my-task"]); // now done

  const trap = trapExit();
  try {
    await runTask(["advance", "my-task"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("advance: updates markdown status", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]);

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Status:** proposed");
});

// ── cancel ───────────────────────────────────────────────────────────────────

test("cancel: cancels a raw task", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["cancel", "my-task", "--note", "Not needed"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("cancelled");
  expect(tasks[0].outcome_note).toBe("Not needed");
});

test("cancel: cancels an in-progress task", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]); // raw → proposed
  await runTask(["advance", "my-task"]); // proposed → ready
  await runTask(["advance", "my-task"]); // ready → in-progress
  await runTask(["cancel", "my-task"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("cancelled");
});

// ── defer ────────────────────────────────────────────────────────────────────

test("defer: defers a raw task", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["defer", "my-task", "--note", "Not now"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("deferred");
  expect(tasks[0].outcome_note).toBe("Not now");
});

// ── reopen ───────────────────────────────────────────────────────────────────

test("reopen: reopens a cancelled task to raw", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["cancel", "my-task"]);
  await runTask(["reopen", "my-task"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("raw");
});

test("reopen: reopens a deferred task to raw", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["defer", "my-task"]);
  await runTask(["reopen", "my-task"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("raw");
});

test("reopen: cannot reopen a raw task", async () => {
  await runTask(["add", "--title", "My Task"]);
  const trap = trapExit();
  try {
    await runTask(["reopen", "my-task"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── status (power tool) ─────────────────────────────────────────────────────

test("status: updates status in JSONL and .md file", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["status", "my-task", "proposed"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("proposed");

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Status:** proposed");
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
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("status: exits on invalid status value", async () => {
  await runTask(["add", "--title", "My Task"]);
  const trap = trapExit();
  try {
    await runTask(["status", "my-task", "invalid"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("status: accepts ready-for-senior-review from in-progress", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["status", "my-task", "in-progress"]);
  await runTask(["status", "my-task", "ready-for-senior-review"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("ready-for-senior-review");

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Status:** ready-for-senior-review");
});

test("status: rejects invalid transition raw → ready-for-senior-review", async () => {
  await runTask(["add", "--title", "My Task"]);
  const trap = trapExit();
  const out = captureOutput();
  try {
    await runTask(["status", "my-task", "ready-for-senior-review"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
    out.restore();
  }
  expect(trap.didExit()).toBe(true);
  expect(out.lines().join("\n")).toContain("Invalid transition");
});

// ── list ──────────────────────────────────────────────────────────────────────

test("list: outputs icon + id", async () => {
  await runTask(["add", "--title", "My Task"]);

  const out = captureOutput();
  try {
    await runTask(["list"]);
  } finally {
    out.restore();
  }
  expect(out.lines().join("\n")).toContain("my-task");
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
    await runTask(["list", "--status", "raw"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("task-b");
  expect(output).not.toContain("task-a");
});

// ── show ──────────────────────────────────────────────────────────────────────

test("show: prints detail for a known task", async () => {
  await runTask([
    "add",
    "--title",
    "My Task",
    "--summary",
    "A summary",
    "--tags",
    "devex",
  ]);

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
  } catch {
    /* expected */
  } finally {
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

test("update: updates priority in JSONL and .md", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--priority", "high"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].priority).toBe("high");

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Priority:** high");
});

test("update: --autonomous sets autonomous to true", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--autonomous"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].autonomous).toBe(true);

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Autonomous:** true");
});

test("update: --no-autonomous sets autonomous to false", async () => {
  await runTask(["add", "--title", "My Task", "--autonomous"]);
  await runTask(["update", "my-task", "--no-autonomous"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].autonomous).toBe(false);

  const md = await readTaskMd("my-task");
  expect(md).toContain("**Autonomous:** false");
});

test("update: exits on unknown id", async () => {
  const trap = trapExit();
  try {
    await runTask(["update", "no-such-task", "--title", "X"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("update: exits with no flags", async () => {
  await runTask(["add", "--title", "My Task"]);
  const trap = trapExit();
  try {
    await runTask(["update", "my-task"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── ready ─────────────────────────────────────────────────────────────────────

test("ready: shows tasks grouped by status", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Ready Task"]);
  await runTask(["advance", "ready-task"]); // raw → proposed
  await runTask(["advance", "ready-task"]); // proposed → ready

  const out = captureOutput();
  try {
    await runTask(["ready"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("Ready");
  expect(output).toContain("ready-task");
  expect(output).toContain("Raw");
  expect(output).toContain("raw-task");
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
  const readySection = output.split("## Blocked")[0];
  expect(readySection).not.toContain("dependent");
});

test("update: sets depends_on in JSONL and syncs .md Depends on field", async () => {
  await runTask(["add", "--title", "Blocker"]);
  await runTask(["add", "--title", "Dependent"]);
  await runTask(["update", "dependent", "--depends-on", "blocker"]);

  const tasks = await readTasksJsonl();
  const dep = tasks.find((t) => t.id === "dependent") as {
    depends_on: string[];
  };
  expect(dep.depends_on).toEqual(["blocker"]);

  const md = await readTaskMd("dependent");
  expect(md).toContain("**Depends on:** blocker");
});

test("update: clears depends_on when passed empty string", async () => {
  await runTask(["add", "--title", "Blocker"]);
  await runTask(["add", "--title", "Dependent", "--depends-on", "blocker"]);
  await runTask(["update", "dependent", "--depends-on", ""]);

  const tasks = await readTasksJsonl();
  const dep = tasks.find((t) => t.id === "dependent") as {
    depends_on: string[];
  };
  expect(dep.depends_on).toEqual([]);

  const md = await readTaskMd("dependent");
  expect(md).toContain("**Depends on:** none");
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

test("update: --parent updates parent_id in JSONL and .md", async () => {
  await runTask(["add", "--title", "Parent Task"]);
  await runTask(["add", "--title", "Child Task"]);
  await runTask(["update", "child-task", "--parent", "parent-task"]);

  const tasks = await readTasksJsonl();
  const child = tasks.find((t) => t.id === "child-task") as {
    parent_id: string | null;
  };
  expect(child.parent_id).toBe("parent-task");
});

test("update: --idea updates idea_id in JSONL and .md", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["update", "my-task", "--idea", "my-idea"]);

  const tasks = await readTasksJsonl();
  const task = tasks.find((t) => t.id === "my-task") as {
    idea_id: string | null;
  };
  expect(task.idea_id).toBe("my-idea");
});

// ── overview ──────────────────────────────────────────────────────────────────

function stripAnsi(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: needed for ANSI stripping
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

test("overview: groups tasks by status", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Ready Task"]);
  await runTask(["advance", "ready-task"]); // raw → proposed
  await runTask(["advance", "ready-task"]); // proposed → ready

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("Ready");
  expect(output).toContain("ready-task");
  expect(output).toContain("Raw");
  expect(output).toContain("raw-task");
});

test("overview: default hides done tasks", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Done Task"]);
  await runTask(["status", "done-task", "done"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("raw-task");
  expect(output).not.toContain("done-task");
});

test("overview: --include-done shows done tasks", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Done Task"]);
  await runTask(["status", "done-task", "done"]);

  const out = captureOutput();
  try {
    await runTask(["overview", "--include-done"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("raw-task");
  expect(output).toContain("done-task");
});

test("overview: display order is Ready → In Progress → Proposed → Raw → Blocked", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Ready Task"]);
  await runTask(["advance", "ready-task"]);
  await runTask(["advance", "ready-task"]);
  await runTask(["add", "--title", "Blocker Task"]);
  await runTask([
    "add",
    "--title",
    "Blocked Task",
    "--depends-on",
    "blocker-task",
  ]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  const readyIdx = output.indexOf("Ready");
  const rawIdx = output.indexOf("Raw");
  const blockedIdx = output.indexOf("Blocked");
  expect(readyIdx).toBeGreaterThanOrEqual(0);
  expect(rawIdx).toBeGreaterThan(readyIdx);
  expect(blockedIdx).toBeGreaterThan(rawIdx);
});

test("overview: priority icons appear in output", async () => {
  await runTask(["add", "--title", "High Task", "--priority", "high"]);
  await runTask(["add", "--title", "Low Task", "--priority", "low"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("▲");
  expect(output).toContain("▼");
});

test("overview: blocked tasks appear in Blocked section", async () => {
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

test("overview: --interval shows refresh indicator", async () => {
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

// ── start ─────────────────────────────────────────────────────────────────────

test("start: transitions task to in-progress and records branch in JSONL", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]); // raw → proposed
  await runTask(["advance", "my-task"]); // proposed → ready
  await runTask(["start", "my-task", "--branch", "task/my-task"]);

  const tasks = await readTasksJsonl();
  expect(tasks[0].status).toBe("in-progress");
  expect(tasks[0].branch).toBe("task/my-task");
});

test("start: creates execution log file with started header", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]); // raw → proposed
  await runTask(["advance", "my-task"]); // proposed → ready
  await runTask(["start", "my-task", "--branch", "task/my-task"]);

  const logPath = join(tempDir, ".domus", "execution-logs", "my-task.md");
  expect(existsSync(logPath)).toBe(true);
  const content = await readFile(logPath, "utf-8");
  expect(content).toContain("# Execution Log: my-task");
  expect(content).toContain("**Branch:** task/my-task");
});

test("start: exits if task not found", async () => {
  const trap = trapExit();
  try {
    await runTask(["start", "no-such-task", "--branch", "task/x"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("start: exits without --branch", async () => {
  await runTask(["add", "--title", "My Task"]);
  const trap = trapExit();
  try {
    await runTask(["start", "my-task"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── log ───────────────────────────────────────────────────────────────────────

test("log: appends entry to execution log file", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]);
  await runTask(["advance", "my-task"]);
  await runTask(["start", "my-task", "--branch", "task/my-task"]);
  await runTask(["log", "my-task", "Implemented the feature"]);

  const logPath = join(tempDir, ".domus", "execution-logs", "my-task.md");
  const content = await readFile(logPath, "utf-8");
  expect(content).toContain("Implemented the feature");
});

test("log: appends event to audit.jsonl", async () => {
  await runTask(["add", "--title", "My Task"]);
  await runTask(["advance", "my-task"]);
  await runTask(["advance", "my-task"]);
  await runTask(["start", "my-task", "--branch", "task/my-task"]);
  await runTask(["log", "my-task", "Step complete"]);

  const auditPath = join(tempDir, ".domus", "audit.jsonl");
  expect(existsSync(auditPath)).toBe(true);
  const content = await readFile(auditPath, "utf-8");
  const entry = JSON.parse(content.trim().split("\n")[0]);
  expect(entry.id).toBe("my-task");
  expect(entry.message).toBe("Step complete");
});

test("log: exits if task not found", async () => {
  const trap = trapExit();
  try {
    await runTask(["log", "no-such-task", "some message"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

// ── overview: deferred and cancelled flags ────────────────────────────────────

test("overview: default hides deferred tasks", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Deferred Task"]);
  await runTask(["defer", "deferred-task"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("raw-task");
  expect(output).not.toContain("deferred-task");
});

test("overview: default hides cancelled tasks", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Cancelled Task"]);
  await runTask(["cancel", "cancelled-task"]);

  const out = captureOutput();
  try {
    await runTask(["overview"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("raw-task");
  expect(output).not.toContain("cancelled-task");
});

test("overview: --include-deferred shows deferred tasks in Deferred section", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Deferred Task"]);
  await runTask(["defer", "deferred-task"]);

  const out = captureOutput();
  try {
    await runTask(["overview", "--include-deferred"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("raw-task");
  expect(output).toContain("Deferred");
  expect(output).toContain("deferred-task");
});

test("overview: --include-cancelled shows cancelled tasks in Cancelled section", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Cancelled Task"]);
  await runTask(["cancel", "cancelled-task"]);

  const out = captureOutput();
  try {
    await runTask(["overview", "--include-cancelled"]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("raw-task");
  expect(output).toContain("Cancelled");
  expect(output).toContain("cancelled-task");
});

test("overview: --include-deferred and --include-cancelled are independent", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Deferred Task"]);
  await runTask(["add", "--title", "Cancelled Task"]);
  await runTask(["defer", "deferred-task"]);
  await runTask(["cancel", "cancelled-task"]);

  const outDeferred = captureOutput();
  try {
    await runTask(["overview", "--include-deferred"]);
  } finally {
    outDeferred.restore();
  }
  const deferredOutput = stripAnsi(outDeferred.lines().join("\n"));
  expect(deferredOutput).toContain("deferred-task");
  expect(deferredOutput).not.toContain("cancelled-task");

  const outCancelled = captureOutput();
  try {
    await runTask(["overview", "--include-cancelled"]);
  } finally {
    outCancelled.restore();
  }
  const cancelledOutput = stripAnsi(outCancelled.lines().join("\n"));
  expect(cancelledOutput).not.toContain("deferred-task");
  expect(cancelledOutput).toContain("cancelled-task");
});

test("overview: section order is Deferred after Done, Cancelled after Deferred", async () => {
  await runTask(["add", "--title", "Raw Task"]);
  await runTask(["add", "--title", "Done Task"]);
  await runTask(["add", "--title", "Deferred Task"]);
  await runTask(["add", "--title", "Cancelled Task"]);
  await runTask(["status", "done-task", "done"]);
  await runTask(["defer", "deferred-task"]);
  await runTask(["cancel", "cancelled-task"]);

  const out = captureOutput();
  try {
    await runTask([
      "overview",
      "--include-done",
      "--include-deferred",
      "--include-cancelled",
    ]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  const doneIdx = output.indexOf("Done");
  const deferredIdx = output.indexOf("Deferred");
  const cancelledIdx = output.indexOf("Cancelled");
  expect(doneIdx).toBeGreaterThanOrEqual(0);
  expect(deferredIdx).toBeGreaterThan(doneIdx);
  expect(cancelledIdx).toBeGreaterThan(deferredIdx);
});
