import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInit } from "./init.ts";

let tempWorkspace: string;
let tempConfigDir: string;
const noConfirm = async () => false;
const yesConfirm = async () => true;

beforeEach(async () => {
  tempWorkspace = await mkdtemp(join(tmpdir(), "domus-workspace-"));
  tempConfigDir = await mkdtemp(join(tmpdir(), "domus-config-"));
  process.env.DOMUS_CONFIG_DIR = tempConfigDir;
});

afterEach(async () => {
  await rm(tempWorkspace, { recursive: true, force: true });
  await rm(tempConfigDir, { recursive: true, force: true });
  process.env.DOMUS_CONFIG_DIR = undefined;
});

test("creates full workspace directory structure", async () => {
  await runInit([], { workspacePath: tempWorkspace });

  for (const dir of [
    "projects",
    "worktrees",
    "store/global/ideas",
    "store/global/tasks",
    "store/global/decisions",
    ".domus/workers",
    ".domus/logs",
  ]) {
    expect(existsSync(join(tempWorkspace, dir))).toBe(true);
  }
});

test("creates projects.md with non-empty content", async () => {
  await runInit([], { workspacePath: tempWorkspace });
  const content = await Bun.file(join(tempWorkspace, "projects.md")).text();
  expect(content.length).toBeGreaterThan(0);
  expect(content).toContain("Projects");
});

test("creates .gitignore with correct entries", async () => {
  await runInit([], { workspacePath: tempWorkspace });
  const content = await Bun.file(join(tempWorkspace, ".gitignore")).text();
  expect(content).toContain("projects/");
  expect(content).toContain("worktrees/");
  expect(content).toContain(".domus/");
});

test("writes workspace path to global config", async () => {
  await runInit([], { workspacePath: tempWorkspace });
  const config = await Bun.file(join(tempConfigDir, "config.json")).json();
  expect(config.workspace).toBe(tempWorkspace);
});

test("is idempotent — second run exits cleanly without changes", async () => {
  await runInit([], { workspacePath: tempWorkspace });
  const statBefore = await Bun.file(join(tempWorkspace, "projects.md")).text();
  await runInit([], { workspacePath: tempWorkspace });
  const statAfter = await Bun.file(join(tempWorkspace, "projects.md")).text();
  expect(statAfter).toBe(statBefore);
});

test("aborts when different workspace configured and user declines", async () => {
  await runInit([], { workspacePath: tempWorkspace });
  const otherWorkspace = await mkdtemp(join(tmpdir(), "domus-other-"));
  try {
    await runInit([], { workspacePath: otherWorkspace, confirmFn: noConfirm });
    expect(existsSync(join(otherWorkspace, ".domus"))).toBe(false);
  } finally {
    await rm(otherWorkspace, { recursive: true, force: true });
  }
});

test("--force overrides existing workspace config without prompting", async () => {
  await runInit([], { workspacePath: tempWorkspace });
  const otherWorkspace = await mkdtemp(join(tmpdir(), "domus-other-"));
  try {
    await runInit(["--force"], {
      workspacePath: otherWorkspace,
      confirmFn: noConfirm,
    });
    expect(existsSync(join(otherWorkspace, ".domus"))).toBe(true);
  } finally {
    await rm(otherWorkspace, { recursive: true, force: true });
  }
});

test("user confirmation allows overriding existing workspace", async () => {
  await runInit([], { workspacePath: tempWorkspace });
  const otherWorkspace = await mkdtemp(join(tmpdir(), "domus-other-"));
  try {
    await runInit([], { workspacePath: otherWorkspace, confirmFn: yesConfirm });
    expect(existsSync(join(otherWorkspace, ".domus"))).toBe(true);
  } finally {
    await rm(otherWorkspace, { recursive: true, force: true });
  }
});
