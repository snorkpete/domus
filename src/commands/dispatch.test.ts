import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDispatch } from "./dispatch.ts";
import { runTask } from "./task/index.ts";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "domus-dispatch-test-"));
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

test("dispatch: exits with no args", async () => {
  const trap = trapExit();
  try {
    await runDispatch([]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("dispatch: exits if task not found", async () => {
  const trap = trapExit();
  try {
    await runDispatch(["no-such-task"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
  }
  expect(trap.didExit()).toBe(true);
});

test("dispatch: exits if task is not autonomous", async () => {
  // Create a task and advance to ready without autonomous flag
  await runTask(["add", "--title", "Manual Task"]);
  await runTask(["advance", "manual-task"]); // raw → proposed
  await runTask(["advance", "manual-task"]); // proposed → ready
  const trap = trapExit();
  const out = captureOutput();
  try {
    await runDispatch(["manual-task"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
    out.restore();
  }
  expect(trap.didExit()).toBe(true);
  expect(out.lines().join("\n")).toContain("not autonomous");
});

test("dispatch: exits if task is not ready", async () => {
  await runTask(["add", "--title", "My Task", "--autonomous"]);
  const trap = trapExit();
  const out = captureOutput();
  try {
    await runDispatch(["my-task"]);
  } catch {
    /* expected */
  } finally {
    trap.restore();
    out.restore();
  }
  expect(trap.didExit()).toBe(true);
  expect(out.lines().join("\n")).toContain("not dispatchable");
});

test("dispatch: starts a ready autonomous task", async () => {
  await runTask(["add", "--title", "My Task", "--autonomous"]);
  await runTask(["advance", "my-task"]); // raw → proposed
  await runTask(["advance", "my-task"]); // proposed → ready
  const out = captureOutput();
  try {
    await runDispatch(["my-task"]);
  } finally {
    out.restore();
  }
  const output = out.lines().join("\n");
  expect(output).toContain("Starting task my-task");
  expect(output).toContain("ready for dispatch");
});
