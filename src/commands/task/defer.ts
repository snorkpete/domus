import { parseFlag } from "../../lib/args.ts";
import { projectRoot } from "../../lib/jsonl.ts";
import { isValidTransition } from "../../lib/state-engine.ts";
import { extractId, findTask, showHelp, transitionTask } from "./helpers.ts";

export async function cmdDefer(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log("Usage: domus task defer <id> [--note <text>]");
    return;
  }

  const root = projectRoot();
  const id = extractId(args, "Usage: domus task defer <id> [--note <text>]");
  const { tasks, task } = await findTask(root, id);

  if (!isValidTransition(task.status, "deferred")) {
    console.error(
      `Cannot defer task ${id}: invalid transition from ${task.status}`,
    );
    process.exit(1);
  }

  const note = parseFlag(args, "--note") || null;
  await transitionTask(root, tasks, task, "deferred", { outcomeNote: note });
}
