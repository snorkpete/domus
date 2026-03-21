import { projectRoot } from "../../lib/jsonl.ts";
import {
  doneIds,
  isBlocked,
  isReady,
  readTasks,
} from "../../lib/task-store.ts";
import type { TaskEntry } from "../../lib/task-types.ts";

export async function cmdReady(_args: string[]): Promise<void> {
  const root = projectRoot();
  const tasks = await readTasks(root);

  if (tasks.length === 0) {
    console.log("No tasks found.");
    return;
  }

  const done = doneIds(tasks);
  const inProgress = tasks.filter((t) => t.status === "in-progress");
  const ready = tasks.filter((t) => t.status === "ready" && isReady(t, done));
  const proposed = tasks.filter(
    (t) => t.status === "proposed" && isReady(t, done),
  );
  const raw = tasks.filter((t) => t.status === "raw" && isReady(t, done));
  const blocked = tasks.filter((t) => isBlocked(t, done));

  const fmt = (t: TaskEntry) =>
    `  [${t.priority}] ${t.id} — ${t.title}${t.summary ? `\n      ${t.summary}` : ""}`;

  if (inProgress.length > 0) {
    console.log("## In Progress\n");
    for (const t of inProgress) {
      console.log(fmt(t));
    }
    console.log();
  }

  if (ready.length > 0) {
    console.log("## Ready\n");
    for (const t of ready) {
      console.log(fmt(t));
    }
    console.log();
  }

  if (proposed.length > 0) {
    console.log("## Proposed (needs human review)\n");
    for (const t of proposed) {
      console.log(fmt(t));
    }
    console.log();
  }

  if (raw.length > 0) {
    console.log("## Raw (needs refinement)\n");
    for (const t of raw) {
      console.log(fmt(t));
    }
    console.log();
  }

  if (blocked.length > 0) {
    console.log("## Blocked\n");
    for (const t of blocked) {
      const waiting = t.depends_on.filter((dep) => !done.has(dep));
      console.log(`  ${t.id} — ${t.title} (waiting on: ${waiting.join(", ")})`);
    }
    console.log();
  }

  if (
    inProgress.length === 0 &&
    ready.length === 0 &&
    proposed.length === 0 &&
    raw.length === 0 &&
    blocked.length === 0
  ) {
    console.log("No active tasks.");
  }
}
