import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildButlerPrompt } from "../lib/butler.ts";
import { listProjects } from "../lib/projects.ts";
import { checkClaudeInstalled, launchSession } from "../lib/session.ts";
import { summariseWorkers } from "../lib/worker.ts";
import { resolveWorkspace } from "../lib/workspace.ts";

const ROSTER_PATH = new URL(
  "../templates/reference/staff/role-activation-rules.md",
  import.meta.url,
);

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

  const [projects, workerSummaryFull, roster, lastHandoff] = await Promise.all([
    listProjects(),
    summariseWorkers(workspacePath),
    Bun.file(ROSTER_PATH).text(),
    readLastHandoff(workspacePath),
  ]);

  const workerStatus = {
    running: workerSummaryFull.running.map(
      (w) => `${w.workerId} (${w.branch})`,
    ),
    mrReady: workerSummaryFull.mrReady.map(
      (w) => `${w.workerId} (${w.branch})`,
    ),
    failed: workerSummaryFull.failed.map((w) => `${w.workerId} (${w.branch})`),
  };

  const prompt = buildButlerPrompt({
    workspacePath,
    projects,
    workerStatus,
    roster,
    lastHandoff,
  });

  await launchSession(prompt, workspacePath);
}
