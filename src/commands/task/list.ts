import { hasFlag, parseFlag } from "../../lib/args.ts";
import { projectRoot } from "../../lib/jsonl.ts";
import { readTasks } from "../../lib/task-store.ts";
import type { TaskStatus } from "../../lib/task-types.ts";
import { STATUS_ICON } from "./display.ts";

export async function cmdList(args: string[]): Promise<void> {
  const root = projectRoot();
  const tasks = await readTasks(root);

  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  const filterStatus = parseFlag(args, "--status") as TaskStatus | undefined;
  const filtered = filterStatus
    ? tasks.filter((t) => t.status === filterStatus)
    : tasks;

  if (hasFlag(args, "--json")) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  for (const t of filtered) {
    const icon = STATUS_ICON[t.status] ?? "?";
    const autoFlag = t.autonomous ? " ⚙" : "";
    console.log(`${icon} [${t.priority}] ${t.id}${autoFlag}`);
  }
}
