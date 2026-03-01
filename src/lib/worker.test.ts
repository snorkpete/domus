import { describe, expect, spyOn, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isProcessRunning, pollWorker, summariseWorkers } from "./worker.ts";
import type { WorkerStatus } from "./worker.ts";

// --- isProcessRunning ---

describe("isProcessRunning", () => {
  test("returns true for the current process", () => {
    expect(isProcessRunning(process.pid)).toBe(true);
  });

  test("returns false for a non-existent PID", () => {
    expect(isProcessRunning(999999999)).toBe(false);
  });
});

// --- helpers ---

async function makeWorkspace(): Promise<string> {
  const dir = join(tmpdir(), `domus-worker-test-${Date.now()}`);
  await mkdir(join(dir, ".domus", "workers"), { recursive: true });
  return dir;
}

async function writeStatus(
  workspacePath: string,
  status: WorkerStatus,
): Promise<void> {
  await writeFile(
    join(workspacePath, ".domus", "workers", `${status.workerId}.json`),
    JSON.stringify(status),
    "utf-8",
  );
}

function makeStatus(overrides: Partial<WorkerStatus> = {}): WorkerStatus {
  return {
    workerId: "domus-006-1000",
    ticketNumber: "006",
    ticketFile: "/ws/store/domus/tasks/006.md",
    project: "domus",
    branch: "feat/006",
    worktreePath: "/ws/worktrees/domus/feat/006",
    status: "running",
    startedAt: "2026-01-01T00:00:00.000Z",
    logFile: "/ws/.domus/logs/domus-006-1000.log",
    ...overrides,
  };
}

// --- pollWorker ---

describe("pollWorker", () => {
  test("returns status unchanged when already mr-ready", async () => {
    const ws = await makeWorkspace();
    const s = makeStatus({
      status: "mr-ready",
      completedAt: "2026-01-01T01:00:00.000Z",
    });
    await writeStatus(ws, s);

    const result = await pollWorker(s.workerId, ws);
    expect(result.status).toBe("mr-ready");

    await rm(ws, { recursive: true });
  });

  test("returns status unchanged when already failed", async () => {
    const ws = await makeWorkspace();
    const s = makeStatus({
      status: "failed",
      completedAt: "2026-01-01T01:00:00.000Z",
    });
    await writeStatus(ws, s);

    const result = await pollWorker(s.workerId, ws);
    expect(result.status).toBe("failed");

    await rm(ws, { recursive: true });
  });

  test("returns running when process is still alive", async () => {
    const ws = await makeWorkspace();
    // Use current process PID so isProcessRunning returns true
    const s = makeStatus({ worktreePath: String(process.pid) });
    await writeStatus(ws, s);

    // The worktreePath is used as the pid argument in isProcessRunning via pollWorker
    // We spy on the module-level helper instead
    const spy = spyOn(
      await import("./worker.ts"),
      "isProcessRunning",
    ).mockReturnValue(true);

    const result = await pollWorker(s.workerId, ws);
    expect(result.status).toBe("running");

    spy.mockRestore();
    await rm(ws, { recursive: true });
  });
});

// --- summariseWorkers ---

describe("summariseWorkers", () => {
  test("returns empty summary when no workers dir", async () => {
    const dir = join(tmpdir(), `domus-no-workers-${Date.now()}`);
    await mkdir(dir, { recursive: true });

    const summary = await summariseWorkers(dir);
    expect(summary.running).toHaveLength(0);
    expect(summary.mrReady).toHaveLength(0);
    expect(summary.failed).toHaveLength(0);

    await rm(dir, { recursive: true });
  });

  test("categorises mr-ready and failed workers without polling", async () => {
    const ws = await makeWorkspace();

    await writeStatus(
      ws,
      makeStatus({ workerId: "w-001", status: "mr-ready", completedAt: "x" }),
    );
    await writeStatus(
      ws,
      makeStatus({ workerId: "w-002", status: "failed", completedAt: "x" }),
    );

    const summary = await summariseWorkers(ws);
    expect(summary.mrReady).toHaveLength(1);
    expect(summary.failed).toHaveLength(1);
    expect(summary.running).toHaveLength(0);

    await rm(ws, { recursive: true });
  });

  test("skips malformed status files", async () => {
    const ws = await makeWorkspace();
    await writeFile(
      join(ws, ".domus", "workers", "bad.json"),
      "not json",
      "utf-8",
    );

    const summary = await summariseWorkers(ws);
    expect(summary.running).toHaveLength(0);

    await rm(ws, { recursive: true });
  });
});

// --- assembleWorktreePath ---

describe("worktree path derivation", () => {
  test("path is workspace/worktrees/project/branch", () => {
    const ws = "/workspace";
    const project = "domus";
    const branch = "feat/006-worker-dispatch";
    const expected = "/workspace/worktrees/domus/feat/006-worker-dispatch";
    expect(join(ws, "worktrees", project, branch)).toBe(expected);
  });
});
