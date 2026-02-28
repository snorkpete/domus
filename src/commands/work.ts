import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { listProjects } from "../lib/projects.ts";
import { resolveWorkspace } from "../lib/workspace.ts";
import { buildButlerPrompt } from "../personas/butler.ts";

type WorkerFile = {
  status: string;
  workerId: string;
  branch: string;
};

async function readWorkerStatus(workspacePath: string) {
  const workersDir = join(workspacePath, ".domus", "workers");
  const summary = {
    running: [] as string[],
    mrReady: [] as string[],
    failed: [] as string[],
  };

  let files: string[];
  try {
    files = await readdir(workersDir);
  } catch {
    return summary;
  }

  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      const raw: WorkerFile = await Bun.file(join(workersDir, file)).json();
      const label = `${raw.workerId} (${raw.branch})`;
      if (raw.status === "running") summary.running.push(label);
      else if (raw.status === "mr-ready") summary.mrReady.push(label);
      else if (raw.status === "failed") summary.failed.push(label);
    } catch {
      // malformed status file — skip
    }
  }

  return summary;
}

function checkClaudeInstalled(): boolean {
  const result = Bun.spawnSync(["which", "claude"]);
  return result.exitCode === 0;
}

export async function runWork(): Promise<void> {
  if (!checkClaudeInstalled()) {
    console.error(
      "Claude Code CLI not found. Install it from https://claude.ai/claude-code",
    );
    process.exit(1);
  }

  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspace();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const [projects, workerStatus] = await Promise.all([
    listProjects(),
    readWorkerStatus(workspacePath),
  ]);

  const prompt = buildButlerPrompt({ workspacePath, projects, workerStatus });

  const proc = Bun.spawn(["claude", "--append-system-prompt", prompt], {
    cwd: workspacePath,
    stdio: ["inherit", "inherit", "inherit"],
  });

  await proc.exited;
}
