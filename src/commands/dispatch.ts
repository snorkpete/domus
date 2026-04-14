import { projectRoot } from "../lib/jsonl.ts";
import { readTasks } from "../lib/task-store.ts";
import { runTask } from "./task/index.ts";

const USAGE = `
domus dispatch — dispatch a worker for a task

Usage:
  domus dispatch <task-id> [--help]

Starts a task: transitions it to in-progress, creates its execution log,
and records the worker branch. The task must be ready and autonomous.

Options:
  --help, -h    Print this help
`.trim();

export async function runDispatch(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return;
  }

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

  if (task.status !== "ready") {
    console.error(
      `Task ${taskId} is not dispatchable (status: ${task.status}). Must be ready.`,
    );
    process.exit(1);
  }

  if (!task.autonomous) {
    console.error(
      `Task ${taskId} is not autonomous. Only autonomous tasks can be dispatched.`,
    );
    process.exit(1);
  }

  const branch = `task/${taskId}`;
  console.log(`Starting task ${taskId} on branch ${branch}...`);
  await runTask(["start", taskId, "--branch", branch]);

  console.log();
  console.log(`Task ${taskId} is ready for dispatch.`);
  console.log(
    "Hand off to Claude with the worker role and the task execution log.",
  );
}
