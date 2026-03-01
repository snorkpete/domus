import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Project } from "./projects.ts";
import { updateTicketStatus } from "./tickets.ts";
import type { Ticket } from "./tickets.ts";

export type WorkerHandle = {
  workerId: string;
  ticketNumber: string;
  project: string;
  branch: string;
  worktreePath: string;
  pid: number;
  startedAt: string;
};

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

const BASE_PERMISSIONS = {
  permissions: {
    allow: [
      "Bash(git *)",
      "Bash(bun *)",
      "Read",
      "Edit",
      "Write",
      "Glob",
      "Grep",
    ],
  },
};

const WORKER_INSTRUCTIONS = `
## Worker Instructions

You are a Worker. Your job is to implement the task described in the ticket above.

Rules:
- Write tests first, then implementation (TDD).
- All tests must pass before you commit.
- Run lint and fix any issues before you commit.
- Produce a single commit. If you need multiple commits, squash them.
- Do not ask questions. If something is ambiguous, make the best reasonable decision and note it in WORKER_NOTES.md at the repo root.
- Do not modify anything outside the scope of this ticket.
- When done, the branch is ready for review.
`.trim();

export async function dispatchWorker(
  ticket: Ticket,
  project: Project,
  workspacePath: string,
): Promise<WorkerHandle> {
  const worktreePath = join(
    workspacePath,
    "worktrees",
    project.name,
    ticket.branch,
  );

  if (existsSync(worktreePath)) {
    throw new Error(
      `Worktree already exists for branch ${ticket.branch}: ${worktreePath}`,
    );
  }

  await mkdir(join(workspacePath, "worktrees", project.name), {
    recursive: true,
  });

  const branchExists =
    Bun.spawnSync(
      ["git", "show-ref", "--verify", `refs/heads/${ticket.branch}`],
      { cwd: project.path, env: process.env },
    ).exitCode === 0;

  const worktreeArgs = branchExists
    ? ["git", "worktree", "add", worktreePath, ticket.branch]
    : ["git", "worktree", "add", "-b", ticket.branch, worktreePath];

  const worktreeResult = Bun.spawnSync(worktreeArgs, { cwd: project.path, env: process.env });
  if (worktreeResult.exitCode !== 0) {
    throw new Error(
      `Failed to create worktree: ${new TextDecoder().decode(worktreeResult.stderr)}`,
    );
  }

  const context = await assembleContext(ticket, project, workspacePath);

  const claudeDir = join(worktreePath, ".claude");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(
    join(claudeDir, "settings.json"),
    JSON.stringify(BASE_PERMISSIONS, null, 2),
    "utf-8",
  );

  const workerId = `${project.name}-${ticket.number}-${Math.floor(Date.now() / 1000)}`;
  const logsDir = join(workspacePath, ".domus", "logs");
  await mkdir(logsDir, { recursive: true });
  const logFile = join(logsDir, `${workerId}.log`);

  const proc = Bun.spawn(
    ["claude", "--print", "--append-system-prompt", context],
    {
      cwd: worktreePath,
      env: process.env,
      stdout: Bun.file(logFile),
      stderr: Bun.file(logFile),
    },
  );

  const startedAt = new Date().toISOString();

  const handle: WorkerHandle = {
    workerId,
    ticketNumber: ticket.number,
    project: project.name,
    branch: ticket.branch,
    worktreePath,
    pid: proc.pid,
    startedAt,
  };

  await writeWorkerStatus(
    {
      workerId,
      ticketNumber: ticket.number,
      ticketFile: ticket.filePath,
      project: project.name,
      branch: ticket.branch,
      worktreePath,
      status: "running",
      startedAt,
      logFile,
    },
    workspacePath,
  );

  return handle;
}

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

async function assembleContext(
  ticket: Ticket,
  project: Project,
  workspacePath: string,
): Promise<string> {
  const sections: string[] = [];

  const ticketContent = await readFile(ticket.filePath, "utf-8");
  sections.push(`# TASK\n\n${ticketContent}`);

  const claudeMd = await readFirstExisting(
    join(project.path, "CLAUDE.md"),
    join(project.path, "claude.md"),
  );
  if (claudeMd) {
    sections.push(`# PROJECT CONVENTIONS (CLAUDE.md)\n\n${claudeMd}`);
  }

  const domusMd = await readFirstExisting(join(project.path, "domus.md"));
  if (domusMd) {
    sections.push(`# DOMUS PROJECT CONFIG (domus.md)\n\n${domusMd}`);
  }

  const decisions = await readDecisions(
    join(workspacePath, "store", project.name, "decisions"),
  );
  if (decisions) {
    sections.push(`# PRIOR DECISIONS\n\n${decisions}`);
  }

  sections.push(WORKER_INSTRUCTIONS);

  return sections.join("\n\n---\n\n");
}

async function readFirstExisting(
  ...paths: string[]
): Promise<string | undefined> {
  for (const p of paths) {
    if (existsSync(p)) {
      return readFile(p, "utf-8");
    }
  }
  return undefined;
}

async function readDecisions(
  decisionsDir: string,
): Promise<string | undefined> {
  if (!existsSync(decisionsDir)) return undefined;

  let files: string[];
  try {
    files = await readdir(decisionsDir);
  } catch {
    return undefined;
  }

  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();
  if (mdFiles.length === 0) return undefined;

  const parts: string[] = [];
  for (const file of mdFiles) {
    const content = await readFile(join(decisionsDir, file), "utf-8");
    parts.push(`### ${file}\n\n${content}`);
  }
  return parts.join("\n\n---\n\n");
}

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
