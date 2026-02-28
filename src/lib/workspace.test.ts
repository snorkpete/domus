import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readWorkspaceConfig,
  resolveWorkspace,
  writeWorkspaceConfig,
} from "./workspace.ts";

let tempConfigDir: string;

beforeEach(async () => {
  tempConfigDir = await mkdtemp(join(tmpdir(), "domus-config-"));
  process.env.DOMUS_CONFIG_DIR = tempConfigDir;
});

afterEach(async () => {
  await rm(tempConfigDir, { recursive: true, force: true });
  process.env.DOMUS_CONFIG_DIR = undefined;
});

test("resolveWorkspace throws when no config exists", async () => {
  await expect(resolveWorkspace()).rejects.toThrow("domus init");
});

test("resolveWorkspace returns workspace path after write", async () => {
  await writeWorkspaceConfig("/some/workspace");
  expect(await resolveWorkspace()).toBe("/some/workspace");
});

test("readWorkspaceConfig returns null when no config exists", async () => {
  expect(await readWorkspaceConfig()).toBeNull();
});

test("writeWorkspaceConfig writes valid JSON and is readable", async () => {
  await writeWorkspaceConfig("/my/workspace");
  const config = await readWorkspaceConfig();
  expect(config?.workspace).toBe("/my/workspace");
});

test("writeWorkspaceConfig creates config directory if missing", async () => {
  const nestedDir = join(tempConfigDir, "nested", "domus");
  process.env.DOMUS_CONFIG_DIR = nestedDir;
  await writeWorkspaceConfig("/some/path");
  const config = await readWorkspaceConfig();
  expect(config?.workspace).toBe("/some/path");
});
