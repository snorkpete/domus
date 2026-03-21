import { hasFlag, parseFlag } from "../../lib/args.ts";
import { projectRoot } from "../../lib/jsonl.ts";
import { doneIds, isBlocked, readTasks } from "../../lib/task-store.ts";
import type { TaskEntry, TaskStatus } from "../../lib/task-types.ts";
import {
  ansi,
  formatBlockedTree,
  formatRow,
  sectionHeader,
} from "./display.ts";

export async function cmdOverview(args: string[]): Promise<void> {
  const includeDone = hasFlag(args, "--include-done");
  const interval = parseFlag(args, "--interval");

  const root = projectRoot();
  const tasks = await readTasks(root);

  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  const done = doneIds(tasks);

  // Group by status, then separate blocked
  const readyTasks: TaskEntry[] = [];
  const inProgressTasks: TaskEntry[] = [];
  const proposedTasks: TaskEntry[] = [];
  const rawTasks: TaskEntry[] = [];
  const blockedTasks: TaskEntry[] = [];
  const doneTasks: TaskEntry[] = [];

  for (const t of tasks) {
    if (t.status === "cancelled" || t.status === "deferred") {
      continue;
    }
    if (t.status === "done") {
      if (includeDone) {
        doneTasks.push(t);
      }
      continue;
    }

    if (isBlocked(t, done)) {
      blockedTasks.push(t);
      continue;
    }

    switch (t.status) {
      case "ready":
        readyTasks.push(t);
        break;
      case "in-progress":
      case "ready-for-senior-review":
        inProgressTasks.push(t);
        break;
      case "proposed":
        proposedTasks.push(t);
        break;
      case "raw":
        rawTasks.push(t);
        break;
    }
  }

  const hasAny =
    readyTasks.length > 0 ||
    inProgressTasks.length > 0 ||
    proposedTasks.length > 0 ||
    rawTasks.length > 0 ||
    blockedTasks.length > 0 ||
    doneTasks.length > 0;

  if (interval) {
    console.log(ansi("2", `↻ ${interval}s`));
  }

  if (!hasAny) {
    console.log("No tasks to display.");
    return;
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Order: Ready → In Progress → Proposed → Raw → Blocked → Done
  const sections: [string, TaskEntry[]][] = [
    ["Ready", readyTasks],
    ["In Progress", inProgressTasks],
    ["Proposed", proposedTasks],
    ["Raw", rawTasks],
    ["Blocked", blockedTasks],
    ["Done", doneTasks],
  ];

  let firstSection = true;
  for (const [label, items] of sections) {
    if (items.length === 0) {
      continue;
    }
    if (!firstSection) {
      console.log();
    }
    firstSection = false;

    console.log(sectionHeader(label));
    if (label === "Blocked") {
      for (const t of items) {
        for (const line of formatBlockedTree(t, done, taskMap)) {
          console.log(line);
        }
      }
    } else {
      for (const t of items) {
        console.log(formatRow(t));
      }
    }
  }
}
