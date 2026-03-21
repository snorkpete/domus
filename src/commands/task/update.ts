import { projectRoot } from "../../lib/jsonl.ts";
import {
  applyMetadataUpdate,
  extractId,
  extractMetadataFlags,
  findTask,
  showHelp,
} from "./helpers.ts";

export async function cmdUpdate(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log(
      "Usage: domus task update <id> [--title <title>] [--summary <text>] [--tags <tag1,tag2>]",
    );
    console.log(
      "       [--priority <priority>] [--autonomous] [--no-autonomous] [--depends-on <id1,id2>]",
    );
    console.log(
      "       [--outcome <text>] [--note <text>] [--parent <id>] [--idea <id>]",
    );
    return;
  }

  const root = projectRoot();
  const id = extractId(args, "Usage: domus task update <id> [options]");
  const { tasks, task } = await findTask(root, id);

  const update = extractMetadataFlags(args);
  if (!update) {
    console.error("Nothing to update. Provide at least one flag.");
    process.exit(1);
  }

  await applyMetadataUpdate(root, tasks, task, update);
  console.log(`Task ${id} updated.`);
}
