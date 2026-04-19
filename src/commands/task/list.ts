import { hasFlag, parseFlag } from "../../lib/args.ts";
import { projectRoot, readDomusConfigSync } from "../../lib/jsonl.ts";
import {
  parseCumulativeTagFlag,
  taskPassesTagFilter,
} from "../../lib/task-filters.ts";
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
  const includeWontFix = hasFlag(args, "--wont-fix");

  // Tag filtering
  const includeTags = parseCumulativeTagFlag(args, "--tag");
  const excludeTags = parseCumulativeTagFlag(args, "--exclude-tag");
  const config = readDomusConfigSync(root);
  const defaultHiddenTags = config?.defaultHiddenTags ?? [];

  const filtered = filterStatus
    ? tasks.filter((t) => t.status === filterStatus)
    : tasks.filter(
        (t) =>
          t.status !== "done" && (includeWontFix || t.status !== "wont-fix"),
      );

  const tagFiltered = filtered.filter((t) =>
    taskPassesTagFilter(t, { includeTags, excludeTags, defaultHiddenTags }),
  );

  if (hasFlag(args, "--json")) {
    console.log(JSON.stringify(tagFiltered, null, 2));
    return;
  }

  for (const t of tagFiltered) {
    const icon = STATUS_ICON[t.status] ?? "?";
    const autoFlag = t.autonomous ? " ⚙" : "";
    console.log(`${icon} [${t.priority}] ${t.id}${autoFlag}`);
  }
}
