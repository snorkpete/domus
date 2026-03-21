import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { version } from "../package.json";
import { projectRoot } from "./lib/jsonl.ts";
import { stripRoot } from "./lib/root.ts";

function runCli(...args: string[]) {
  return Bun.spawnSync(["bun", "run", "src/cli.ts", ...args], {
    cwd: `${import.meta.dir}/..`,
  });
}

test("--version prints the package.json version", () => {
  const result = runCli("--version");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe(version);
});

test("-v is an alias for --version", () => {
  const result = runCli("-v");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe(version);
});

test("--help prints usage and exits cleanly", () => {
  const result = runCli("--help");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString()).toContain("domus");
});

test("--help documents --root flag", () => {
  const result = runCli("--help");
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString()).toContain("--root");
});

test("unknown command exits with code 1", () => {
  const result = runCli("not-a-command");
  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("Unknown command");
});

// ── stripRoot ─────────────────────────────────────────────────────────────────

test("stripRoot: returns null root and unchanged args when --root not present", () => {
  const result = stripRoot(["task", "list"]);
  expect(result.root).toBeNull();
  expect(result.rest).toEqual(["task", "list"]);
});

test("stripRoot: extracts --root and its value from args", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "domus-striproot-test-"));
  try {
    const result = stripRoot(["--root", tempDir, "task", "list"]);
    expect(result.root).toBe(resolve(tempDir));
    expect(result.rest).toEqual(["task", "list"]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("stripRoot: strips --root from middle of args", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "domus-striproot-test-"));
  try {
    const result = stripRoot(["task", "--root", tempDir, "list"]);
    expect(result.root).toBe(resolve(tempDir));
    expect(result.rest).toEqual(["task", "list"]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("stripRoot: expands tilde in path", async () => {
  const home = process.env.HOME ?? "";
  // Use the home dir itself since it always exists
  const result = stripRoot(["--root", "~", "task", "list"]);
  expect(result.root).toBe(resolve(home));
  expect(result.rest).toEqual(["task", "list"]);
});

test("stripRoot: exits with code 1 when --root path does not exist", () => {
  let exitCode: number | null = null;
  const origExit = process.exit;
  process.exit = ((code: number) => {
    exitCode = code;
    throw new Error("process.exit");
  }) as never;
  try {
    stripRoot(["--root", "/does/not/exist/at/all", "task", "list"]);
  } catch {
    /* expected */
  } finally {
    process.exit = origExit;
  }
  expect(exitCode).toBe(1);
});

test("stripRoot: exits with code 1 when --root has no argument", () => {
  let exitCode: number | null = null;
  const origExit = process.exit;
  process.exit = ((code: number) => {
    exitCode = code;
    throw new Error("process.exit");
  }) as never;
  try {
    stripRoot(["--root"]);
  } catch {
    /* expected */
  } finally {
    process.exit = origExit;
  }
  expect(exitCode).toBe(1);
});

// ── projectRoot ───────────────────────────────────────────────────────────────

let savedDomusRoot: string | undefined;

beforeEach(() => {
  savedDomusRoot = process.env.DOMUS_ROOT;
  process.env.DOMUS_ROOT = undefined;
});

afterEach(() => {
  if (savedDomusRoot !== undefined) {
    process.env.DOMUS_ROOT = savedDomusRoot;
  } else {
    process.env.DOMUS_ROOT = undefined;
  }
});

test("projectRoot: returns cwd when DOMUS_ROOT is not set", () => {
  expect(projectRoot()).toBe(resolve(process.cwd()));
});

test("projectRoot: returns DOMUS_ROOT when set", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "domus-projectroot-test-"));
  try {
    process.env.DOMUS_ROOT = tempDir;
    expect(projectRoot()).toBe(tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
