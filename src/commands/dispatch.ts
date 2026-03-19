import { projectRoot } from "../lib/jsonl.ts";
import { readTasks } from "../lib/task-store.ts";
import { runTask } from "./task.ts";

// Statuses that can be dispatched
const DISPATCHABLE_STATUSES = new Set(["open", "in-progress"]);

export async function runDispatch(args: string[]): Promise<void> {
  const taskId = args[0];
  if (!taskId || taskId.startsWith("-")) {
    console.error("Usage: domus dispatch <task-id>");
    process.exit(1);
  }

  const root = projectRoot();
  const tasks = await readTasks(root);
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    console.error(`Task not found: ${taskId}`);
    process.exit(1);
  }

  // Must be dispatchable: open/in-progress, and autonomous refinement
  if (!DISPATCHABLE_STATUSES.has(task.status)) {
    console.error(
      `Task ${taskId} is not dispatchable (status: ${task.status}). Must be open or in-progress.`,
    );
    process.exit(1);
  }

  if (task.refinement !== "autonomous") {
    console.error(
      `Task ${taskId} is not autonomous (refinement: ${task.refinement}). Only autonomous tasks can be dispatched.`,
    );
    process.exit(1);
  }

  if (task.status === "open") {
    // Derive branch name from task id
    const branch = `task/${taskId}`;
    console.log(`Starting task ${taskId} on branch ${branch}...`);
    await runTask(["start", taskId, "--branch", branch]);
  } else {
    // Already in-progress — resume case, skip start
    console.log(`Task ${taskId} is already in-progress, resuming...`);
    console.log(`  Branch: ${task.branch ?? "(none recorded)"}`);
  }

  console.log();
  console.log(`Task ${taskId} is ready for dispatch.`);
  console.log(`Hand off to Claude with the worker persona and the task execution log.`);
}
