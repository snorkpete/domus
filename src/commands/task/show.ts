import { projectRoot } from "../../lib/jsonl.ts";
import { extractId, findTask, showHelp } from "./helpers.ts";

export async function cmdShow(args: string[]): Promise<void> {
  if (showHelp(args)) {
    console.log("Usage: domus task show <id>");
    return;
  }

  const root = projectRoot();
  const id = extractId(args, "Usage: domus task show <id>");
  const { task } = await findTask(root, id);

  const depsStr =
    task.depends_on.length > 0 ? task.depends_on.join(", ") : "none";
  const tagsStr = task.tags.length > 0 ? task.tags.join(", ") : "none";

  console.log(`# ${task.title}`);
  console.log();
  console.log(`ID:          ${task.id}`);
  console.log(`Status:      ${task.status}`);
  console.log(`Autonomous:  ${task.autonomous}`);
  console.log(`Priority:    ${task.priority}`);
  console.log(`Captured:    ${task.date_captured}`);
  console.log(`Parent:      ${task.parent_id ?? "none"}`);
  console.log(`Depends on:  ${depsStr}`);
  console.log(`Idea:        ${task.idea_id ?? "none"}`);
  console.log(`Tags:        ${tagsStr}`);
  console.log(`Summary:     ${task.summary || "(none)"}`);
  if (task.outcome_note) {
    console.log(`Outcome:     ${task.outcome_note}`);
  }
}
