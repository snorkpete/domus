import { parseFlag } from "../../lib/args.ts";
import { projectRoot } from "../../lib/jsonl.ts";
import { nextStatus } from "../../lib/state-engine.ts";
import {
  extractId,
  findTask,
  logToExecutionLog,
  showHelp,
  transitionTask,
} from "./helpers.ts";

export async function cmdAdvance(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log("Usage: domus task advance <id> [--note <text>]");
    return;
  }

  const root = projectRoot();
  const id = extractId(args, "Usage: domus task advance <id> [--note <text>]");
  const { tasks, task } = await findTask(root, id);
  const next = nextStatus(task.status);

  if (!next) {
    console.error(
      `Cannot advance task ${id}: no next status from ${task.status}`,
    );
    process.exit(1);
  }

  const note = parseFlag(args, "--note");
  await transitionTask(root, tasks, task, next);

  if (note) {
    await logToExecutionLog(root, id, `Advanced to ${next}: ${note}`);
  }
}
