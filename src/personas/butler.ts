import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "../lib/projects.ts";

const PROSE_PATH = join(import.meta.dir, "butler.md");

type WorkerStatusSummary = {
  running: string[];
  mrReady: string[];
  failed: string[];
};

type ButlerContext = {
  workspacePath: string;
  projects: Project[];
  workerStatus: WorkerStatusSummary;
  roster: string;
};

export function buildButlerPrompt(ctx: ButlerContext): string {
  const template = readFileSync(PROSE_PATH, "utf-8");

  const projectList =
    ctx.projects.length > 0
      ? ctx.projects.map((p) => `  - ${p.name}: ${p.path}`).join("\n")
      : "  (no projects registered yet — use `domus add project` to register one)";

  return template
    .replace("{{WORKSPACE}}", ctx.workspacePath)
    .replace("{{PROJECTS}}", projectList)
    .replace("{{WORKERS}}", buildWorkerSummary(ctx.workerStatus))
    .replace("{{ROSTER}}", ctx.roster)
    .trim();
}

function buildWorkerSummary(status: WorkerStatusSummary): string {
  const lines: string[] = ["Worker status:"];

  if (
    status.running.length === 0 &&
    status.mrReady.length === 0 &&
    status.failed.length === 0
  ) {
    lines.push("  No workers have run yet.");
    return lines.join("\n");
  }

  if (status.mrReady.length > 0) {
    lines.push("  MR ready (awaiting review):");
    for (const w of status.mrReady) lines.push(`    - ${w}`);
  }

  if (status.running.length > 0) {
    lines.push("  Currently running:");
    for (const w of status.running) lines.push(`    - ${w}`);
  }

  if (status.failed.length > 0) {
    lines.push("  Failed (needs attention):");
    for (const w of status.failed) lines.push(`    - ${w}`);
  }

  return lines.join("\n");
}
