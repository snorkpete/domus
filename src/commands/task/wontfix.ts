import { parseFlag } from "../../lib/args.ts";
import { projectRoot } from "../../lib/jsonl.ts";
import { isValidTransition } from "../../lib/state-engine.ts";
import { extractId, findTask, showHelp, transitionTask } from "./helpers.ts";

export async function cmdWontfix(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log("Usage: domus task wontfix <id> [--note <text>]");
    return;
  }

  const root = projectRoot();
  const id = extractId(args, "Usage: domus task wontfix <id> [--note <text>]");
  const { tasks, task } = await findTask(root, id);

  if (!isValidTransition(task.status, "wont-fix")) {
    console.error(
      `Cannot mark task ${id} as won't-fix: invalid transition from ${task.status}`,
    );
    process.exit(1);
  }

  const note = parseFlag(args, "--note") || null;
  await transitionTask(root, tasks, task, "wont-fix", { outcomeNote: note });
}
