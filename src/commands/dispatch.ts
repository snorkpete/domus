import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { listProjects } from "../lib/projects.ts";
import type { Project } from "../lib/projects.ts";
import type { Ticket } from "../lib/tickets.ts";
import { dispatchWorker } from "../lib/worker.ts";
import { resolveWorkspace } from "../lib/workspace.ts";

export type TaskRef = {
  id: string;
  title: string;
  filePath: string;
};

export async function parseTaskFile(filePath: string): Promise<TaskRef> {
  const content = await readFile(filePath, "utf-8");

  const idMatch = content.match(/^\*\*ID:\*\*\s*(.+)$/m);
  const titleMatch = content.match(/^# Task:\s*(.+)$/m);

  const id = idMatch?.[1]?.trim() ?? basename(filePath, ".md");
  const title = titleMatch?.[1]?.trim() ?? id;

  return { id, title, filePath };
}

export function deriveProjectFromCwd(
  cwd: string,
  projects: Project[],
): Project | undefined {
  const cwdNorm = cwd.endsWith("/") ? cwd : `${cwd}/`;

  let best: Project | undefined;
  let bestLen = -1;

  for (const p of projects) {
    const pathNorm = p.path.endsWith("/") ? p.path : `${p.path}/`;
    if (cwdNorm.startsWith(pathNorm) && pathNorm.length > bestLen) {
      best = p;
      bestLen = pathNorm.length;
    }
  }

  return best;
}

export async function runDispatch(args: string[]): Promise<void> {
  const taskFile = args[0];
  if (!taskFile) {
    console.error("Usage: domus dispatch <task-file>");
    process.exit(1);
  }

  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspace();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const taskRef = await parseTaskFile(taskFile);
  const projects = await listProjects();
  const project = deriveProjectFromCwd(process.cwd(), projects);

  if (!project) {
    console.error(
      "No registered project found for current directory. Register it with `domus add project`.",
    );
    process.exit(1);
  }

  const ticket: Ticket = {
    number: taskRef.id,
    title: taskRef.title,
    status: "open",
    project: project.name,
    branch: `task/${taskRef.id}`,
    filePath: taskRef.filePath,
  };

  try {
    const handle = await dispatchWorker(ticket, project, workspacePath);
    console.log(`Dispatched worker ${handle.workerId}`);
    console.log(`  Branch:   ${handle.branch}`);
    console.log(`  Worktree: ${handle.worktreePath}`);
    console.log(`  PID:      ${handle.pid}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
