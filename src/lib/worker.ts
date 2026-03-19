import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { updateTicketStatus } from "./tickets.ts";

export type WorkerStatus = {
  workerId: string;
  ticketNumber: string;
  ticketFile: string;
  project: string;
  branch: string;
  worktreePath: string;
  status: "running" | "mr-ready" | "failed";
  startedAt: string;
  completedAt?: string;
  logFile: string;
  notes?: string;
};

export type WorkerSummary = {
  running: WorkerStatus[];
  mrReady: WorkerStatus[];
  failed: WorkerStatus[];
};

export async function pollWorker(
  workerId: string,
  workspacePath: string,
): Promise<WorkerStatus> {
  const statusFile = join(
    workspacePath,
    ".domus",
    "workers",
    `${workerId}.json`,
  );
  const current: WorkerStatus = await Bun.file(statusFile).json();

  if (current.status !== "running") {
    return current;
  }

  if (isProcessRunning(current.worktreePath)) {
    return current;
  }

  const notes = await readWorkerNotes(current.worktreePath);
  const hasCommits = worktreeHasNewCommits(current.worktreePath);
  const completedAt = new Date().toISOString();

  const updated: WorkerStatus = {
    ...current,
    status: hasCommits ? "mr-ready" : "failed",
    completedAt,
    ...(notes ? { notes } : {}),
  };

  await writeWorkerStatus(updated, workspacePath);
  await updateTicketStatus(
    current.ticketFile,
    hasCommits ? "mr-ready" : "failed",
  );

  return updated;
}

export async function summariseWorkers(
  workspacePath: string,
): Promise<WorkerSummary> {
  const workersDir = join(workspacePath, ".domus", "workers");
  const summary: WorkerSummary = { running: [], mrReady: [], failed: [] };

  let files: string[];
  try {
    files = await readdir(workersDir);
  } catch {
    return summary;
  }

  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      const raw: WorkerStatus = await Bun.file(join(workersDir, file)).json();

      const status =
        raw.status === "running"
          ? await pollWorker(raw.workerId, workspacePath)
          : raw;

      if (status.status === "running") summary.running.push(status);
      else if (status.status === "mr-ready") summary.mrReady.push(status);
      else if (status.status === "failed") summary.failed.push(status);
    } catch {
      // malformed status file — skip
    }
  }

  return summary;
}

// --- helpers ---

export function isProcessRunning(pid: number | string): boolean {
  const numPid = typeof pid === "string" ? Number.parseInt(pid, 10) : pid;
  try {
    process.kill(numPid, 0);
    return true;
  } catch {
    return false;
  }
}

function worktreeHasNewCommits(worktreePath: string): boolean {
  const result = Bun.spawnSync(["git", "log", "master..HEAD", "--oneline"], {
    cwd: worktreePath,
    env: process.env,
  });
  return (
    result.exitCode === 0 &&
    new TextDecoder().decode(result.stdout).trim().length > 0
  );
}

async function readWorkerNotes(
  worktreePath: string,
): Promise<string | undefined> {
  const notesPath = join(worktreePath, "WORKER_NOTES.md");
  if (!existsSync(notesPath)) return undefined;
  return readFile(notesPath, "utf-8");
}

async function writeWorkerStatus(
  status: WorkerStatus,
  workspacePath: string,
): Promise<void> {
  const workersDir = join(workspacePath, ".domus", "workers");
  await mkdir(workersDir, { recursive: true });
  await writeFile(
    join(workersDir, `${status.workerId}.json`),
    JSON.stringify(status, null, 2),
    "utf-8",
  );
}

