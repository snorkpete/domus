import { listProjects } from "../lib/projects.ts";
import { parseTicket } from "../lib/tickets.ts";
import { dispatchWorker } from "../lib/worker.ts";
import { resolveWorkspace } from "../lib/workspace.ts";

export async function runDispatch(args: string[]): Promise<void> {
  const ticketFile = args[0];
  if (!ticketFile) {
    console.error("Usage: domus dispatch <ticket-file>");
    process.exit(1);
  }

  let workspacePath: string;
  try {
    workspacePath = await resolveWorkspace();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const ticket = await parseTicket(ticketFile);
  const projects = await listProjects();
  const project = projects.find((p) => p.name === ticket.project);

  if (!project) {
    console.error(
      `Project "${ticket.project}" not found in workspace. Register it with \`domus add project\`.`,
    );
    process.exit(1);
  }

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
