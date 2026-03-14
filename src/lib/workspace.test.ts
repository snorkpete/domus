import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveWorkspace } from "./workspace.ts";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "domus-workspace-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

test("resolveWorkspace throws when no .domus/ in cwd", async () => {
  await expect(resolveWorkspace()).rejects.toThrow("domus init");
});

test("resolveWorkspace returns cwd when .domus/ exists", async () => {
  await mkdir(join(tempDir, ".domus"), { recursive: true });
  const realTempDir = await realpath(tempDir);
  expect(await resolveWorkspace()).toBe(realTempDir);
});
