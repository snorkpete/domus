import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runConfig } from "./config.ts";

let tempDir: string;
const originalExit = process.exit;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "domus-config-test-"));
  await mkdir(join(tempDir, ".domus"), { recursive: true });
  // Suppress process.exit in tests
  process.exit = mock(() => {
    throw new Error("process.exit called");
  }) as never;
});

afterEach(async () => {
  process.exit = originalExit;
  await rm(tempDir, { recursive: true, force: true });
});

test("set-branch with explicit branch writes config.json", async () => {
  await runConfig(["set-branch", "main"], { projectPath: tempDir });

  const config = JSON.parse(
    await readFile(join(tempDir, ".domus/config.json"), "utf-8"),
  );
  expect(config.branch).toBe("main");
  expect(config.root).toBe(join(tempDir, ".domus"));
});

test("set-branch with explicit branch prints confirmation", async () => {
  const messages: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => messages.push(msg);

  try {
    await runConfig(["set-branch", "feature/my-branch"], {
      projectPath: tempDir,
    });
  } finally {
    console.log = originalLog;
  }

  expect(messages.some((m) => m === "Branch set to: feature/my-branch")).toBe(
    true,
  );
});

test("set-branch without argument detects current git branch", async () => {
  // The test environment is in a real git repo, so it should detect a branch name
  await runConfig(["set-branch"], { projectPath: tempDir });

  const config = JSON.parse(
    await readFile(join(tempDir, ".domus/config.json"), "utf-8"),
  );
  expect(typeof config.branch).toBe("string");
  expect(config.branch.length).toBeGreaterThan(0);
});

test("set-branch creates .domus/config.json if it does not exist", async () => {
  // Remove the .domus dir entirely
  await rm(join(tempDir, ".domus"), { recursive: true, force: true });

  await runConfig(["set-branch", "main"], { projectPath: tempDir });

  const config = JSON.parse(
    await readFile(join(tempDir, ".domus/config.json"), "utf-8"),
  );
  expect(config.branch).toBe("main");
});

test("set-branch overwrites existing config.json branch", async () => {
  const existing = { root: join(tempDir, ".domus"), branch: "old-branch" };
  await writeFile(
    join(tempDir, ".domus/config.json"),
    JSON.stringify(existing, null, 2),
    "utf-8",
  );

  await runConfig(["set-branch", "new-branch"], { projectPath: tempDir });

  const config = JSON.parse(
    await readFile(join(tempDir, ".domus/config.json"), "utf-8"),
  );
  expect(config.branch).toBe("new-branch");
});

test("--help prints usage", async () => {
  const messages: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => messages.push(msg);

  try {
    await runConfig(["--help"], { projectPath: tempDir });
  } finally {
    console.log = originalLog;
  }

  expect(messages.some((m) => m.includes("set-branch"))).toBe(true);
});

test("no subcommand prints usage", async () => {
  const messages: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => messages.push(msg);

  try {
    await runConfig([], { projectPath: tempDir });
  } finally {
    console.log = originalLog;
  }

  expect(messages.some((m) => m.includes("set-branch"))).toBe(true);
});

test("unknown subcommand exits with error", async () => {
  expect(() => runConfig(["unknown-cmd"], { projectPath: tempDir })).toThrow(
    "process.exit called",
  );
});
