import { join } from "node:path";
import { DOMUS_DIR, readJsonl, writeJsonl, projectRoot } from "./jsonl.ts";
import {
  type TaskEntry,
  type TaskStatus,
  type TaskRefinement,
  type TaskPriority,
  VALID_STATUSES,
  VALID_REFINEMENTS,
  VALID_PRIORITIES,
} from "./task-types.ts";

export type { TaskEntry, TaskStatus, TaskRefinement, TaskPriority };
export { VALID_STATUSES, VALID_REFINEMENTS, VALID_PRIORITIES };

// ── Path helpers ──────────────────────────────────────────────────────────────

export function tasksJsonlPath(root: string): string {
  return join(root, DOMUS_DIR, "tasks", "tasks.jsonl");
}

export function tasksDir(root: string): string {
  return join(root, DOMUS_DIR, "tasks");
}

// ── Store helpers ─────────────────────────────────────────────────────────────

export async function readTasks(root: string): Promise<TaskEntry[]> {
  const tasks = await readJsonl<TaskEntry>(tasksJsonlPath(root));
  // Normalize records written before the notes field was added
  return tasks.map((t) => ({ notes: [], ...t }));
}

export async function writeTasks(root: string, tasks: TaskEntry[]): Promise<void> {
  return writeJsonl(tasksJsonlPath(root), tasksDir(root), tasks);
}

// ── Computed queries ──────────────────────────────────────────────────────────

export function doneIds(tasks: TaskEntry[]): Set<string> {
  return new Set(tasks.filter((t) => t.status === "done").map((t) => t.id));
}

export function isReady(task: TaskEntry, done: Set<string>): boolean {
  if (task.status !== "open" && task.status !== "in-progress") return false;
  return task.depends_on.every((dep) => done.has(dep));
}

export function isBlocked(task: TaskEntry, done: Set<string>): boolean {
  if (task.status !== "open" && task.status !== "in-progress") return false;
  return task.depends_on.some((dep) => !done.has(dep));
}
