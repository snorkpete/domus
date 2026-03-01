import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { listProjects } from "../lib/projects.ts";
import { checkClaudeInstalled, launchSession } from "../lib/session.ts";
import { resolveWorkspace } from "../lib/workspace.ts";
import { buildButlerPrompt } from "../personas/butler.ts";

const ROSTER_PATH = join(import.meta.dir, "../personas/roster.md");

type WorkerFile = {
  status: string;
  workerId: string;
  branch: string;
};

async function readLastHandoff(
  workspacePath: string,
): Promise<string | undefined> {
  try {
    const persona = await readFile(
      join(workspacePath, ".domus", "last-persona"),
      "utf-8",
    );
    const handoff = await readFile(
      join(workspacePath, ".domus", "handoff", `${persona.trim()}.md`),
      "utf-8",
    );
    return handoff.trim();
  } catch {
    return undefined;
  }
}

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

  const [projects, workerStatus, roster, lastHandoff] = await Promise.all([
    listProjects(),
    readWorkerStatus(workspacePath),
    Bun.file(ROSTER_PATH).text(),
    readLastHandoff(workspacePath),
  ]);

  const prompt = buildButlerPrompt({
    workspacePath,
    projects,
    workerStatus,
    roster,
    lastHandoff,
  });

  await launchSession(prompt, workspacePath);
}
