import { projectRoot } from "../../lib/jsonl.ts";
import { isValidTransition } from "../../lib/state-engine.ts";
import { extractId, findTask, showHelp, transitionTask } from "./helpers.ts";

export async function cmdReopen(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log("Usage: domus task reopen <id>");
    return;
  }

  const root = projectRoot();
  const id = extractId(args, "Usage: domus task reopen <id>");
  const { tasks, task } = await findTask(root, id);

  if (!isValidTransition(task.status, "raw")) {
    console.error(
      `Cannot reopen task ${id}: invalid transition from ${task.status}`,
    );
    process.exit(1);
  }

  await transitionTask(root, tasks, task, "raw");
}
