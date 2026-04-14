import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runUpdate } from "./update.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "domus-update-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

test("--help prints usage and returns without creating files", async () => {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...a: unknown[]) => logs.push(a.join(" "));
  try {
    await runUpdate(["--help"], { projectPath: tempDir });
  } finally {
    console.log = original;
  }
  expect(logs.join("\n")).toContain("domus update");
  expect(existsSync(join(tempDir, ".domus"))).toBe(false);
});

test("-h prints usage and returns without creating files", async () => {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...a: unknown[]) => logs.push(a.join(" "));
  try {
    await runUpdate(["-h"], { projectPath: tempDir });
  } finally {
    console.log = original;
  }
  expect(logs.join("\n")).toContain("domus update");
  expect(existsSync(join(tempDir, ".domus"))).toBe(false);
});
