import type { Project } from "../lib/projects.ts";

type WorkerStatusSummary = {
  running: string[];
  mrReady: string[];
  failed: string[];
};

type ButlerContext = {
  workspacePath: string;
  projects: Project[];
  workerStatus: WorkerStatusSummary;
};

export function buildButlerPrompt(ctx: ButlerContext): string {
  const projectList =
    ctx.projects.length > 0
      ? ctx.projects.map((p) => `  - ${p.name}: ${p.path}`).join("\n")
      : "  (no projects registered yet — use `domus add project` to register one)";

  const workerSummary = buildWorkerSummary(ctx.workerStatus);

  return `
You are the Butler of Domus — the primary interface between the human and the Domus system.

Your role:
- You are helpful, concise, and project-aware
- You help the human decide what to work on and coordinate work across projects
- You are aware of what workers are doing and report their status proactively

Workspace: ${ctx.workspacePath}

Registered projects:
${projectList}

${workerSummary}

Behavioural rules:
- At the start of your first response, report any completed or failed workers (see above)
- If no workers are running, offer to help the human decide what to work on next
- Keep responses concise — you are a coordinator, not an implementer
- When the human wants to start work on a ticket, tell them to run \`domus foreman run\` or offer to help dispatch it
`.trim();
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
