import { hasFlag, parseFlag } from "../../lib/args.ts";
import { projectRoot } from "../../lib/jsonl.ts";
import { doneIds, isBlocked, readTasks } from "../../lib/task-store.ts";
import type { TaskEntry, TaskPriority } from "../../lib/task-types.ts";
import {
  ansi,
  formatBlockedTree,
  formatRow,
  sectionHeader,
} from "./display.ts";

export async function cmdOverview(args: string[]): Promise<void> {
  const includeDone = hasFlag(args, "--include-done");
  const includeDeferred = hasFlag(args, "--include-deferred");
  const includeCancelled = hasFlag(args, "--include-cancelled");
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
  const deferredTasks: TaskEntry[] = [];
  const cancelledTasks: TaskEntry[] = [];

  for (const t of tasks) {
    if (t.status === "deferred") {
      if (includeDeferred) {
        deferredTasks.push(t);
      }
      continue;
    }
    if (t.status === "cancelled") {
      if (includeCancelled) {
        cancelledTasks.push(t);
      }
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
    doneTasks.length > 0 ||
    deferredTasks.length > 0 ||
    cancelledTasks.length > 0;

  if (interval) {
    console.log(ansi("2", `↻ ${interval}s`));
  }

  if (!hasAny) {
    console.log("No tasks to display.");
    return;
  }

  const priorityRank: Record<TaskPriority, number> = {
    high: 0,
    normal: 1,
    low: 2,
  };
  const byPriority = (a: TaskEntry, b: TaskEntry) =>
    priorityRank[a.priority] - priorityRank[b.priority];

  for (const group of [
    readyTasks,
    inProgressTasks,
    proposedTasks,
    rawTasks,
    blockedTasks,
    doneTasks,
    deferredTasks,
    cancelledTasks,
  ]) {
    group.sort(byPriority);
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Order: Ready → In Progress → Proposed → Raw → Blocked → Done → Deferred → Cancelled
  const sections: [string, TaskEntry[]][] = [
    ["Ready", readyTasks],
    ["In Progress", inProgressTasks],
    ["Proposed", proposedTasks],
    ["Raw", rawTasks],
    ["Blocked", blockedTasks],
    ["Done", doneTasks],
    ["Deferred", deferredTasks],
    ["Cancelled", cancelledTasks],
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
