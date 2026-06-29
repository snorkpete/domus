import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHealth, runHealthWatch } from "./health.ts";
import { runTask } from "./task/index.ts";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "domus-health-test-"));
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

function stripAnsi(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: needed for ANSI stripping
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

async function writeDomusConfig(config: object): Promise<void> {
  const domusDir = join(tempDir, ".domus");
  await mkdir(domusDir, { recursive: true });
  await writeFile(
    join(domusDir, "config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf-8",
  );
}

// ── filtering: health-check only ──────────────────────────────────────────────

test("health: shows only health-check-tagged tasks", async () => {
  await runTask(["add", "--title", "Feature Task"]);
  await runTask(["add", "--title", "Health Task", "--tags", "health-check"]);

  const out = captureOutput();
  try {
    await runHealth([]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("health-task");
  expect(output).not.toContain("feature-task");
});

test("health: excludes non-health tasks even with defaultHiddenTags config", async () => {
  await writeDomusConfig({
    root: tempDir,
    branch: "main",
    defaultHiddenTags: ["health-check"],
  });
  await runTask(["add", "--title", "Feature Task"]);
  await runTask(["add", "--title", "Health Task", "--tags", "health-check"]);

  const out = captureOutput();
  try {
    await runHealth([]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("health-task");
  expect(output).not.toContain("feature-task");
});

test("health: shows nothing when no health-check tasks exist", async () => {
  await runTask(["add", "--title", "Feature Task"]);

  const out = captureOutput();
  try {
    await runHealth([]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("No tasks");
});

// ── deferred always included ──────────────────────────────────────────────────

test("health: deferred health-check tasks appear without a flag", async () => {
  await runTask([
    "add",
    "--title",
    "Active Health Task",
    "--tags",
    "health-check",
  ]);
  await runTask([
    "add",
    "--title",
    "Deferred Health Task",
    "--tags",
    "health-check",
  ]);
  await runTask(["defer", "deferred-health-task"]);

  const out = captureOutput();
  try {
    await runHealth([]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("active-health-task");
  expect(output).toContain("deferred-health-task");
});

test("health: deferred non-health tasks do not appear", async () => {
  await runTask(["add", "--title", "Health Task", "--tags", "health-check"]);
  await runTask(["add", "--title", "Feature Task"]);
  await runTask(["defer", "feature-task"]);

  const out = captureOutput();
  try {
    await runHealth([]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("health-task");
  expect(output).not.toContain("feature-task");
});

// ── Deferred group positioning ────────────────────────────────────────────────

test("health: deferred health-check tasks appear in Deferred section after non-deferred sections", async () => {
  await runTask([
    "add",
    "--title",
    "Active Health Task",
    "--tags",
    "health-check",
  ]);
  await runTask([
    "add",
    "--title",
    "Deferred Health Task",
    "--tags",
    "health-check",
  ]);
  await runTask(["defer", "deferred-health-task"]);

  const out = captureOutput();
  try {
    await runHealth([]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("Deferred");
  expect(output).toContain("deferred-health-task");
  // Deferred section appears after the Raw section
  const rawIdx = output.indexOf("Raw");
  const deferredIdx = output.indexOf("Deferred");
  expect(rawIdx).toBeGreaterThanOrEqual(0);
  expect(deferredIdx).toBeGreaterThan(rawIdx);
});

// ── groups by status ──────────────────────────────────────────────────────────

test("health: groups tasks by status like overview", async () => {
  await runTask([
    "add",
    "--title",
    "Raw Health Task",
    "--tags",
    "health-check",
  ]);
  await runTask([
    "add",
    "--title",
    "Ready Health Task",
    "--tags",
    "health-check",
  ]);
  await runTask(["advance", "ready-health-task"]); // raw → proposed
  await runTask(["advance", "ready-health-task"]); // proposed → ready

  const out = captureOutput();
  try {
    await runHealth([]);
  } finally {
    out.restore();
  }
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).toContain("Ready");
  expect(output).toContain("ready-health-task");
  expect(output).toContain("Raw");
  expect(output).toContain("raw-health-task");
});

// ── --help ─────────────────────────────────────────────────────────────────────

test("health: --help prints usage including both forms", async () => {
  const out = captureOutput();
  try {
    await runHealth(["--help"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("domus health");
  expect(output).toContain("domus health watch");
});

test("health: -h is an alias for --help", async () => {
  const out = captureOutput();
  try {
    await runHealth(["-h"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("domus health");
});

// ── watch routing ─────────────────────────────────────────────────────────────

test("health: watch subcommand exits with error when watch(1) binary not found", () => {
  const trap = trapExit();
  const out = captureOutput();
  try {
    runHealthWatch([], () => null);
  } catch {
    /* expected — process.exit was trapped */
  } finally {
    out.restore();
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
  expect(out.lines().join("\n")).toContain("watch not found");
});

test("health: watch subcommand does not produce overview output", async () => {
  await runTask(["add", "--title", "Health Task", "--tags", "health-check"]);

  const trap = trapExit();
  const out = captureOutput();
  try {
    runHealthWatch([], () => null);
  } catch {
    /* expected */
  } finally {
    out.restore();
    trap.restore();
  }
  // Watch path should not produce overview rows
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).not.toContain("health-task");
});

test("health: runHealth delegates watch subcommand (args[0]=watch) to watch path", async () => {
  await runTask(["add", "--title", "Health Task", "--tags", "health-check"]);

  // runHealth(["watch", ...]) should NOT produce overview output
  // We verify by calling it and checking no task rows appear in console output.
  // The watch path either exits (watch binary not found) or spawns watch (binary found).
  // In both cases, no overview rows are printed to console.log.
  const trap = trapExit();
  const out = captureOutput();
  const origSpawnSync = Bun.spawnSync;
  // Prevent actual watch spawn; return exitCode 0 immediately
  (Bun as Record<string, unknown>).spawnSync = () => ({ exitCode: 0 });
  try {
    await runHealth(["watch"]);
  } catch {
    /* expected — process.exit trapped */
  } finally {
    (Bun as Record<string, unknown>).spawnSync = origSpawnSync;
    out.restore();
    trap.restore();
  }
  // process.exit is called in all watch paths
  expect(trap.didExit()).toBe(true);
  // No overview rows in output
  const output = stripAnsi(out.lines().join("\n"));
  expect(output).not.toContain("health-task");
});
